package com.accountbm.branch.model;

import java.time.Instant;
import java.util.UUID;

public record Branch(
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
