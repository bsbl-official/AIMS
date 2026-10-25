package com.accountbm.financecode.service;

import static com.accountbm.financecode.dto.FinanceCodeDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import com.accountbm.financecode.model.FinanceCode;
import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FinanceCodeService {
    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE");
    private static final String SELECT = """
            finance.id, finance.organization_id, finance.project_code_id,
            project.id AS project_code, project.name AS project_name,
            finance.id AS code, finance.name, finance.description, finance.status,
            finance.created_at, finance.updated_at, finance.version
            """;
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public FinanceCodeService(JdbcTemplate jdbc, OrganizationAccessService access) { this.jdbc = jdbc; this.access = access; }

    @Transactional(readOnly = true)
    public List<FinanceCodeResponse> financeCodes(UUID companyId, Integer projectCodeId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "finance_codes.read", "finance_codes.manage",
                "component_codes.read", "component_codes.manage");
        var sql = new StringBuilder("SELECT " + SELECT + " FROM finance_codes finance JOIN project_codes project ON project.id = finance.project_code_id AND project.organization_id = finance.organization_id WHERE finance.organization_id = ?");
        var parameters = new ArrayList<Object>(); parameters.add(companyId);
        if (projectCodeId != null) { sql.append(" AND finance.project_code_id = ?"); parameters.add(projectCodeId); }
        sql.append(" ORDER BY project.id, finance.id");
        return jdbc.query(sql.toString(), (rs, rowNum) -> response(map(rs)), parameters.toArray());
    }

    @Transactional(readOnly = true)
    public FinanceCodeResponse financeCode(UUID companyId, Integer id, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "finance_codes.read", "finance_codes.manage",
                "component_codes.read", "component_codes.manage");
        return response(find(companyId, id));
    }

    @Transactional
    public FinanceCodeResponse create(UUID companyId, CreateFinanceCodeRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "finance_codes.manage");
        requireActiveProject(companyId, request.projectCodeId());
        var id = request.code();
        try {
            jdbc.update("INSERT INTO finance_codes (id, organization_id, project_code_id, name, description) VALUES (?, ?, ?, ?, ?)",
                    id, companyId, request.projectCodeId(), request.name().strip(), blank(request.description()));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This finance code already exists for the selected project");
        }
        audit(companyId, actorId, "FINANCE_CODE_CREATED", id);
        return response(find(companyId, id));
    }

    @Transactional
    public FinanceCodeResponse update(UUID companyId, Integer id, UpdateFinanceCodeRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "finance_codes.manage");
        requireActiveProject(companyId, request.projectCodeId());
        try {
            var updated = jdbc.update("""
                    UPDATE finance_codes SET project_code_id = ?, name = ?, description = ?, status = ?,
                        updated_at = clock_timestamp(), version = version + 1
                    WHERE organization_id = ? AND id = ? AND version = ?
                    """, request.projectCodeId(), request.name().strip(), blank(request.description()), status(request.status()), companyId, id, request.version());
            if (updated == 0) throw conflictOrNotFound(companyId, id);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Finance code cannot change project while component codes reference it");
        }
        audit(companyId, actorId, "FINANCE_CODE_UPDATED", id);
        return response(find(companyId, id));
    }

    private void requireActiveProject(UUID companyId, Integer projectId) {
        var valid = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM project_codes WHERE organization_id = ? AND id = ? AND status = 'ACTIVE')", Boolean.class, companyId, projectId);
        if (!Boolean.TRUE.equals(valid)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select an active project code from this company");
    }
    private FinanceCode find(UUID companyId, Integer id) {
        var rows = jdbc.query("SELECT " + SELECT + " FROM finance_codes finance JOIN project_codes project ON project.id = finance.project_code_id AND project.organization_id = finance.organization_id WHERE finance.organization_id = ? AND finance.id = ?", (rs, rowNum) -> map(rs), companyId, id);
        if (rows.isEmpty()) throw notFound(); return rows.getFirst();
    }
    private void audit(UUID companyId, UUID actorId, String action, Integer id) { jdbc.update("INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'FINANCE_CODE', ?)", companyId, actorId, action, id.toString()); }
    private ResponseStatusException conflictOrNotFound(UUID companyId, Integer id) { var exists = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM finance_codes WHERE organization_id = ? AND id = ?)", Boolean.class, companyId, id)); return exists ? new ResponseStatusException(HttpStatus.CONFLICT, "Finance code was changed by another user; reload and try again") : notFound(); }
    private static FinanceCode map(ResultSet rs) throws SQLException { return new FinanceCode(rs.getInt("id"), rs.getObject("organization_id", UUID.class), rs.getInt("project_code_id"), rs.getInt("project_code"), rs.getString("project_name"), rs.getInt("code"), rs.getString("name"), rs.getString("description"), rs.getString("status"), instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")), rs.getLong("version")); }
    private static FinanceCodeResponse response(FinanceCode item) { return new FinanceCodeResponse(item.id(), item.companyId(), item.projectCodeId(), item.projectCode(), item.projectName(), item.code(), item.name(), item.description(), item.status(), item.createdAt(), item.updatedAt(), item.version()); }
    private static String blank(String value) { return value == null || value.isBlank() ? null : value.strip(); }
    private static String status(String value) { var normalized = value.strip().toUpperCase(Locale.ROOT); if (!STATUSES.contains(normalized)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE or INACTIVE"); return normalized; }
    private static java.time.Instant instant(Timestamp value) { return value.toInstant(); }
    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Finance code was not found"); }
}
