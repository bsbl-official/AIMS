package com.accountbm.financecode.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class FinanceCodeDtos {
    private FinanceCodeDtos() {}

    public record CreateFinanceCodeRequest(
            @NotNull @Positive Integer projectCodeId,
            @NotNull @Positive Integer code,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 500) String description) {}

    public record UpdateFinanceCodeRequest(
            @NotNull @Positive Integer projectCodeId,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 500) String description,
            @NotBlank String status,
            @NotNull @PositiveOrZero Long version) {}

    public record FinanceCodeResponse(
            Integer id, UUID companyId, Integer projectCodeId, Integer projectCode, String projectName,
            Integer code, String name, String description, String status,
            Instant createdAt, Instant updatedAt, long version) {}
}
