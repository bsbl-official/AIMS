package com.accountbm.projectcode.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class ProjectCodeDtos {
    private ProjectCodeDtos() {}

    public record CreateProjectCodeRequest(
            @NotNull @Positive Integer code,
            @NotBlank @Size(max = 160) String name,
            @Size(max = 500) String description) {}

    public record UpdateProjectCodeRequest(
            @NotBlank @Size(max = 160) String name,
            @Size(max = 500) String description,
            @NotBlank String status,
            @NotNull @PositiveOrZero Long version) {}

    public record ProjectCodeResponse(
            Integer id, UUID companyId, Integer code, String name, String description, String status,
            Instant createdAt, Instant updatedAt, long version) {}
}
