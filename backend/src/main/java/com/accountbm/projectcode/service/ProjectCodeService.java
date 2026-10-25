package com.accountbm.projectcode.service;

import static com.accountbm.projectcode.dto.ProjectCodeDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import com.accountbm.organization.service.OrganizationAccessService;
import com.accountbm.projectcode.model.ProjectCode;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectCodeService {
    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE");
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public ProjectCodeService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<ProjectCodeResponse> projectCodes(UUID companyId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "project_codes.read", "project_codes.manage",
                "finance_codes.read", "finance_codes.manage", "component_codes.read", "component_codes.manage");
        return jdbc.query("SELECT * FROM project_codes WHERE organization_id = ? ORDER BY id",
                (rs, rowNum) -> response(map(rs)), companyId);
    }

    @Transactional(readOnly = true)
    public ProjectCodeResponse projectCode(UUID companyId, Integer id, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "project_codes.read", "project_codes.manage",
                "finance_codes.read", "finance_codes.manage", "component_codes.read", "component_codes.manage");
        return response(find(companyId, id));
    }

    @Transactional
    public ProjectCodeResponse create(UUID companyId, CreateProjectCodeRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "project_codes.manage");
        var id = request.code();
        try {
            jdbc.update("INSERT INTO project_codes (id, organization_id, name, description) VALUES (?, ?, ?, ?)",
                    id, companyId, request.name().strip(), blank(request.description()));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A project code with this code already exists");
        }
        audit(companyId, actorId, "PROJECT_CODE_CREATED", id);
        return response(find(companyId, id));
    }

    @Transactional
    public ProjectCodeResponse update(UUID companyId, Integer id, UpdateProjectCodeRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "project_codes.manage");
        var updated = jdbc.update("""
                UPDATE project_codes SET name = ?, description = ?, status = ?, updated_at = clock_timestamp(), version = version + 1
                WHERE organization_id = ? AND id = ? AND version = ?
                """, request.name().strip(), blank(request.description()), status(request.status()), companyId, id, request.version());
        if (updated == 0) throw conflictOrNotFound(companyId, id);
        audit(companyId, actorId, "PROJECT_CODE_UPDATED", id);
        return response(find(companyId, id));
    }

    private ProjectCode find(UUID companyId, Integer id) {
        var rows = jdbc.query("SELECT * FROM project_codes WHERE organization_id = ? AND id = ?",
                (rs, rowNum) -> map(rs), companyId, id);
        if (rows.isEmpty()) throw notFound();
        return rows.getFirst();
    }

    private void audit(UUID companyId, UUID actorId, String action, Integer id) {
        jdbc.update("INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'PROJECT_CODE', ?)",
                companyId, actorId, action, id.toString());
    }

    private ResponseStatusException conflictOrNotFound(UUID companyId, Integer id) {
        var exists = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM project_codes WHERE organization_id = ? AND id = ?)", Boolean.class, companyId, id));
        return exists ? new ResponseStatusException(HttpStatus.CONFLICT, "Project code was changed by another user; reload and try again") : notFound();
    }

    private static ProjectCode map(ResultSet rs) throws SQLException {
        return new ProjectCode(rs.getInt("id"), rs.getObject("organization_id", UUID.class),
                rs.getInt("id"), rs.getString("name"), rs.getString("description"), rs.getString("status"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")), rs.getLong("version"));
    }
    private static ProjectCodeResponse response(ProjectCode item) { return new ProjectCodeResponse(item.id(), item.companyId(), item.code(), item.name(), item.description(), item.status(), item.createdAt(), item.updatedAt(), item.version()); }
    private static String blank(String value) { return value == null || value.isBlank() ? null : value.strip(); }
    private static String status(String value) { var normalized = value.strip().toUpperCase(Locale.ROOT); if (!STATUSES.contains(normalized)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE or INACTIVE"); return normalized; }
    private static java.time.Instant instant(Timestamp value) { return value.toInstant(); }
    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Project code was not found"); }
}
