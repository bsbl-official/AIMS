package com.accountbm.organization.service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.Set;
import java.util.LinkedHashSet;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class OrganizationAccessService {
    private final JdbcTemplate jdbc;

    public OrganizationAccessService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isSuperAdmin(UUID actorId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE id = ? AND status = 'ACTIVE' AND super_admin)",
                Boolean.class, actorId));
    }

    public void requireSuperAdmin(UUID actorId) {
        if (!isSuperAdmin(actorId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only a super administrator can create a company");
        }
    }

    public void requireCompanyPermission(UUID actorId, UUID companyId, String... permissions) {
        if (companyId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        if (isSuperAdmin(actorId)) return;

        var placeholders = String.join(",", java.util.Collections.nCopies(permissions.length, "?"));
        var sql = """
                SELECT EXISTS (
                    SELECT 1
                    FROM organization_memberships membership
                    JOIN user_profiles user_profile ON user_profile.id = membership.user_id
                    JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                    JOIN role_permissions role_permission ON role_permission.role_id = membership_role.role_id
                    JOIN permissions permission ON permission.id=role_permission.permission_id AND permission.status='ACTIVE'
                    JOIN permission_capabilities permission_capability ON permission_capability.permission_id=permission.id
                    WHERE membership.user_id = ? AND membership.organization_id = ?
                      AND user_profile.assigned_organization_id = membership.organization_id
                      AND membership.status = 'ACTIVE'
                      AND permission_capability.capability_code IN (%s)
                )
                """.formatted(placeholders);
        var arguments = new ArrayList<>();
        arguments.add(actorId);
        arguments.add(companyId);
        arguments.addAll(List.of(permissions));
        if (!Boolean.TRUE.equals(jdbc.queryForObject(sql, Boolean.class, arguments.toArray()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this company");
        }
    }

    public void requireCompanyAdministrator(UUID actorId, UUID companyId) {
        if (companyId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Company is required");
        }
        if (isSuperAdmin(actorId)) return;
        var isCompanyAdministrator = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM organization_memberships membership
                    JOIN user_profiles user_profile ON user_profile.id = membership.user_id
                    JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                    JOIN roles role ON role.id = membership_role.role_id
                    WHERE membership.user_id = ? AND membership.organization_id = ?
                      AND user_profile.assigned_organization_id = membership.organization_id
                      AND membership.status = 'ACTIVE' AND user_profile.status = 'ACTIVE'
                      AND role.code = 'COMPANY_ADMIN'
                )
                """, Boolean.class, actorId, companyId));
        if (!isCompanyAdministrator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Only a super administrator or company administrator can access financial year setup");
        }
    }

    public void requireBranchPermission(UUID actorId, UUID companyId, UUID branchId, String... permissions) {
        requireCompanyPermission(actorId, companyId, permissions);
        if (isSuperAdmin(actorId)) return;
        if (branchId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch is required");
        }
        var allowed = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1
                    FROM organization_memberships membership
                    JOIN membership_branches membership_branch ON membership_branch.membership_id=membership.id
                        AND membership_branch.organization_id=membership.organization_id
                    JOIN branches branch ON branch.id=membership_branch.branch_id
                        AND branch.organization_id=membership.organization_id
                    WHERE membership.user_id=? AND membership.organization_id=? AND membership.status='ACTIVE'
                      AND branch.id=? AND branch.status='ACTIVE'
                )
                """, Boolean.class, actorId, companyId, branchId));
        if (!allowed) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have access to this branch");
        }
    }

    public Set<UUID> allowedBranchIds(UUID actorId, UUID companyId) {
        if (isSuperAdmin(actorId)) {
            return new LinkedHashSet<>(jdbc.query("SELECT id FROM branches WHERE organization_id=? ORDER BY id",
                    (rs, rowNum) -> rs.getObject(1, UUID.class), companyId));
        }
        return new LinkedHashSet<>(jdbc.query("""
                SELECT branch.id
                FROM organization_memberships membership
                JOIN membership_branches membership_branch ON membership_branch.membership_id=membership.id
                    AND membership_branch.organization_id=membership.organization_id
                JOIN branches branch ON branch.id=membership_branch.branch_id
                    AND branch.organization_id=membership.organization_id
                WHERE membership.user_id=? AND membership.organization_id=? AND membership.status='ACTIVE'
                  AND branch.status='ACTIVE'
                ORDER BY branch.id
                """, (rs,rowNum)->rs.getObject(1,UUID.class),actorId,companyId));
    }
}
