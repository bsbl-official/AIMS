package com.accountbm.branch.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class BranchDtos {
    private BranchDtos() {}

    public record CreateBranchRequest(
            @NotBlank @Size(max = 40) @Pattern(regexp = "[A-Za-z0-9_-]+") String code,
            @NotBlank @Size(max = 200) String name,
            @NotBlank String branchType,
            @Pattern(regexp = "(?i)([A-Z]{2})?") String countryCode,
            @Size(max = 200) String addressLine1,
            @Size(max = 200) String addressLine2,
            @Size(max = 100) String city,
            @Size(max = 100) String stateProvince,
            @Size(max = 30) String postalCode,
            @Email @Size(max = 320) String email,
            @Size(max = 50) String phone,
            @NotBlank @Size(max = 60) String timezone) {
    }

    public record UpdateBranchRequest(
            @NotBlank @Size(max = 200) String name,
            @NotBlank String branchType,
            @Pattern(regexp = "(?i)([A-Z]{2})?") String countryCode,
            @Size(max = 200) String addressLine1,
            @Size(max = 200) String addressLine2,
            @Size(max = 100) String city,
            @Size(max = 100) String stateProvince,
            @Size(max = 30) String postalCode,
            @Email @Size(max = 320) String email,
            @Size(max = 50) String phone,
            @NotBlank @Size(max = 60) String timezone,
            @NotBlank String status,
            @NotNull @PositiveOrZero Long version) {
    }

    public record BranchResponse(
            UUID id,
            UUID companyId,
            String companyCode,
            String companyName,
            String code,
            String name,
            String branchType,
            String countryCode,
            String addressLine1,
            String addressLine2,
            String city,
            String stateProvince,
            String postalCode,
            String email,
            String phone,
            String timezone,
            String status,
            Instant createdAt,
            Instant updatedAt,
            long version) {
    }
}
