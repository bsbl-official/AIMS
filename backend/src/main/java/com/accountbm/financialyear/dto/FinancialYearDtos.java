package com.accountbm.financialyear.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public final class FinancialYearDtos {
    private FinancialYearDtos() {}

    public record SaveFinancialYearRequest(@NotNull @Min(1) @Max(12) Integer startMonth) {}

    public record FinancialPeriodResponse(
            UUID companyId,
            int period,
            int month,
            String monthName,
            int quarter,
            String createdBy,
            Instant createdAt,
            String updatedBy,
            Instant updatedAt) {}
}
