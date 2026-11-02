package com.accountbm.coa.model;

import java.time.Instant;

public record InitialCoa(
        Long coaId,
        String description,
        String insertedBy,
        Instant insertedAt,
        String updatedBy,
        Instant updatedAt,
        String deviceFlag) {}
