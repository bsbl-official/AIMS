package com.accountbm.projectcode.model;

import java.time.Instant;
import java.util.UUID;

public record ProjectCode(
        Integer id, UUID companyId, Integer code, String name, String description, String status,
        Instant createdAt, Instant updatedAt, long version) {}
