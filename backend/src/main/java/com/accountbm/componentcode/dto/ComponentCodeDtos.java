package com.accountbm.componentcode.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class ComponentCodeDtos {
    private ComponentCodeDtos() {}

    public record CreateComponentCodeRequest(
            @NotNull @Positive Integer projectCodeId,
            @NotNull @Positive Integer financeCodeId,
            @NotNull @Positive Integer code,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 500) String description) {}

    public record UpdateComponentCodeRequest(
            @NotNull @Positive Integer projectCodeId,
            @NotNull @Positive Integer financeCodeId,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 500) String description,
            @NotBlank String status,
            @NotNull @PositiveOrZero Long version) {}

    public record ComponentCodeResponse(
            Integer id, UUID companyId, Integer projectCodeId, Integer projectCode, String projectName,
            Integer financeCodeId, Integer financeCode, String financeName,
            Integer code, String name, String description, String status,
            Instant createdAt, Instant updatedAt, long version) {}
}
