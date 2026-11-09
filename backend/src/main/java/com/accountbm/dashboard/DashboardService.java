package com.accountbm.dashboard;

import static com.accountbm.dashboard.DashboardReport.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DashboardService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public DashboardService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public DashboardReport report(UUID companyId, UUID branchId, LocalDate requestedFrom,
            LocalDate requestedTo, UUID actorId) {
        access.requireBranchPermission(actorId, companyId, branchId, "journal.read");
        var context = context(companyId, branchId);
        var dates = dates(requestedFrom, requestedTo, context.timezone());
        var voucherMetrics = voucherMetrics(companyId, branchId, dates);
        var postedMetric = postedMetric(companyId, branchId, dates);
        var position = financialPosition(companyId, branchId, dates.from(), dates.to());
        var previousNetProfit = netProfit(companyId, branchId, dates.comparisonFrom(), dates.comparisonTo());
        var workflow = workflow(companyId, branchId, dates.from(), dates.to(), voucherMetrics.currentCount());

        var scope = new Scope(companyId, context.companyName(), branchId, context.branchName(),
                context.currencyCode(), dates.from(), dates.to(), dates.comparisonFrom(), dates.comparisonTo());
        var kpis = new Kpis(
                metric(voucherMetrics.currentValue(), voucherMetrics.previousValue()),
                metric(BigDecimal.valueOf(voucherMetrics.currentCount()), BigDecimal.valueOf(voucherMetrics.previousCount())),
                metric(postedMetric.current(), postedMetric.previous()),
                metric(position.netProfit(), previousNetProfit));
        return new DashboardReport(scope, kpis, trend(companyId, branchId, dates.from(), dates.to()),
                mix(companyId, branchId, dates.from(), dates.to()), position, workflow,
                transactionLineCount(companyId, branchId, dates.from(), dates.to()),
                recent(companyId, branchId, dates.from(), dates.to()));
    }

    private Context context(UUID companyId, UUID branchId) {
        var rows = jdbc.query("""
                SELECT organization.legal_name, organization.base_currency_code, organization.timezone,
                       branch.name AS branch_name
                FROM organizations organization
                JOIN branches branch ON branch.organization_id=organization.id
                WHERE organization.id=? AND branch.id=? AND branch.status='ACTIVE'
                """, (rs, rowNum) -> new Context(rs.getString("legal_name"), rs.getString("branch_name"),
                rs.getString("base_currency_code"), rs.getString("timezone")), companyId, branchId);
        if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Company branch was not found");
        return rows.getFirst();
    }

    static DateRange dates(LocalDate requestedFrom, LocalDate requestedTo, String timezone) {
        if ((requestedFrom == null) != (requestedTo == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "From and to dates must be provided together");
        }
        var today = LocalDate.now(ZoneId.of(timezone));
        var from = requestedFrom == null ? today.withDayOfMonth(1) : requestedFrom;
        var to = requestedTo == null ? today : requestedTo;
        if (from.isAfter(to)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "From date must not be after to date");
        var days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days > 366) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Dashboard range cannot exceed 366 days");
        var comparisonTo = from.minusDays(1);
        return new DateRange(from, to, comparisonTo.minusDays(days - 1), comparisonTo);
    }

    private VoucherMetrics voucherMetrics(UUID companyId, UUID branchId, DateRange dates) {
        return jdbc.queryForObject("""
                WITH vouchers AS (
                    SELECT voucher_date, total_debit amount FROM a_dr WHERE organization_id=? AND branch_id=?
                    UNION ALL SELECT voucher_date, total_debit FROM a_cr WHERE organization_id=? AND branch_id=?
                    UNION ALL SELECT voucher_date, total_debit FROM a_jv WHERE organization_id=? AND branch_id=?
                )
                SELECT count(*) FILTER (WHERE voucher_date BETWEEN ? AND ?) current_count,
                       coalesce(sum(amount) FILTER (WHERE voucher_date BETWEEN ? AND ?),0) current_value,
                       count(*) FILTER (WHERE voucher_date BETWEEN ? AND ?) previous_count,
                       coalesce(sum(amount) FILTER (WHERE voucher_date BETWEEN ? AND ?),0) previous_value
                FROM vouchers
                """, (rs, rowNum) -> new VoucherMetrics(rs.getLong("current_count"),
                rs.getBigDecimal("current_value"), rs.getLong("previous_count"), rs.getBigDecimal("previous_value")),
                companyId, branchId, companyId, branchId, companyId, branchId,
                dates.from(), dates.to(), dates.from(), dates.to(),
                dates.comparisonFrom(), dates.comparisonTo(), dates.comparisonFrom(), dates.comparisonTo());
    }

    private AmountPair postedMetric(UUID companyId, UUID branchId, DateRange dates) {
        return jdbc.queryForObject("""
                WITH scoped AS (
                    SELECT posting_date, total_debit
                    FROM journals
                    WHERE organization_id=? AND branch_id=? AND status='POSTED'
                      AND posting_date BETWEEN ? AND ?
                )
                SELECT coalesce(sum(total_debit) FILTER (WHERE posting_date BETWEEN ? AND ?),0) current_value,
                       coalesce(sum(total_debit) FILTER (WHERE posting_date BETWEEN ? AND ?),0) previous_value
                FROM scoped
                """, (rs, rowNum) -> new AmountPair(rs.getBigDecimal("current_value"), rs.getBigDecimal("previous_value")),
                companyId, branchId, dates.comparisonFrom(), dates.to(), dates.from(), dates.to(),
                dates.comparisonFrom(), dates.comparisonTo());
    }

    private FinancialPosition financialPosition(UUID companyId, UUID branchId, LocalDate from, LocalDate to) {
        return jdbc.queryForObject("""
                WITH scoped AS (
                    SELECT journal.posting_date, line.base_debit_amount debit, line.base_credit_amount credit,
                           account_type.category
                    FROM journals journal
                    JOIN journal_lines line ON line.organization_id=journal.organization_id AND line.journal_id=journal.id
                    JOIN accounts account ON account.organization_id=line.organization_id AND account.id=line.account_id
                    JOIN account_types account_type ON account_type.code=account.account_type_code
                    WHERE journal.organization_id=? AND journal.branch_id=? AND journal.status='POSTED'
                      AND journal.posting_date<=?
                )
                SELECT coalesce(sum(debit-credit) FILTER (WHERE category='ASSET'),0) assets,
                       coalesce(sum(credit-debit) FILTER (WHERE category='LIABILITY'),0) liabilities,
                       coalesce(sum(credit-debit) FILTER (WHERE category='INCOME' AND posting_date BETWEEN ? AND ?),0) income,
                       coalesce(sum(debit-credit) FILTER (WHERE category='EXPENSE' AND posting_date BETWEEN ? AND ?),0) expenses,
                       coalesce(sum(debit) FILTER (WHERE posting_date BETWEEN ? AND ?),0) posted_debits,
                       coalesce(sum(credit) FILTER (WHERE posting_date BETWEEN ? AND ?),0) posted_credits
                FROM scoped
                """, (rs, rowNum) -> {
                    var income = rs.getBigDecimal("income");
                    var expenses = rs.getBigDecimal("expenses");
                    var debits = rs.getBigDecimal("posted_debits");
                    var credits = rs.getBigDecimal("posted_credits");
                    return new FinancialPosition(rs.getBigDecimal("assets"), rs.getBigDecimal("liabilities"),
                            income, expenses, income.subtract(expenses), debits, credits, debits.compareTo(credits) == 0);
                }, companyId, branchId, to, from, to, from, to, from, to, from, to);
    }

    private BigDecimal netProfit(UUID companyId, UUID branchId, LocalDate from, LocalDate to) {
        return jdbc.queryForObject("""
                SELECT coalesce(sum(CASE
                    WHEN account_type.category IN ('INCOME','EXPENSE')
                    THEN line.base_credit_amount-line.base_debit_amount ELSE 0 END),0)
                FROM journals journal
                JOIN journal_lines line ON line.organization_id=journal.organization_id AND line.journal_id=journal.id
                JOIN accounts account ON account.organization_id=line.organization_id AND account.id=line.account_id
                JOIN account_types account_type ON account_type.code=account.account_type_code
                WHERE journal.organization_id=? AND journal.branch_id=? AND journal.status='POSTED'
                  AND journal.posting_date BETWEEN ? AND ?
                """, BigDecimal.class, companyId, branchId, from, to);
    }

    private List<VoucherTrendPoint> trend(UUID companyId, UUID branchId, LocalDate from, LocalDate to) {
        return jdbc.query("""
                WITH dates AS (
                    SELECT generate_series(CAST(? AS date), CAST(? AS date), interval '1 day')::date report_date
                ), classes(voucher_class) AS (VALUES ('DEBIT'),('CREDIT'),('JOURNAL')),
                vouchers AS (
                    SELECT voucher_date, 'DEBIT' voucher_class, total_debit amount FROM a_dr WHERE organization_id=? AND branch_id=?
                    UNION ALL SELECT voucher_date, 'CREDIT', total_debit FROM a_cr WHERE organization_id=? AND branch_id=?
                    UNION ALL SELECT voucher_date, 'JOURNAL', total_debit FROM a_jv WHERE organization_id=? AND branch_id=?
                ), daily AS (
                    SELECT dates.report_date, classes.voucher_class, coalesce(sum(vouchers.amount),0) amount,
                           count(vouchers.voucher_date) item_count
                    FROM dates CROSS JOIN classes
                    LEFT JOIN vouchers ON vouchers.voucher_date=dates.report_date AND vouchers.voucher_class=classes.voucher_class
                    GROUP BY dates.report_date, classes.voucher_class
                )
                SELECT report_date,
                       sum(amount) FILTER (WHERE voucher_class='DEBIT') debit,
                       sum(amount) FILTER (WHERE voucher_class='CREDIT') credit,
                       sum(amount) FILTER (WHERE voucher_class='JOURNAL') journal,
                       sum(amount) total, sum(item_count) item_count
                FROM daily GROUP BY report_date ORDER BY report_date
                """, (rs, rowNum) -> new VoucherTrendPoint(rs.getDate("report_date").toLocalDate(),
                rs.getBigDecimal("debit"), rs.getBigDecimal("credit"), rs.getBigDecimal("journal"),
                rs.getBigDecimal("total"), rs.getLong("item_count")),
                from, to, companyId, branchId, companyId, branchId, companyId, branchId);
    }

    private List<VoucherMixItem> mix(UUID companyId, UUID branchId, LocalDate from, LocalDate to) {
        return jdbc.query("""
                WITH vouchers AS (
                    SELECT 'DEBIT' voucher_class, total_debit amount FROM a_dr WHERE organization_id=? AND branch_id=? AND voucher_date BETWEEN ? AND ?
                    UNION ALL SELECT 'CREDIT', total_debit FROM a_cr WHERE organization_id=? AND branch_id=? AND voucher_date BETWEEN ? AND ?
                    UNION ALL SELECT 'JOURNAL', total_debit FROM a_jv WHERE organization_id=? AND branch_id=? AND voucher_date BETWEEN ? AND ?
                ), classes(voucher_class) AS (VALUES ('DEBIT'),('CREDIT'),('JOURNAL'))
                SELECT classes.voucher_class, count(vouchers.amount) item_count, coalesce(sum(vouchers.amount),0) amount
                FROM classes LEFT JOIN vouchers USING (voucher_class)
                GROUP BY classes.voucher_class ORDER BY classes.voucher_class
                """, (rs, rowNum) -> new VoucherMixItem(rs.getString("voucher_class"), rs.getLong("item_count"),
                rs.getBigDecimal("amount")), companyId, branchId, from, to, companyId, branchId, from, to,
                companyId, branchId, from, to);
    }

    private long transactionLineCount(UUID companyId, UUID branchId, LocalDate from, LocalDate to) {
        return jdbc.queryForObject("""
                SELECT coalesce(sum(line_count),0) FROM (
                    SELECT count(*) line_count FROM a_drchild child JOIN a_dr voucher ON voucher.id=child.voucher_id
                      WHERE voucher.organization_id=? AND voucher.branch_id=? AND voucher.voucher_date BETWEEN ? AND ?
                    UNION ALL SELECT count(*) FROM a_crchild child JOIN a_cr voucher ON voucher.id=child.voucher_id
                      WHERE voucher.organization_id=? AND voucher.branch_id=? AND voucher.voucher_date BETWEEN ? AND ?
                    UNION ALL SELECT count(*) FROM a_jvchild child JOIN a_jv voucher ON voucher.id=child.voucher_id
                      WHERE voucher.organization_id=? AND voucher.branch_id=? AND voucher.voucher_date BETWEEN ? AND ?
                ) counts
                """, Long.class, companyId, branchId, from, to, companyId, branchId, from, to,
                companyId, branchId, from, to);
    }

    private Workflow workflow(UUID companyId, UUID branchId, LocalDate from, LocalDate to, long unpostedVouchers) {
        var counts = new LinkedHashMap<String, Long>();
        jdbc.query("""
                SELECT status, count(*) item_count FROM journals
                WHERE organization_id=? AND branch_id=? AND entry_date BETWEEN ? AND ?
                GROUP BY status
                """, (RowCallbackHandler) rs -> counts.put(rs.getString("status"), rs.getLong("item_count")),
                companyId, branchId, from, to);
        return new Workflow(counts.getOrDefault("DRAFT", 0L), counts.getOrDefault("SUBMITTED", 0L),
                counts.getOrDefault("APPROVED", 0L), counts.getOrDefault("POSTED", 0L),
                counts.getOrDefault("REJECTED", 0L), counts.getOrDefault("VOIDED", 0L), unpostedVouchers);
    }

    private List<RecentVoucher> recent(UUID companyId, UUID branchId, LocalDate from, LocalDate to) {
        return jdbc.query("""
                WITH vouchers AS (
                    SELECT id, 'DEBIT' voucher_class, voucher_number, voucher_date, particulars, total_debit amount, status, ins_date
                    FROM a_dr WHERE organization_id=? AND branch_id=?
                    UNION ALL SELECT id, 'CREDIT', voucher_number, voucher_date, particulars, total_debit, status, ins_date
                    FROM a_cr WHERE organization_id=? AND branch_id=?
                    UNION ALL SELECT id, 'JOURNAL', voucher_number, voucher_date, particulars, total_debit, status, ins_date
                    FROM a_jv WHERE organization_id=? AND branch_id=?
                )
                SELECT id, voucher_class, voucher_number, voucher_date, particulars, amount, status
                FROM vouchers WHERE voucher_date BETWEEN ? AND ?
                ORDER BY voucher_date DESC, ins_date DESC LIMIT 6
                """, (rs, rowNum) -> new RecentVoucher(rs.getObject("id", UUID.class), rs.getString("voucher_class"),
                rs.getString("voucher_number"), rs.getDate("voucher_date").toLocalDate(), rs.getString("particulars"),
                rs.getBigDecimal("amount"), rs.getString("status")), companyId, branchId, companyId, branchId,
                companyId, branchId, from, to);
    }

    private static Metric metric(BigDecimal current, BigDecimal previous) {
        return new Metric(current, previous, percentage(current, previous));
    }

    static BigDecimal percentage(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.compareTo(ZERO) == 0) return null;
        return current.subtract(previous).multiply(BigDecimal.valueOf(100))
                .divide(previous.abs(), 2, RoundingMode.HALF_UP);
    }

    private record Context(String companyName, String branchName, String currencyCode, String timezone) {}
    record DateRange(LocalDate from, LocalDate to, LocalDate comparisonFrom, LocalDate comparisonTo) {}
    private record VoucherMetrics(long currentCount, BigDecimal currentValue, long previousCount, BigDecimal previousValue) {}
    private record AmountPair(BigDecimal current, BigDecimal previous) {}
}
