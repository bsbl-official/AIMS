package com.accountbm.coa.dto;

import java.time.Instant;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class ChartOfAccountDtos {
    private ChartOfAccountDtos() {}

    public record CreateChartOfAccountRequest(
            @NotNull @Positive @Max(99) Long coaId,
            @NotBlank @Size(max = 100) String description,
            @NotBlank @Pattern(regexp = "(?i)Y|N", message = "must be Y or N") String deviceFlag) {}

    public record UpdateChartOfAccountRequest(
            @NotBlank @Size(max = 100) String description,
            @NotBlank @Pattern(regexp = "(?i)Y|N", message = "must be Y or N") String deviceFlag) {}

    public record ChartOfAccountResponse(
            Long coaId,
            String description,
            String insertedBy,
            Instant insertedAt,
            String updatedBy,
            Instant updatedAt,
            String deviceFlag) {}
}
