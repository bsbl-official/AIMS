package com.accountbm.company.service;

import static com.accountbm.company.dto.CompanyDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import com.accountbm.company.model.Company;
import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CompanyService {
    private static final Set<String> STATUSES = Set.of("ACTIVE", "SUSPENDED", "CLOSED");
    private static final String SELECT_COLUMNS = """
            organization.id, organization.code, organization.legal_name, organization.trading_name,
            organization.registration_number, organization.tax_identifier, organization.base_currency_code,
            organization.timezone, organization.locale, organization.country_code, organization.address_line_1,
            organization.address_line_2, organization.city, organization.state_province, organization.postal_code,
            organization.email, organization.phone, organization.website, organization.status,
            organization.created_at, organization.updated_at, organization.version
            """;

    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public CompanyService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<CompanyResponse> companies(UUID actorId) {
        var sql = access.isSuperAdmin(actorId)
                ? "SELECT " + SELECT_COLUMNS + " FROM organizations organization ORDER BY organization.legal_name"
                : """
                  SELECT DISTINCT %s
                  FROM organizations organization
                  JOIN organization_memberships membership ON membership.organization_id = organization.id
                  JOIN user_profiles user_profile ON user_profile.id = membership.user_id
                  JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                  JOIN role_permissions role_permission ON role_permission.role_id = membership_role.role_id
                  WHERE membership.user_id = ? AND membership.status = 'ACTIVE'
                    AND user_profile.assigned_organization_id = organization.id
                    AND role_permission.permission_code IN (
                        'companies.read', 'companies.manage', 'branches.read', 'branches.manage',
                        'project_codes.read', 'project_codes.manage', 'finance_codes.read', 'finance_codes.manage',
                        'component_codes.read', 'component_codes.manage',
                        'financial_statements.read', 'financial_statements.manage'
                    )
                  ORDER BY organization.legal_name
                  """.formatted(SELECT_COLUMNS);
        return access.isSuperAdmin(actorId)
                ? jdbc.query(sql, (rs, rowNum) -> response(company(rs)))
                : jdbc.query(sql, (rs, rowNum) -> response(company(rs)), actorId);
    }

    @Transactional(readOnly = true)
    public CompanyResponse company(UUID companyId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "companies.read", "companies.manage");
        return response(find(companyId));
    }

    @Transactional
    public CompanyResponse create(CreateCompanyRequest request, UUID actorId) {
        access.requireSuperAdmin(actorId);
        validateReferenceData(request.baseCurrencyCode(), request.timezone());
        var id = UUID.randomUUID();
        try {
            jdbc.update("""
                    INSERT INTO organizations (
                        id, code, legal_name, trading_name, registration_number, tax_identifier,
                        base_currency_code, timezone, locale, country_code, address_line_1, address_line_2,
                        city, state_province, postal_code, email, phone, website
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, id, request.code().strip(), request.legalName().strip(), blank(request.tradingName()),
                    blank(request.registrationNumber()), blank(request.taxIdentifier()),
                    request.baseCurrencyCode().strip().toUpperCase(Locale.ROOT), request.timezone().strip(),
                    request.locale().strip(), country(request.countryCode()), blank(request.addressLine1()),
                    blank(request.addressLine2()), blank(request.city()), blank(request.stateProvince()),
                    blank(request.postalCode()), blank(request.email()), blank(request.phone()), blank(request.website()));
            var administratorRoleId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO roles (id, organization_id, code, name, system_role)
                    VALUES (?, ?, 'COMPANY_ADMIN', 'Company Administrator', true)
                    """, administratorRoleId, id);
            jdbc.update("""
                    INSERT INTO role_permissions (organization_id, role_id, permission_code)
                    SELECT ?, ?, code FROM permissions
                    """, id, administratorRoleId);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A company with this code already exists");
        }
        audit(id, actorId, "COMPANY_CREATED", id);
        return response(find(id));
    }

    @Transactional
    public CompanyResponse update(UUID companyId, UpdateCompanyRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "companies.manage");
        validateReferenceData(request.baseCurrencyCode(), request.timezone());
        var existing = find(companyId);
        var requestedCurrency = request.baseCurrencyCode().strip().toUpperCase(Locale.ROOT);
        if (!existing.baseCurrencyCode().equals(requestedCurrency)) {
            var hasTransactions = jdbc.queryForObject(
                    "SELECT EXISTS (SELECT 1 FROM journals WHERE organization_id = ?)",
                    Boolean.class, companyId);
            if (Boolean.TRUE.equals(hasTransactions)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Base currency cannot be changed after vouchers have been created");
            }
        }
        var status = status(request.status());
        var updated = jdbc.update("""
                UPDATE organizations SET legal_name = ?, trading_name = ?, registration_number = ?,
                    tax_identifier = ?, base_currency_code = ?, timezone = ?, locale = ?, country_code = ?,
                    address_line_1 = ?, address_line_2 = ?, city = ?, state_province = ?, postal_code = ?,
                    email = ?, phone = ?, website = ?, status = ?, updated_at = clock_timestamp(),
                    version = version + 1
                WHERE id = ? AND version = ?
                """, request.legalName().strip(), blank(request.tradingName()), blank(request.registrationNumber()),
                blank(request.taxIdentifier()), requestedCurrency,
                request.timezone().strip(), request.locale().strip(), country(request.countryCode()),
                blank(request.addressLine1()), blank(request.addressLine2()), blank(request.city()),
                blank(request.stateProvince()), blank(request.postalCode()), blank(request.email()),
                blank(request.phone()), blank(request.website()), status, companyId, request.version());
        if (updated == 0) throw optimisticConflict("Company", companyId);
        if ("CLOSED".equals(status)) {
            jdbc.update("""
                    UPDATE branches SET status = 'CLOSED', updated_at = clock_timestamp(), version = version + 1
                    WHERE organization_id = ? AND status <> 'CLOSED'
                    """, companyId);
        }
        audit(companyId, actorId, "COMPANY_UPDATED", companyId);
        return response(find(companyId));
    }

    @Transactional
    public void delete(UUID companyId, UUID actorId) {
        access.requireSuperAdmin(actorId);
        find(companyId);
        var hasAccountingData = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM journals WHERE organization_id = ?
                    UNION ALL SELECT 1 FROM accounts WHERE organization_id = ?
                    UNION ALL SELECT 1 FROM fiscal_years WHERE organization_id = ?
                    UNION ALL SELECT 1 FROM a_rep_code report
                        JOIN organizations organization ON organization.code = report.company_code
                        WHERE organization.id = ?
                )
                """, Boolean.class, companyId, companyId, companyId, companyId));
        if (hasAccountingData) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This company contains accounting data and cannot be deleted");
        }
        jdbc.update("UPDATE user_profiles SET assigned_organization_id = NULL WHERE assigned_organization_id = ?", companyId);
        jdbc.update("DELETE FROM membership_branches WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM membership_roles WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM role_permissions WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM organization_memberships WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM roles WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM component_codes WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM finance_codes WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM project_codes WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM branches WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM audit_events WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM outbox_events WHERE organization_id = ?", companyId);
        jdbc.update("DELETE FROM organizations WHERE id = ?", companyId);
    }

    private Company find(UUID companyId) {
        var rows = jdbc.query("SELECT " + SELECT_COLUMNS + " FROM organizations organization WHERE organization.id = ?",
                (rs, rowNum) -> company(rs), companyId);
        if (rows.isEmpty()) throw notFound("Company");
        return rows.getFirst();
    }

    private void validateReferenceData(String currencyCode, String timezone) {
        try {
            ZoneId.of(timezone.strip());
        } catch (Exception exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Timezone is invalid");
        }
        var currencyExists = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM currencies WHERE code = ?)",
                Boolean.class, currencyCode.strip().toUpperCase(Locale.ROOT));
        if (!Boolean.TRUE.equals(currencyExists)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Base currency is not supported");
        }
    }

    private void audit(UUID companyId, UUID actorId, String action, UUID entityId) {
        jdbc.update("""
                INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
                VALUES (?, ?, ?, 'COMPANY', ?)
                """, companyId, actorId, action, entityId.toString());
    }

    private ResponseStatusException optimisticConflict(String resource, UUID id) {
        var exists = Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM organizations WHERE id = ?)", Boolean.class, id));
        return exists
                ? new ResponseStatusException(HttpStatus.CONFLICT, resource + " was changed by another user; reload and try again")
                : notFound(resource);
    }

    private static Company company(ResultSet rs) throws SQLException {
        return new Company(rs.getObject("id", UUID.class), rs.getString("code"), rs.getString("legal_name"),
                rs.getString("trading_name"), rs.getString("registration_number"), rs.getString("tax_identifier"),
                rs.getString("base_currency_code"), rs.getString("timezone"), rs.getString("locale"),
                rs.getString("country_code"), rs.getString("address_line_1"), rs.getString("address_line_2"),
                rs.getString("city"), rs.getString("state_province"), rs.getString("postal_code"),
                rs.getString("email"), rs.getString("phone"), rs.getString("website"), rs.getString("status"),
                instant(rs.getTimestamp("created_at")), instant(rs.getTimestamp("updated_at")), rs.getLong("version"));
    }

    private static CompanyResponse response(Company company) {
        return new CompanyResponse(company.id(), company.code(), company.legalName(), company.tradingName(),
                company.registrationNumber(), company.taxIdentifier(), company.baseCurrencyCode(), company.timezone(),
                company.locale(), company.countryCode(), company.addressLine1(), company.addressLine2(), company.city(),
                company.stateProvince(), company.postalCode(), company.email(), company.phone(), company.website(),
                company.status(), company.createdAt(), company.updatedAt(), company.version());
    }

    private static String status(String value) {
        var normalized = value.strip().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status must be ACTIVE, SUSPENDED, or CLOSED");
        }
        return normalized;
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

    private static ResponseStatusException notFound(String resource) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, resource + " was not found");
    }
}
