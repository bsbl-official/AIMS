package com.accountbm.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record DashboardReport(
        Scope scope,
        Kpis kpis,
        List<VoucherTrendPoint> voucherTrend,
        List<VoucherMixItem> voucherMix,
        FinancialPosition financialPosition,
        Workflow workflow,
        long transactionLineCount,
        List<RecentVoucher> recentVouchers) {

    public record Scope(UUID companyId, String companyName, UUID branchId, String branchName,
            String currencyCode, LocalDate from, LocalDate to, LocalDate comparisonFrom, LocalDate comparisonTo) {}

    public record Kpis(Metric voucherValue, Metric voucherCount, Metric postedJournalValue, Metric netProfit) {}

    public record Metric(BigDecimal current, BigDecimal previous, BigDecimal changePercent) {}

    public record VoucherTrendPoint(LocalDate date, BigDecimal debit, BigDecimal credit,
            BigDecimal journal, BigDecimal total, long count) {}

    public record VoucherMixItem(String voucherClass, long count, BigDecimal amount) {}

    public record FinancialPosition(BigDecimal assets, BigDecimal liabilities, BigDecimal income,
            BigDecimal expenses, BigDecimal netProfit, BigDecimal postedDebits,
            BigDecimal postedCredits, boolean balanced) {}

    public record Workflow(long draft, long submitted, long approved, long posted,
            long rejected, long voided, long unpostedVouchers) {}

    public record RecentVoucher(UUID id, String voucherClass, String voucherNumber,
            LocalDate voucherDate, String particulars, BigDecimal amount, String status) {}
}
