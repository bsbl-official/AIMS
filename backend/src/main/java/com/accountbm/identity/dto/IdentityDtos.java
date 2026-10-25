package com.accountbm.identity.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public final class IdentityDtos {
    private IdentityDtos() {}

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record LogoutRequest(@NotBlank String refreshToken) {}

    public record TokenResponse(
            String accessToken,
            String refreshToken,
            long expiresInSeconds,
            CurrentUser user) {}

    public record OrganizationAccess(
            UUID organizationId,
            String organizationCode,
            String organizationName,
            List<String> roles,
            List<BranchSummary> branches) {}

    public record CurrentUser(
            UUID id,
            String email,
            String displayName,
            boolean superAdmin,
            Set<String> permissions,
            List<OrganizationAccess> organizations) {}

    public record CreateUserRequest(
            @Email @NotBlank String email,
            @NotBlank @Size(max = 160) String displayName,
            @NotBlank @Size(min = 10, max = 72) String password,
            UUID organizationId,
            @NotEmpty List<UUID> roleIds,
            @NotEmpty List<UUID> branchIds) {}

    public record UpdateUserRequest(
            @NotBlank @Size(max = 160) String displayName,
            @NotBlank String status,
            UUID organizationId,
            @NotEmpty List<UUID> roleIds,
            @NotEmpty List<UUID> branchIds) {}

    public record UserSummary(
            UUID id,
            String email,
            String displayName,
            String status,
            boolean superAdmin,
            Instant lastLoginAt,
            UUID organizationId,
            String organizationName,
            List<RoleSummary> roles,
            List<BranchSummary> branches) {}

    public record RoleSummary(UUID id, String code, String name, boolean systemRole) {}
    public record BranchSummary(UUID id, String code, String name, String branchType) {}

    public record RoleDetail(
            UUID id,
            UUID organizationId,
            String code,
            String name,
            boolean systemRole,
            Set<String> permissions) {}

    public record SaveRoleRequest(
            UUID organizationId,
            @NotBlank @Size(max = 60) String code,
            @NotBlank @Size(max = 120) String name,
            Set<String> permissions) {}

    public record PermissionSummary(String code, String description) {}

    public record OrganizationSummary(UUID id, String code, String name) {}
}
