package com.accountbm.componentcode.service;

import static com.accountbm.componentcode.dto.ComponentCodeDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import com.accountbm.componentcode.model.ComponentCode;
import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ComponentCodeService {
    private static final Set<String> STATUSES = Set.of("ACTIVE", "INACTIVE");
    private static final String SELECT = """
            component.id, component.organization_id, component.project_code_id,
            project.id AS project_code, project.name AS project_name,
            component.finance_code_id, finance.id AS finance_code, finance.name AS finance_name,
            component.id AS code, component.name, component.description, component.status,
            component.created_at, component.updated_at, component.version
            """;
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public ComponentCodeService(JdbcTemplate jdbc, OrganizationAccessService access) { this.jdbc = jdbc; this.access = access; }

    @Transactional(readOnly = true)
    public List<ComponentCodeResponse> componentCodes(UUID companyId, Integer projectCodeId, Integer financeCodeId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "component_codes.read", "component_codes.manage");
        var sql = new StringBuilder("SELECT " + SELECT + " FROM component_codes component JOIN project_codes project ON project.id = component.project_code_id AND project.organization_id = component.organization_id JOIN finance_codes finance ON finance.id = component.finance_code_id AND finance.project_code_id = component.project_code_id AND finance.organization_id = component.organization_id WHERE component.organization_id = ?");
        var parameters = new ArrayList<Object>(); parameters.add(companyId);
        if (projectCodeId != null) { sql.append(" AND component.project_code_id = ?"); parameters.add(projectCodeId); }
        if (financeCodeId != null) { sql.append(" AND component.finance_code_id = ?"); parameters.add(financeCodeId); }
        sql.append(" ORDER BY project.id, finance.id, component.id");
        return jdbc.query(sql.toString(), (rs, rowNum) -> response(map(rs)), parameters.toArray());
    }

    @Transactional(readOnly = true)
    public ComponentCodeResponse componentCode(UUID companyId, Integer id, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "component_codes.read", "component_codes.manage");
        return response(find(companyId, id));
    }

    @Transactional
    public ComponentCodeResponse create(UUID companyId, CreateComponentCodeRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "component_codes.manage");
        requireActiveHierarchy(companyId, request.projectCodeId(), request.financeCodeId());
        var id = request.code();
        try {
            jdbc.update("INSERT INTO component_codes (id, organization_id, project_code_id, finance_code_id, name, description) VALUES (?, ?, ?, ?, ?, ?)",
                    id, companyId, request.projectCodeId(), request.financeCodeId(), request.name().strip(), blank(request.description()));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This component code already exists for the selected finance code");
        }
        audit(companyId, actorId, "COMPONENT_CODE_CREATED", id);
        return response(find(companyId, id));
    }

    @Transactional
    public ComponentCodeResponse update(UUID companyId, Integer id, UpdateComponentCodeRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "component_codes.manage");
        requireActiveHierarchy(companyId, request.projectCodeId(), request.financeCodeId());
        try {
            var updated = jdbc.update("""
                    UPDATE component_codes SET project_code_id = ?, finance_code_id = ?, name = ?, description = ?,
                        status = ?, updated_at = clock_timestamp(), version = version + 1
                    WHERE organization_id = ? AND id = ? AND version = ?
                    """, request.projectCodeId(), request.financeCodeId(), request.name().strip(), blank(request.description()),
                    status(request.status()), companyId, id, request.version());
            if (updated == 0) throw conflictOrNotFound(companyId, id);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The selected finance code does not belong to the selected project");
        }
        audit(companyId, actorId, "COMPONENT_CODE_UPDATED", id);
        return response(find(companyId, id));
    }

    private void requireActiveHierarchy(UUID companyId, Integer projectId, Integer financeId) {
        var valid = jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM finance_codes finance
                    JOIN project_codes project ON project.id = finance.project_code_id AND project.organization_id = finance.organization_id
                    WHERE finance.organization_id = ? AND finance.project_code_id = ? AND finance.id = ?
                      AND finance.status = 'ACTIVE' AND project.status = 'ACTIVE'
                )
                """, Boolean.class, companyId, projectId, financeId);
        if (!Boolean.TRUE.equals(valid)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select an active finance code belonging to the selected project");
    }
    private ComponentCode find(UUID companyId, Integer id) {
        var rows = jdbc.query("SELECT " + SELECT + " FROM component_codes component JOIN project_codes project ON project.id = component.project_code_id AND project.organization_id = component.organization_id JOIN finance_codes finance ON finance.id = component.finance_code_id AND finance.project_code_id = component.project_code_id AND finance.organization_id = component.organization_id WHERE component.organization_id = ? AND component.id = ?", (rs, rowNum) -> map(rs), companyId, id);
        if (rows.isEmpty()) throw notFound(); return rows.getFirst();
    }
    private void audit(UUID companyId, UUID actorId, String action, Integer id) { jdbc.update("INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'COMPONENT_CODE', ?)", companyId, actorId, action, id.toString()); }
    private ResponseStatusException conflictOrNotFound(UUID companyId, Integer id) { var exists = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM component_codes WHERE organization_id = ? AND id = ?)", Boolean.class, companyId, id)); return exists ? new ResponseStatusException(HttpStatus.CONFLICT, "Component code was changed by another user; reload and try again") : notFound(); }
    private static ComponentCode map(ResultSet rs) throws SQLException { return new ComponentCode(rs.getInt("id"), rs.getObject("organization_id", UUID.class), rs.getInt("project_code_id"), rs.getInt("project_code"), rs.getString("project_name"), rs.getInt("finance_code_id"), rs.getInt("finance_code"), rs.getString("finance_name"), rs.getInt("code"), rs.getString("name"), rs.getString("description"), rs.getString("status"), instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")), rs.getLong("version")); }
    private static ComponentCodeResponse response(ComponentCode item) { return new ComponentCodeResponse(item.id(), item.companyId(), item.projectCodeId(), item.projectCode(), item.projectName(), item.financeCodeId(), item.financeCode(), item.financeName(), item.code(), item.name(), item.description(), item.status(), item.createdAt(), item.updatedAt(), item.version()); }
    private static String blank(String value) { return value == null || value.isBlank() ? null : value.strip(); }
    private static String status(String value) { var normalized = value.strip().toUpperCase(Locale.ROOT); if (!STATUSES.contains(normalized)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE or INACTIVE"); return normalized; }
    private static java.time.Instant instant(Timestamp value) { return value.toInstant(); }
    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Component code was not found"); }
}
