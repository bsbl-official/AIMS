package com.accountbm.initialdata.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class InitialDataDtos {
    private InitialDataDtos() {}

    public record AccountHeadResponse(
            Long coaId, String l1Code, String l2Code, String l3Code, String l4Code, String l5Code,
            String accountHead) {}

    public record InitialBalanceLineRequest(
            @NotNull @Positive Long coaId,
            @NotNull @Size(max = 6) String l1Code,
            @NotNull @Size(max = 6) String l2Code,
            @NotNull @Size(max = 10) String l3Code,
            @NotNull @Size(max = 10) String l4Code,
            @NotNull @Size(max = 10) String l5Code,
            @NotNull @PositiveOrZero @Digits(integer = 13, fraction = 2) BigDecimal debit,
            @NotNull @PositiveOrZero @Digits(integer = 13, fraction = 2) BigDecimal credit) {}

    public record SaveInitialDataRequest(
            @NotNull UUID branchId,
            @NotNull @Positive Integer projectCodeId,
            @NotNull @Positive Integer financeCodeId,
            @NotNull @Positive Integer componentCodeId,
            @NotNull @Pattern(regexp = "\\d{4}-(0[1-9]|1[0-2])", message = "must use YYYY-MM") String monthYear,
            @NotEmpty List<@Valid InitialBalanceLineRequest> lines) {}

    public record InitialBalanceLineResponse(
            Long coaId, String l1Code, String l2Code, String l3Code, String l4Code, String l5Code,
            String accountHead, BigDecimal debit, BigDecimal credit, BigDecimal balance) {}

    public record InitialDataSummaryResponse(
            UUID entryId, UUID branchId, String branchCode, String branchName,
            Integer projectCodeId, String projectName, Integer financeCodeId, String financeName,
            Integer componentCodeId, String componentName, String monthYear, String financialYearStart,
            int lineCount, BigDecimal debitTotal, BigDecimal creditTotal, BigDecimal balanceTotal,
            Instant updatedAt) {}

    public record InitialDataResponse(
            UUID entryId, UUID companyId, UUID branchId, String branchCode, String branchName,
            Integer projectCodeId, String projectName, Integer financeCodeId, String financeName,
            Integer componentCodeId, String componentName, String monthYear, String financialYearStart,
            List<InitialBalanceLineResponse> lines, Instant createdAt, Instant updatedAt) {}
}
