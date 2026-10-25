package com.accountbm.identity.service;

import static com.accountbm.identity.dto.IdentityDtos.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdentityAdminService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;

    public IdentityAdminService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<UserSummary> users(UUID organizationId, UUID actorId) {
        requireOrganizationPermission(actorId, organizationId, "users.read", "users.manage");
        var sql = new StringBuilder("""
                SELECT user_profile.id, user_profile.email, user_profile.display_name, user_profile.status,
                       user_profile.super_admin, user_profile.last_login_at, organization.id AS organization_id,
                       organization.legal_name AS organization_name
                FROM user_profiles user_profile
                LEFT JOIN organization_memberships membership ON membership.user_id = user_profile.id AND membership.status <> 'REMOVED'
                    AND membership.organization_id = user_profile.assigned_organization_id
                LEFT JOIN organizations organization ON organization.id = membership.organization_id
                """);
        var arguments = new ArrayList<Object>();
        sql.append(" WHERE user_profile.assigned_organization_id = ?");
        arguments.add(organizationId);
        sql.append(" ORDER BY user_profile.display_name");
        return jdbc.query(sql.toString(), (rs, rowNum) -> {
            var id = rs.getObject("id", UUID.class);
            var orgId = rs.getObject("organization_id", UUID.class);
            return new UserSummary(id, rs.getString("email"), rs.getString("display_name"), rs.getString("status"),
                    rs.getBoolean("super_admin"), instant(rs.getTimestamp("last_login_at")), orgId,
                    rs.getString("organization_name"), orgId == null ? List.of() : rolesForUser(id, orgId),
                    orgId == null ? List.of() : branchesForUser(id, orgId));
        }, arguments.toArray());
    }

    @Transactional
    public UserSummary createUser(CreateUserRequest request, UUID actorId) {
        requireOrganizationPermission(actorId, request.organizationId(), "users.manage");
        validateOrganizationRolesAndBranches(request.organizationId(), request.roleIds(), request.branchIds());
        try {
            var userId = jdbc.queryForObject("""
                    INSERT INTO user_profiles
                        (identity_subject, email, display_name, password_hash, password_changed_at, assigned_organization_id)
                    VALUES (?, ?, ?, ?, clock_timestamp(), ?) RETURNING id
                    """, UUID.class, "local:" + UUID.randomUUID(), request.email().strip().toLowerCase(Locale.ROOT),
                    request.displayName().strip(), passwordEncoder.encode(request.password()), request.organizationId());
            var membershipId = jdbc.queryForObject("""
                    INSERT INTO organization_memberships (organization_id, user_id, status, joined_at)
                    VALUES (?, ?, 'ACTIVE', clock_timestamp()) RETURNING id
                    """, UUID.class, request.organizationId(), userId);
            replaceRoles(request.organizationId(), membershipId, request.roleIds());
            replaceBranches(request.organizationId(), membershipId, request.branchIds());
            audit(request.organizationId(), actorId, "USER_CREATED", userId);
            return user(userId, request.organizationId(), actorId);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A user with this email already exists");
        }
    }

    @Transactional
    public UserSummary updateUser(UUID userId, UpdateUserRequest request, UUID actorId) {
        requireOrganizationPermission(actorId, request.organizationId(), "users.manage");
        var target = jdbc.query("SELECT super_admin, assigned_organization_id FROM user_profiles WHERE id = ?",
                (rs, rowNum) -> new UserAssignment(rs.getBoolean("super_admin"),
                        rs.getObject("assigned_organization_id", UUID.class)), userId);
        if (target.isEmpty()) throw notFound("User");
        if (target.getFirst().superAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "The super administrator account cannot be reassigned");
        }
        var actorIsSuperAdmin = isSuperAdmin(actorId);
        var currentOrganizationId = target.getFirst().organizationId();
        if (currentOrganizationId != null && !currentOrganizationId.equals(request.organizationId()) && !actorIsSuperAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only a super administrator can reassign a user's company");
        }
        var status = request.status().strip().toUpperCase(Locale.ROOT);
        if (!Set.of("ACTIVE", "LOCKED", "DISABLED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE, LOCKED, or DISABLED");
        }
        validateOrganizationRolesAndBranches(request.organizationId(), request.roleIds(), request.branchIds());
        jdbc.update("""
                UPDATE user_profiles SET display_name = ?, status = ?, assigned_organization_id = ?,
                    updated_at = clock_timestamp(), version = version + 1 WHERE id = ?
                """, request.displayName().strip(), status, request.organizationId(), userId);
        jdbc.update("""
                UPDATE organization_memberships SET status = 'REMOVED', updated_at = clock_timestamp(), version = version + 1
                WHERE user_id = ? AND organization_id <> ? AND status <> 'REMOVED'
                """, userId, request.organizationId());
        jdbc.update("""
                INSERT INTO organization_memberships (organization_id, user_id, status, joined_at)
                VALUES (?, ?, 'ACTIVE', clock_timestamp())
                ON CONFLICT (organization_id, user_id) DO UPDATE
                    SET status = 'ACTIVE', updated_at = clock_timestamp(), version = organization_memberships.version + 1
                """, request.organizationId(), userId);
        var membershipId = jdbc.queryForObject(
                "SELECT id FROM organization_memberships WHERE organization_id = ? AND user_id = ?",
                UUID.class, request.organizationId(), userId);
        replaceRoles(request.organizationId(), membershipId, request.roleIds());
        replaceBranches(request.organizationId(), membershipId, request.branchIds());
        jdbc.update("UPDATE refresh_tokens SET revoked_at = coalesce(revoked_at, clock_timestamp()) WHERE user_id = ?", userId);
        audit(request.organizationId(), actorId, "USER_UPDATED", userId);
        return user(userId, request.organizationId(), actorId);
    }

    @Transactional(readOnly = true)
    public List<RoleDetail> roles(UUID organizationId, UUID actorId) {
        requireOrganizationPermission(actorId, organizationId, "roles.read", "roles.manage");
        return jdbc.query("SELECT id, organization_id, code, name, system_role FROM roles WHERE organization_id = ? ORDER BY name",
                (rs, rowNum) -> role(rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                        rs.getString("code"), rs.getString("name"), rs.getBoolean("system_role")), organizationId);
    }

    @Transactional
    public RoleDetail createRole(SaveRoleRequest request, UUID actorId) {
        requireOrganizationPermission(actorId, request.organizationId(), "roles.manage");
        validatePermissions(request.permissions());
        var id = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO roles (id, organization_id, code, name, system_role) VALUES (?, ?, ?, ?, false)",
                    id, request.organizationId(), normalizeRoleCode(request.code()), request.name().strip());
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A role with this code already exists");
        }
        replacePermissions(request.organizationId(), id, request.permissions());
        audit(request.organizationId(), actorId, "ROLE_CREATED", id);
        return role(id, request.organizationId(), normalizeRoleCode(request.code()), request.name().strip(), false);
    }

    @Transactional
    public RoleDetail updateRole(UUID roleId, SaveRoleRequest request, UUID actorId) {
        requireOrganizationPermission(actorId, request.organizationId(), "roles.manage");
        validatePermissions(request.permissions());
        var existingRole = jdbc.query("SELECT code, system_role FROM roles WHERE id = ? AND organization_id = ?",
                (rs, rowNum) -> new ExistingRole(rs.getString("code"), rs.getBoolean("system_role")),
                roleId, request.organizationId());
        if (existingRole.isEmpty()) throw notFound("Role");
        if (existingRole.getFirst().systemRole()) {
            jdbc.update("UPDATE roles SET name = ?, updated_at = clock_timestamp(), version = version + 1 WHERE id = ?",
                    request.name().strip(), roleId);
        } else {
            jdbc.update("UPDATE roles SET code = ?, name = ?, updated_at = clock_timestamp(), version = version + 1 WHERE id = ?",
                    normalizeRoleCode(request.code()), request.name().strip(), roleId);
        }
        replacePermissions(request.organizationId(), roleId, request.permissions());
        audit(request.organizationId(), actorId, "ROLE_UPDATED", roleId);
        return role(roleId, request.organizationId(), existingRole.getFirst().systemRole()
                        ? existingRole.getFirst().code() : normalizeRoleCode(request.code()),
                request.name().strip(), existingRole.getFirst().systemRole());
    }

    @Transactional(readOnly = true)
    public List<PermissionSummary> permissions() {
        return jdbc.query("SELECT code, description FROM permissions ORDER BY code",
                (rs, rowNum) -> new PermissionSummary(rs.getString("code"), rs.getString("description")));
    }

    @Transactional(readOnly = true)
    public List<OrganizationSummary> organizations(UUID actorId) {
        var superAdmin = isSuperAdmin(actorId);
        var sql = superAdmin
                ? "SELECT id, code, legal_name FROM organizations WHERE status = 'ACTIVE' ORDER BY legal_name"
                : """
                  SELECT organization.id, organization.code, organization.legal_name
                  FROM organizations organization
                  JOIN user_profiles user_profile ON user_profile.assigned_organization_id = organization.id
                  JOIN organization_memberships membership ON membership.organization_id = organization.id
                    AND membership.user_id = user_profile.id
                  WHERE user_profile.id = ? AND membership.status = 'ACTIVE' AND organization.status = 'ACTIVE'
                  ORDER BY organization.legal_name
                  """;
        return jdbc.query(sql, (rs, rowNum) -> new OrganizationSummary(rs.getObject("id", UUID.class),
                rs.getString("code"), rs.getString("legal_name")), superAdmin ? new Object[]{} : new Object[]{actorId});
    }

    private UserSummary user(UUID userId, UUID organizationId, UUID actorId) {
        return users(organizationId, actorId).stream().filter(item -> item.id().equals(userId)).findFirst().orElseThrow(() -> notFound("User"));
    }

    private List<RoleSummary> rolesForUser(UUID userId, UUID organizationId) {
        return jdbc.query("""
                SELECT role.id, role.code, role.name, role.system_role
                FROM organization_memberships membership
                JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                JOIN roles role ON role.id = membership_role.role_id
                WHERE membership.user_id = ? AND membership.organization_id = ? ORDER BY role.name
                """, (rs, rowNum) -> new RoleSummary(rs.getObject("id", UUID.class), rs.getString("code"),
                rs.getString("name"), rs.getBoolean("system_role")), userId, organizationId);
    }

    private List<BranchSummary> branchesForUser(UUID userId, UUID organizationId) {
        return jdbc.query("""
                SELECT branch.id, branch.code, branch.name, branch.branch_type
                FROM organization_memberships membership
                JOIN membership_branches membership_branch ON membership_branch.membership_id = membership.id
                JOIN branches branch ON branch.id = membership_branch.branch_id
                  AND branch.organization_id = membership_branch.organization_id
                WHERE membership.user_id = ? AND membership.organization_id = ?
                ORDER BY branch.name
                """, (rs, rowNum) -> new BranchSummary(rs.getObject("id", UUID.class), rs.getString("code"),
                rs.getString("name"), rs.getString("branch_type")), userId, organizationId);
    }

    private RoleDetail role(UUID id, UUID organizationId, String code, String name, boolean systemRole) {
        var permissions = new LinkedHashSet<String>();
        jdbc.query("SELECT permission_code FROM role_permissions WHERE role_id = ? ORDER BY permission_code",
                (org.springframework.jdbc.core.RowCallbackHandler) rs -> permissions.add(rs.getString(1)), id);
        return new RoleDetail(id, organizationId, code, name, systemRole, permissions);
    }

    private void validateOrganizationRolesAndBranches(UUID organizationId, List<UUID> roleIds, List<UUID> branchIds) {
        if (organizationId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization is required");
        var validIds = jdbc.query("SELECT id FROM roles WHERE organization_id = ?", (rs, rowNum) -> rs.getObject(1, UUID.class), organizationId);
        if (!validIds.containsAll(roleIds)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more roles do not belong to the organization");
        var validBranchIds = jdbc.query("SELECT id FROM branches WHERE organization_id = ? AND status = 'ACTIVE'",
                (rs, rowNum) -> rs.getObject(1, UUID.class), organizationId);
        if (!validBranchIds.containsAll(branchIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more branches do not belong to the organization");
        }
    }

    private void replaceRoles(UUID organizationId, UUID membershipId, List<UUID> roleIds) {
        jdbc.update("DELETE FROM membership_roles WHERE membership_id = ?", membershipId);
        roleIds.forEach(roleId -> jdbc.update("INSERT INTO membership_roles (organization_id, membership_id, role_id) VALUES (?, ?, ?)",
                organizationId, membershipId, roleId));
    }

    private void replaceBranches(UUID organizationId, UUID membershipId, List<UUID> branchIds) {
        jdbc.update("DELETE FROM membership_branches WHERE membership_id = ?", membershipId);
        branchIds.forEach(branchId -> jdbc.update(
                "INSERT INTO membership_branches (organization_id, membership_id, branch_id) VALUES (?, ?, ?)",
                organizationId, membershipId, branchId));
    }

    private void validatePermissions(Set<String> requested) {
        var all = jdbc.query("SELECT code FROM permissions", (rs, rowNum) -> rs.getString(1));
        if (requested == null || !all.containsAll(requested)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more permissions are invalid");
        }
    }

    private void replacePermissions(UUID organizationId, UUID roleId, Set<String> permissions) {
        jdbc.update("DELETE FROM role_permissions WHERE role_id = ?", roleId);
        permissions.forEach(permission -> jdbc.update("INSERT INTO role_permissions (organization_id, role_id, permission_code) VALUES (?, ?, ?)",
                organizationId, roleId, permission));
    }

    private void audit(UUID organizationId, UUID actorId, String action, UUID entityId) {
        jdbc.update("INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'IDENTITY', ?)",
                organizationId, actorId, action, entityId.toString());
    }

    private void requireOrganizationPermission(UUID actorId, UUID organizationId, String... permissions) {
        if (organizationId == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Organization is required");
        var placeholders = String.join(",", java.util.Collections.nCopies(permissions.length, "?"));
        var sql = """
                SELECT EXISTS (
                    SELECT 1 FROM user_profiles WHERE id = ? AND status = 'ACTIVE' AND super_admin
                ) OR EXISTS (
                    SELECT 1
                    FROM organization_memberships membership
                    JOIN user_profiles user_profile ON user_profile.id = membership.user_id
                    JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                    JOIN role_permissions role_permission ON role_permission.role_id = membership_role.role_id
                    WHERE membership.user_id = ? AND membership.organization_id = ?
                      AND user_profile.assigned_organization_id = membership.organization_id
                      AND membership.status = 'ACTIVE' AND role_permission.permission_code IN (%s)
                )
                """.formatted(placeholders);
        var arguments = new ArrayList<>();
        arguments.add(actorId);
        arguments.add(actorId);
        arguments.add(organizationId);
        arguments.addAll(List.of(permissions));
        var allowed = jdbc.queryForObject(sql, Boolean.class, arguments.toArray());
        if (!Boolean.TRUE.equals(allowed)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this organization");
        }
    }

    private boolean isSuperAdmin(UUID userId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = ? AND status = 'ACTIVE' AND super_admin)",
                Boolean.class, userId));
    }

    private static String normalizeRoleCode(String code) {
        return code.strip().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]+", "_");
    }

    private static Instant instant(java.sql.Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static ResponseStatusException notFound(String resource) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, resource + " was not found");
    }

    private record UserAssignment(boolean superAdmin, UUID organizationId) {}
    private record ExistingRole(String code, boolean systemRole) {}
}
