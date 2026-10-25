package com.accountbm.company.model;

import java.time.Instant;
import java.util.UUID;

public record Company(
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
