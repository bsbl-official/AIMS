package com.accountbm.identity.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class MfaDtos {
    private MfaDtos() {}
    public record EnrollmentStart(String secret,String otpauthUri){}
    public record ConfirmEnrollmentRequest(@NotBlank @Size(max=20) String code){}
    public record EnrollmentComplete(List<String> recoveryCodes){}
    public record DisableMfaRequest(@NotBlank String currentPassword,@NotBlank @Size(max=20) String code){}
    public record SessionSummary(UUID familyId,Instant createdAt,Instant expiresAt,String ipAddress,String userAgent,boolean current){}
}

