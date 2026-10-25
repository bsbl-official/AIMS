package com.accountbm.componentcode.model;

import java.time.Instant;
import java.util.UUID;

public record ComponentCode(
        Integer id, UUID companyId, Integer projectCodeId, Integer projectCode, String projectName,
        Integer financeCodeId, Integer financeCode, String financeName,
        Integer code, String name, String description, String status,
        Instant createdAt, Instant updatedAt, long version) {}
