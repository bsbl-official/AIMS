package com.accountbm.initialdata.service;

import static com.accountbm.initialdata.dto.InitialDataDtos.*;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InitialDataService {
    private static final DateTimeFormatter STORAGE_MONTH = DateTimeFormatter.ofPattern("MM/yyyy");
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public InitialDataService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<AccountHeadResponse> accountHeads(UUID companyId, UUID actor) {
        access.requireCompanyPermission(actor, companyId, "initial_data.read", "initial_data.manage");
        return jdbc.query("""
                SELECT head.coa_id, head.l1_code, head.l2_code, head.l3_code, head.l4_code, head.l5_code, head.acchead
                FROM a_acc_head head
                JOIN organizations company ON company.code = head.company_code
                WHERE company.id = ?
                ORDER BY head.coa_id, head.l1_code, head.l2_code, head.l3_code, head.l4_code, head.l5_code
                """, (rs, rowNum) -> new AccountHeadResponse(rs.getLong("coa_id"), rs.getString("l1_code"),
                rs.getString("l2_code"), rs.getString("l3_code"), rs.getString("l4_code"),
                rs.getString("l5_code"), rs.getString("acchead")), companyId);
    }

    @Transactional(readOnly = true)
    public List<InitialDataSummaryResponse> entries(UUID companyId, UUID actor) {
        access.requireCompanyPermission(actor, companyId, "initial_data.read", "initial_data.manage");
        var allowedBranches=access.allowedBranchIds(actor,companyId);
        return jdbc.query("""
                SELECT balance.entry_id, balance.branch_id, branch.code branch_code, branch.name branch_name,
                       balance.project_code_id, project.name project_name,
                       balance.finance_code_id, finance.name finance_name,
                       balance.component_code_id, component.name component_name,
                       balance.mnyr, balance.financial_year_mnyr, count(*) line_count,
                       sum(balance.cum_bal_dr) debit_total, sum(balance.cum_bal_cr) credit_total,
                       sum(balance.cum_bal_dr - balance.cum_bal_cr) balance_total,
                       max(coalesce(balance.upd_date, balance.ins_date)) updated_at
                FROM a_monthly_bal balance
                JOIN branches branch ON branch.id = balance.branch_id AND branch.organization_id = balance.organization_id
                JOIN project_codes project ON project.id = balance.project_code_id AND project.organization_id = balance.organization_id
                JOIN finance_codes finance ON finance.id = balance.finance_code_id AND finance.organization_id = balance.organization_id
                JOIN component_codes component ON component.id = balance.component_code_id AND component.organization_id = balance.organization_id
                WHERE balance.organization_id = ?
                GROUP BY balance.entry_id, balance.branch_id, branch.code, branch.name,
                         balance.project_code_id, project.name, balance.finance_code_id, finance.name,
                         balance.component_code_id, component.name, balance.mnyr, balance.financial_year_mnyr
                ORDER BY max(coalesce(balance.upd_date, balance.ins_date)) DESC
                """, (rs, rowNum) -> summary(rs), companyId)
                .stream().filter(item->allowedBranches.contains(item.branchId())).toList();
    }

    @Transactional(readOnly = true)
    public InitialDataResponse entry(UUID companyId, UUID entryId, UUID actor) {
        access.requireCompanyPermission(actor, companyId, "initial_data.read", "initial_data.manage");
        var result=findEntry(companyId, entryId);
        access.requireBranchPermission(actor,companyId,result.branchId(),"initial_data.read","initial_data.manage");
        return result;
    }

    @Transactional
    public InitialDataResponse save(UUID companyId, SaveInitialDataRequest request, UUID actor) {
        access.requireBranchPermission(actor, companyId, request.branchId(), "initial_data.manage");
        var context = requireContext(companyId, request);
        var selectedMonth = YearMonth.parse(request.monthYear());
        int startMonth = financialYearStartMonth(companyId);
        int startYear = selectedMonth.getMonthValue() >= startMonth ? selectedMonth.getYear() : selectedMonth.getYear() - 1;
        String mnyr = selectedMonth.format(STORAGE_MONTH);
        String financialYear = YearMonth.of(startYear, startMonth).format(STORAGE_MONTH);
        requireUniqueHeads(request.lines());

        var existing = jdbc.queryForList("""
                SELECT entry_id FROM a_monthly_bal
                WHERE organization_id = ? AND branch_id = ? AND project_code_id = ?
                  AND finance_code_id = ? AND component_code_id = ? AND mnyr = ?
                LIMIT 1
                """, UUID.class, companyId, request.branchId(), request.projectCodeId(),
                request.financeCodeId(), request.componentCodeId(), mnyr);
        UUID entryId = existing.isEmpty() ? UUID.randomUUID() : existing.getFirst();
        boolean updating = !existing.isEmpty();
        if (updating) jdbc.update("DELETE FROM a_monthly_bal WHERE organization_id = ? AND entry_id = ?", companyId, entryId);

        for (var line : request.lines()) {
            int inserted = jdbc.update("""
                    INSERT INTO a_monthly_bal (
                        entry_id, organization_id, branch_id, project_code_id, finance_code_id, component_code_id,
                        company_code, company_branch_code, finance_code, project_code, component_code,
                        mnyr, financial_year_mnyr, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code,
                        bal_dr, bal_cr, cum_bal_dr, cum_bal_cr, ins_user, upd_user, upd_date
                    )
                    SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                           head.coa_id, head.l1_code, head.l2_code, head.l3_code, head.l4_code, head.l5_code,
                           ?, ?, ?, ?, ?, ?, CASE WHEN ? THEN clock_timestamp() ELSE NULL END
                    FROM a_acc_head head
                    WHERE head.company_code = ? AND head.coa_id = ? AND head.l1_code = ? AND head.l2_code = ?
                      AND head.l3_code = ? AND head.l4_code = ? AND head.l5_code = ?
                    """, entryId, companyId, request.branchId(), request.projectCodeId(), request.financeCodeId(),
                    request.componentCodeId(), context.companyCode(), context.branchCode(),
                    String.valueOf(request.financeCodeId()), String.valueOf(request.projectCodeId()),
                    String.valueOf(request.componentCodeId()), mnyr, financialYear,
                    line.debit(), line.credit(), line.debit(), line.credit(), actor.toString(),
                    updating ? actor.toString() : null, updating, context.companyCode(), line.coaId(),
                    clean(line.l1Code()), clean(line.l2Code()), clean(line.l3Code()), clean(line.l4Code()), clean(line.l5Code()));
            if (inserted == 0) throw bad("An account head does not exist for this company");
        }
        jdbc.update("""
                INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
                VALUES (?, ?, ?, 'INITIAL_DATA', ?)
                """, companyId, actor, updating ? "INITIAL_DATA_UPDATED" : "INITIAL_DATA_CREATED", entryId.toString());
        return findEntry(companyId, entryId);
    }

    private InitialDataResponse findEntry(UUID companyId, UUID entryId) {
        var headers = jdbc.query("""
                SELECT balance.entry_id, balance.organization_id, balance.branch_id,
                       branch.code branch_code, branch.name branch_name,
                       balance.project_code_id, project.name project_name,
                       balance.finance_code_id, finance.name finance_name,
                       balance.component_code_id, component.name component_name,
                       balance.mnyr, balance.financial_year_mnyr,
                       min(balance.ins_date) created_at, max(coalesce(balance.upd_date, balance.ins_date)) updated_at
                FROM a_monthly_bal balance
                JOIN branches branch ON branch.id = balance.branch_id AND branch.organization_id = balance.organization_id
                JOIN project_codes project ON project.id = balance.project_code_id AND project.organization_id = balance.organization_id
                JOIN finance_codes finance ON finance.id = balance.finance_code_id AND finance.organization_id = balance.organization_id
                JOIN component_codes component ON component.id = balance.component_code_id AND component.organization_id = balance.organization_id
                WHERE balance.organization_id = ? AND balance.entry_id = ?
                GROUP BY balance.entry_id, balance.organization_id, balance.branch_id, branch.code, branch.name,
                         balance.project_code_id, project.name, balance.finance_code_id, finance.name,
                         balance.component_code_id, component.name, balance.mnyr, balance.financial_year_mnyr
                """, (rs, rowNum) -> new EntryHeader(rs.getObject("entry_id", UUID.class),
                rs.getObject("organization_id", UUID.class), rs.getObject("branch_id", UUID.class),
                rs.getString("branch_code"), rs.getString("branch_name"), rs.getInt("project_code_id"),
                rs.getString("project_name"), rs.getInt("finance_code_id"), rs.getString("finance_name"),
                rs.getInt("component_code_id"), rs.getString("component_name"), displayMonth(rs.getString("mnyr")),
                displayMonth(rs.getString("financial_year_mnyr")), instant(rs.getTimestamp("created_at")),
                instant(rs.getTimestamp("updated_at"))), companyId, entryId);
        if (headers.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Initial data entry was not found");
        var lines = jdbc.query("""
                SELECT balance.coa_id, balance.l1_code, balance.l2_code, balance.l3_code, balance.l4_code,
                       balance.l5_code, head.acchead, balance.cum_bal_dr, balance.cum_bal_cr
                FROM a_monthly_bal balance
                JOIN a_acc_head head ON head.company_code = balance.company_code AND head.coa_id = balance.coa_id
                  AND head.l1_code = balance.l1_code AND head.l2_code = balance.l2_code
                  AND head.l3_code = balance.l3_code AND head.l4_code = balance.l4_code AND head.l5_code = balance.l5_code
                WHERE balance.organization_id = ? AND balance.entry_id = ?
                ORDER BY balance.coa_id, balance.l1_code, balance.l2_code, balance.l3_code, balance.l4_code, balance.l5_code
                """, (rs, rowNum) -> new InitialBalanceLineResponse(rs.getLong("coa_id"), rs.getString("l1_code"),
                rs.getString("l2_code"), rs.getString("l3_code"), rs.getString("l4_code"), rs.getString("l5_code"),
                rs.getString("acchead"), rs.getBigDecimal("cum_bal_dr"), rs.getBigDecimal("cum_bal_cr"),
                rs.getBigDecimal("cum_bal_dr").subtract(rs.getBigDecimal("cum_bal_cr"))), companyId, entryId);
        var h = headers.getFirst();
        return new InitialDataResponse(h.entryId(), h.companyId(), h.branchId(), h.branchCode(), h.branchName(),
                h.projectCodeId(), h.projectName(), h.financeCodeId(), h.financeName(), h.componentCodeId(),
                h.componentName(), h.monthYear(), h.financialYearStart(), lines, h.createdAt(), h.updatedAt());
    }

    private Context requireContext(UUID companyId, SaveInitialDataRequest request) {
        var rows = jdbc.query("""
                SELECT company.code company_code, branch.code branch_code
                FROM organizations company
                JOIN branches branch ON branch.organization_id = company.id AND branch.id = ? AND branch.status = 'ACTIVE'
                JOIN project_codes project ON project.organization_id = company.id AND project.id = ? AND project.status = 'ACTIVE'
                JOIN finance_codes finance ON finance.organization_id = company.id AND finance.project_code_id = project.id
                    AND finance.id = ? AND finance.status = 'ACTIVE'
                JOIN component_codes component ON component.organization_id = company.id AND component.project_code_id = project.id
                    AND component.finance_code_id = finance.id AND component.id = ? AND component.status = 'ACTIVE'
                WHERE company.id = ? AND company.status = 'ACTIVE'
                """, (rs, rowNum) -> new Context(rs.getString("company_code"), rs.getString("branch_code")),
                request.branchId(), request.projectCodeId(), request.financeCodeId(), request.componentCodeId(), companyId);
        if (rows.isEmpty()) throw bad("Select an active branch, project, finance code, and component code from the same company hierarchy");
        return rows.getFirst();
    }

    private int financialYearStartMonth(UUID companyId) {
        var months = jdbc.queryForList("SELECT month FROM a_period WHERE organization_id = ? AND period = 1", Integer.class, companyId);
        if (months.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Configure the company financial year before entering initial data");
        return months.getFirst();
    }

    private static void requireUniqueHeads(List<InitialBalanceLineRequest> lines) {
        var keys = new HashSet<String>();
        for (var line : lines) {
            String key = line.coaId() + "/" + clean(line.l1Code()) + "/" + clean(line.l2Code()) + "/"
                    + clean(line.l3Code()) + "/" + clean(line.l4Code()) + "/" + clean(line.l5Code());
            if (!keys.add(key)) throw bad("Each account head can only be added once");
        }
    }

    private static InitialDataSummaryResponse summary(ResultSet rs) throws SQLException {
        return new InitialDataSummaryResponse(rs.getObject("entry_id", UUID.class), rs.getObject("branch_id", UUID.class),
                rs.getString("branch_code"), rs.getString("branch_name"), rs.getInt("project_code_id"),
                rs.getString("project_name"), rs.getInt("finance_code_id"), rs.getString("finance_name"),
                rs.getInt("component_code_id"), rs.getString("component_name"), displayMonth(rs.getString("mnyr")),
                displayMonth(rs.getString("financial_year_mnyr")), rs.getInt("line_count"),
                rs.getBigDecimal("debit_total"), rs.getBigDecimal("credit_total"), rs.getBigDecimal("balance_total"),
                instant(rs.getTimestamp("updated_at")));
    }

    private static String displayMonth(String stored) {
        return YearMonth.parse(stored, STORAGE_MONTH).toString();
    }
    private static String clean(String value) { return value.strip(); }
    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private record Context(String companyCode, String branchCode) {}
    private record EntryHeader(UUID entryId, UUID companyId, UUID branchId, String branchCode, String branchName,
            Integer projectCodeId, String projectName, Integer financeCodeId, String financeName,
            Integer componentCodeId, String componentName, String monthYear, String financialYearStart,
            Instant createdAt, Instant updatedAt) {}
}
