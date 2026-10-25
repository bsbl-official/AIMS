package com.accountbm.company.dto;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class CompanyDtos {
    private CompanyDtos() {}

    public record CreateCompanyRequest(
            @NotBlank @Size(max = 40) @Pattern(regexp = "[0-9]+", message = "must contain digits only") String code,
            @NotBlank @Size(max = 200) String legalName,
            @Size(max = 200) String tradingName,
            @Size(max = 100) String registrationNumber,
            @Size(max = 100) String taxIdentifier,
            @NotBlank @Pattern(regexp = "[A-Za-z]{3}") String baseCurrencyCode,
            @NotBlank @Size(max = 60) String timezone,
            @NotBlank @Size(max = 20) String locale,
            @Pattern(regexp = "(?i)([A-Z]{2})?") String countryCode,
            @Size(max = 200) String addressLine1,
            @Size(max = 200) String addressLine2,
            @Size(max = 100) String city,
            @Size(max = 100) String stateProvince,
            @Size(max = 30) String postalCode,
            @Email @Size(max = 320) String email,
            @Size(max = 50) String phone,
            @Size(max = 255) String website) {
    }

    public record UpdateCompanyRequest(
            @NotBlank @Size(max = 200) String legalName,
            @Size(max = 200) String tradingName,
            @Size(max = 100) String registrationNumber,
            @Size(max = 100) String taxIdentifier,
            @NotBlank @Pattern(regexp = "[A-Za-z]{3}") String baseCurrencyCode,
            @NotBlank @Size(max = 60) String timezone,
            @NotBlank @Size(max = 20) String locale,
            @Pattern(regexp = "(?i)([A-Z]{2})?") String countryCode,
            @Size(max = 200) String addressLine1,
            @Size(max = 200) String addressLine2,
            @Size(max = 100) String city,
            @Size(max = 100) String stateProvince,
            @Size(max = 30) String postalCode,
            @Email @Size(max = 320) String email,
            @Size(max = 50) String phone,
            @Size(max = 255) String website,
            @NotBlank String status,
            @NotNull @PositiveOrZero Long version) {
    }

    public record CompanyResponse(
            UUID id,
            String code,
            String legalName,
            String tradingName,
            String registrationNumber,
            String taxIdentifier,
            String baseCurrencyCode,
            String timezone,
            String locale,
            String countryCode,
            String addressLine1,
            String addressLine2,
            String city,
            String stateProvince,
            String postalCode,
            String email,
            String phone,
            String website,
            String status,
            Instant createdAt,
            Instant updatedAt,
            long version) {
    }
}
