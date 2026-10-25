package com.accountbm.branch.service;

import static com.accountbm.branch.dto.BranchDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import com.accountbm.branch.model.Branch;
import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class BranchService {
    private static final Set<String> TYPES = Set.of("HEAD_OFFICE", "BRANCH");
    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE", "CLOSED");
    private static final String SELECT_COLUMNS = """
            branch.id, branch.organization_id, branch.company_code,
            organization.legal_name AS company_name, branch.code, branch.name, branch.branch_type,
            branch.country_code, branch.address_line_1, branch.address_line_2, branch.city,
            branch.state_province, branch.postal_code, branch.email, branch.phone, branch.timezone,
            branch.status, branch.created_at, branch.updated_at, branch.version
            """;

    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public BranchService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<BranchResponse> branches(UUID companyId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "branches.read", "branches.manage");
        return jdbc.query("""
                SELECT %s
                FROM branches branch
                JOIN organizations organization ON organization.id = branch.organization_id
                WHERE branch.organization_id = ?
                ORDER BY CASE branch.branch_type WHEN 'HEAD_OFFICE' THEN 0 ELSE 1 END, branch.name
                """.formatted(SELECT_COLUMNS), (rs, rowNum) -> response(branch(rs)), companyId);
    }

    @Transactional(readOnly = true)
    public BranchResponse branch(UUID companyId, UUID branchId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "branches.read", "branches.manage");
        return response(find(companyId, branchId));
    }

    @Transactional
    public BranchResponse create(UUID companyId, CreateBranchRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "branches.manage");
        requireActiveCompany(companyId);
        validateTimezone(request.timezone());
        var id = UUID.randomUUID();
        try {
            jdbc.update("""
                    INSERT INTO branches (
                        id, organization_id, company_code, code, name, branch_type, country_code, address_line_1,
                        address_line_2, city, state_province, postal_code, email, phone, timezone
                    ) VALUES (?, ?, (SELECT code FROM organizations WHERE id = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, id, companyId, companyId, normalizeCode(request.code()), request.name().strip(),
                    type(request.branchType()), country(request.countryCode()), blank(request.addressLine1()),
                    blank(request.addressLine2()), blank(request.city()), blank(request.stateProvince()),
                    blank(request.postalCode()), blank(request.email()), blank(request.phone()), request.timezone().strip());
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "The branch code already exists or this company already has an active head office");
        }
        audit(companyId, actorId, "BRANCH_CREATED", id);
        return response(find(companyId, id));
    }

    @Transactional
    public BranchResponse update(UUID companyId, UUID branchId, UpdateBranchRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "branches.manage");
        validateTimezone(request.timezone());
        var existing = find(companyId, branchId);
        var status = status(request.status());
        if ("ACTIVE".equals(existing.status()) && !"ACTIVE".equals(status)) requireAnotherActiveBranch(companyId, branchId);
        try {
            var updated = jdbc.update("""
                    UPDATE branches SET name = ?, branch_type = ?, country_code = ?, address_line_1 = ?,
                        address_line_2 = ?, city = ?, state_province = ?, postal_code = ?, email = ?,
                        phone = ?, timezone = ?, status = ?, updated_at = clock_timestamp(), version = version + 1
                    WHERE organization_id = ? AND id = ? AND version = ?
                    """, request.name().strip(), type(request.branchType()), country(request.countryCode()),
                    blank(request.addressLine1()), blank(request.addressLine2()), blank(request.city()),
                    blank(request.stateProvince()), blank(request.postalCode()), blank(request.email()),
                    blank(request.phone()), request.timezone().strip(), status, companyId, branchId, request.version());
            if (updated == 0) throw optimisticConflict(companyId, branchId);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This company already has an active head office or the branch is referenced by protected data");
        }
        audit(companyId, actorId, "BRANCH_UPDATED", branchId);
        return response(find(companyId, branchId));
    }

    private Branch find(UUID companyId, UUID branchId) {
        var rows = jdbc.query("""
                SELECT %s
                FROM branches branch
                JOIN organizations organization ON organization.id = branch.organization_id
                WHERE branch.organization_id = ? AND branch.id = ?
                """.formatted(SELECT_COLUMNS), (rs, rowNum) -> branch(rs), companyId, branchId);
        if (rows.isEmpty()) throw notFound();
        return rows.getFirst();
    }

    private void requireActiveCompany(UUID companyId) {
        var active = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM organizations WHERE id = ? AND status = 'ACTIVE')",
                Boolean.class, companyId);
        if (!Boolean.TRUE.equals(active)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Branches can only be added to an active company");
        }
    }

    private void requireAnotherActiveBranch(UUID companyId, UUID branchId) {
        var count = jdbc.queryForObject("""
                SELECT count(*) FROM branches
                WHERE organization_id = ? AND id <> ? AND status = 'ACTIVE'
                """, Integer.class, companyId, branchId);
        if (count == null || count == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A company must retain at least one active branch");
        }
    }

    private void audit(UUID companyId, UUID actorId, String action, UUID entityId) {
        jdbc.update("""
                INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
                VALUES (?, ?, ?, 'BRANCH', ?)
                """, companyId, actorId, action, entityId.toString());
    }

    private ResponseStatusException optimisticConflict(UUID companyId, UUID branchId) {
        var exists = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM branches WHERE organization_id = ? AND id = ?)
                """, Boolean.class, companyId, branchId));
        return exists
                ? new ResponseStatusException(HttpStatus.CONFLICT, "Branch was changed by another user; reload and try again")
                : notFound();
    }

    private static Branch branch(ResultSet rs) throws SQLException {
        return new Branch(rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                rs.getString("company_code"), rs.getString("company_name"), rs.getString("code"),
                rs.getString("name"), rs.getString("branch_type"), rs.getString("country_code"),
                rs.getString("address_line_1"), rs.getString("address_line_2"), rs.getString("city"),
                rs.getString("state_province"), rs.getString("postal_code"), rs.getString("email"),
                rs.getString("phone"), rs.getString("timezone"), rs.getString("status"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")), rs.getLong("version"));
    }

    private static BranchResponse response(Branch branch) {
        return new BranchResponse(branch.id(), branch.companyId(), branch.companyCode(), branch.companyName(),
                branch.code(), branch.name(), branch.branchType(), branch.countryCode(), branch.addressLine1(),
                branch.addressLine2(), branch.city(), branch.stateProvince(), branch.postalCode(), branch.email(),
                branch.phone(), branch.timezone(), branch.status(), branch.createdAt(), branch.updatedAt(), branch.version());
    }

    private static String normalizeCode(String value) {
        return value.strip().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_-]+", "_");
    }

    private static String type(String value) {
        var normalized = value.strip().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Branch type must be HEAD_OFFICE or BRANCH");
        }
        return normalized;
    }

    private static String status(String value) {
        var normalized = value.strip().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE, INACTIVE, or CLOSED");
        }
        return normalized;
    }

    private static void validateTimezone(String value) {
        try {
            ZoneId.of(value.strip());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timezone is invalid");
        }
    }

    private static String country(String value) {
        return value == null || value.isBlank() ? null : value.strip().toUpperCase(Locale.ROOT);
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static java.time.Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch was not found");
    }
}
