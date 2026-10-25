package com.accountbm.financecode.model;

import java.time.Instant;
import java.util.UUID;

public record FinanceCode(
        Integer id, UUID companyId, Integer projectCodeId, Integer projectCode, String projectName,
        Integer code, String name, String description, String status,
        Instant createdAt, Instant updatedAt, long version) {}
