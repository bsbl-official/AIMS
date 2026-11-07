package com.accountbm.vouchersetup.service;

import static com.accountbm.vouchersetup.dto.VoucherSetupDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class VoucherSetupService {
    private static final Set<String> CLASSES = Set.of("DEBIT", "CREDIT", "JOURNAL");
    private static final Set<String> TYPES = Set.of("BCR", "CCR", "BDR", "CDR", "JJV");
    private static final Set<String> DOCUMENT_TYPE_VALUES = Set.of("BANK", "CASH", "OTHERS");
    private static final Map<String, String> VOUCHER_DESCRIPTIONS = Map.of(
            "CREDIT:BCR", "BANK CREDIT VOUCHER",
            "CREDIT:CCR", "CASH CREDIT VOUCHER",
            "DEBIT:BDR", "BANK DEBIT VOUCHER",
            "DEBIT:CDR", "CASH DEBIT VOUCHER",
            "JOURNAL:JJV", "JOURNAL VOUCHER"
    );
    private static final String SELECT = """
            SELECT voucher.id, voucher.organization_id, voucher.branch_id, branch.code branch_code, branch.name branch_name,
                   voucher.project_code_id, project.name project_name, voucher.finance_code_id, finance.name finance_name,
                   voucher.component_code_id, component.name component_name, voucher.coa_id, coa.coa_desc,
                   voucher.voucher_class, voucher.voucher_type, voucher.voucher_description, voucher.document_type,
                   voucher.auto_voucher, voucher.voucher_last_no,
                   voucher.ins_user, voucher.ins_date, voucher.upd_user, voucher.upd_date, voucher.version
            FROM a_vr_type voucher
            JOIN branches branch ON branch.organization_id = voucher.organization_id AND branch.id = voucher.branch_id
            JOIN project_codes project ON project.organization_id = voucher.organization_id AND project.id = voucher.project_code_id
            JOIN finance_codes finance ON finance.organization_id = voucher.organization_id AND finance.id = voucher.finance_code_id
            JOIN component_codes component ON component.organization_id = voucher.organization_id AND component.id = voucher.component_code_id
            JOIN a_coa coa ON coa.coa_id = voucher.coa_id
            """;
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public VoucherSetupService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<VoucherSetupResponse> list(UUID companyId, UUID actor) {
        require(actor, companyId, false);
        return jdbc.query(SELECT + " WHERE voucher.organization_id = ? ORDER BY branch.code, project.id, finance.id, component.id, voucher.coa_id, voucher.voucher_class, voucher.voucher_type",
                (rs, rowNum) -> response(rs), companyId);
    }

    @Transactional(readOnly = true)
    public VoucherSetupOptions options(UUID companyId, UUID actor) {
        require(actor, companyId, false);
        var branches = jdbc.query("SELECT id, code, name FROM branches WHERE organization_id = ? AND status = 'ACTIVE' ORDER BY code",
                (rs, rowNum) -> new BranchOption(rs.getObject("id", UUID.class), rs.getString("code"), rs.getString("name")), companyId);
        var projects = jdbc.query("SELECT id, name FROM project_codes WHERE organization_id = ? AND status = 'ACTIVE' ORDER BY id",
                (rs, rowNum) -> new ProjectOption(rs.getInt("id"), rs.getString("name")), companyId);
        var finances = jdbc.query("SELECT id, project_code_id, name FROM finance_codes WHERE organization_id = ? AND status = 'ACTIVE' ORDER BY project_code_id, id",
                (rs, rowNum) -> new FinanceOption(rs.getInt("id"), rs.getInt("project_code_id"), rs.getString("name")), companyId);
        var components = jdbc.query("SELECT id, project_code_id, finance_code_id, name FROM component_codes WHERE organization_id = ? AND status = 'ACTIVE' ORDER BY project_code_id, finance_code_id, id",
                (rs, rowNum) -> new ComponentOption(rs.getInt("id"), rs.getInt("project_code_id"), rs.getInt("finance_code_id"), rs.getString("name")), companyId);
        var coas = jdbc.query("SELECT coa_id, coa_desc FROM a_coa ORDER BY coa_id",
                (rs, rowNum) -> new CoaOption(rs.getLong("coa_id"), rs.getString("coa_desc")));
        return new VoucherSetupOptions(branches, projects, finances, components, coas);
    }

    @Transactional
    public List<VoucherSetupResponse> create(UUID companyId, CreateVoucherSetupRequest request, UUID actor) {
        require(actor, companyId, true);
        var context = context(companyId, request.branchId(), request.projectCodeId(), request.financeCodeId(), request.componentCodeId(), request.coaId());
        var combinations = new HashSet<String>();
        for (var voucher : request.vouchers()) {
            String voucherClass = voucherClass(voucher.voucherClass()), voucherType = voucherType(voucher.voucherType());
            if (!combinations.add(voucherClass + ":" + voucherType)) throw bad("Each Voucher Class and Voucher Type combination can only be added once");
            try {
                jdbc.update("""
                        INSERT INTO a_vr_type (
                            organization_id, branch_id, project_code_id, finance_code_id, component_code_id, coa_id,
                            company_code, company_branch_code, project_code, finance_code, component_code,
                            voucher_class, voucher_type, voucher_description, document_type, ins_user
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, companyId, request.branchId(), request.projectCodeId(), request.financeCodeId(),
                        request.componentCodeId(), request.coaId(), context.companyCode(), context.branchCode(),
                        request.projectCodeId().toString(), request.financeCodeId().toString(), request.componentCodeId().toString(),
                        voucherClass, voucherType, voucherDescription(voucherClass, voucherType), documentType(voucher.documentType()), actor.toString());
            } catch (DataIntegrityViolationException exception) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "This voucher setup already exists for the selected context");
            }
        }
        audit(companyId, actor, "VOUCHER_SETUP_CREATED", request.branchId().toString());
        return list(companyId, actor).stream().filter(item -> item.branchId().equals(request.branchId())
                && item.projectCodeId().equals(request.projectCodeId()) && item.financeCodeId().equals(request.financeCodeId())
                && item.componentCodeId().equals(request.componentCodeId()) && item.coaId().equals(request.coaId())).toList();
    }

    @Transactional
    public VoucherSetupResponse update(UUID companyId, UUID id, UpdateVoucherSetupRequest request, UUID actor) {
        require(actor, companyId, true);
        if (usedByVoucher(companyId, id)) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Voucher setup context and type cannot be changed after vouchers have been created");
        var context = context(companyId, request.branchId(), request.projectCodeId(), request.financeCodeId(), request.componentCodeId(), request.coaId());
        try {
            int updated = jdbc.update("""
                    UPDATE a_vr_type SET branch_id = ?, project_code_id = ?, finance_code_id = ?, component_code_id = ?, coa_id = ?,
                        company_branch_code = ?, project_code = ?, finance_code = ?, component_code = ?,
                        voucher_class = ?, voucher_type = ?, voucher_description = ?, document_type = ?,
                        upd_user = ?, upd_date = clock_timestamp(), version = version + 1
                    WHERE organization_id = ? AND id = ? AND version = ?
                    """, request.branchId(), request.projectCodeId(), request.financeCodeId(), request.componentCodeId(), request.coaId(),
                    context.branchCode(), request.projectCodeId().toString(), request.financeCodeId().toString(), request.componentCodeId().toString(),
                    voucherClass(request.voucherClass()), voucherType(request.voucherType()),
                    voucherDescription(voucherClass(request.voucherClass()), voucherType(request.voucherType())),
                    documentType(request.documentType()),
                    actor.toString(), companyId, id, request.version());
            if (updated == 0) throw conflictOrMissing(companyId, id);
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This Voucher Class and Voucher Type combination already exists");
        }
        audit(companyId, actor, "VOUCHER_SETUP_UPDATED", id.toString());
        return find(companyId, id);
    }

    @Transactional
    public VoucherSetupResponse updateControl(UUID companyId, UUID id, UpdateVoucherControlRequest request, UUID actor) {
        require(actor, companyId, true);
        int updated = jdbc.update("""
                UPDATE a_vr_type SET auto_voucher = ?, voucher_last_no = ?, voucher_last_date = CURRENT_DATE,
                    upd_user = ?, upd_date = clock_timestamp(), version = version + 1
                WHERE organization_id = ? AND id = ? AND version = ?
                """, request.autoVoucher(), request.voucherLastNo(), actor.toString(), companyId, id, request.version());
        if (updated == 0) throw conflictOrMissing(companyId, id);
        if (request.voucherLastNo() == 0) {
            jdbc.update("DELETE FROM a_voucher_daily_sequence WHERE voucher_setup_id = ? AND voucher_date = CURRENT_DATE", id);
        } else {
            jdbc.update("""
                    INSERT INTO a_voucher_daily_sequence (voucher_setup_id, voucher_date, last_number)
                    VALUES (?, CURRENT_DATE, ?)
                    ON CONFLICT (voucher_setup_id, voucher_date) DO UPDATE SET last_number = EXCLUDED.last_number
                    """, id, request.voucherLastNo());
        }
        audit(companyId, actor, "VOUCHER_CONTROL_UPDATED", id.toString());
        return find(companyId, id);
    }

    @Transactional
    public void delete(UUID companyId, UUID id, UUID actor) {
        require(actor, companyId, true);
        if (usedByVoucher(companyId, id)) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Voucher setup cannot be deleted after vouchers have been created");
        if (jdbc.update("DELETE FROM a_vr_type WHERE organization_id = ? AND id = ?", companyId, id) == 0) throw missing();
        audit(companyId, actor, "VOUCHER_SETUP_DELETED", id.toString());
    }

    private Context context(UUID companyId, UUID branchId, Integer projectId, Integer financeId, Integer componentId, Long coaId) {
        var rows = jdbc.query("""
                SELECT company.code company_code, branch.code branch_code
                FROM organizations company
                JOIN branches branch ON branch.organization_id = company.id AND branch.id = ? AND branch.status = 'ACTIVE'
                JOIN project_codes project ON project.organization_id = company.id AND project.id = ? AND project.status = 'ACTIVE'
                JOIN finance_codes finance ON finance.organization_id = company.id AND finance.project_code_id = project.id AND finance.id = ? AND finance.status = 'ACTIVE'
                JOIN component_codes component ON component.organization_id = company.id AND component.project_code_id = project.id AND component.finance_code_id = finance.id AND component.id = ? AND component.status = 'ACTIVE'
                JOIN a_coa coa ON coa.coa_id = ?
                WHERE company.id = ? AND company.status = 'ACTIVE'
                """, (rs, rowNum) -> new Context(rs.getString("company_code"), rs.getString("branch_code")),
                branchId, projectId, financeId, componentId, coaId, companyId);
        if (rows.isEmpty()) throw bad("Select an active branch, project, finance, component, and Initial COA from the same setup context");
        return rows.getFirst();
    }

    private VoucherSetupResponse find(UUID companyId, UUID id) {
        var rows = jdbc.query(SELECT + " WHERE voucher.organization_id = ? AND voucher.id = ?", (rs, rowNum) -> response(rs), companyId, id);
        if (rows.isEmpty()) throw missing();
        return rows.getFirst();
    }
    private boolean usedByVoucher(UUID companyId, UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM a_dr WHERE organization_id = ? AND voucher_setup_id = ?)
                    OR EXISTS(SELECT 1 FROM a_cr WHERE organization_id = ? AND voucher_setup_id = ?)
                    OR EXISTS(SELECT 1 FROM a_jv WHERE organization_id = ? AND voucher_setup_id = ?)
                """, Boolean.class, companyId, id, companyId, id, companyId, id));
    }

    private void require(UUID actor, UUID companyId, boolean write) {
        access.requireCompanyPermission(actor, companyId, write ? new String[]{"voucher_setup.manage"} : new String[]{"voucher_setup.read", "voucher_setup.manage"});
    }
    private void audit(UUID companyId, UUID actor, String action, String id) {
        jdbc.update("INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'VOUCHER_SETUP', ?)", companyId, actor, action, id);
    }
    private ResponseStatusException conflictOrMissing(UUID companyId, UUID id) {
        boolean exists = Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM a_vr_type WHERE organization_id = ? AND id = ?)", Boolean.class, companyId, id));
        return exists ? new ResponseStatusException(HttpStatus.CONFLICT, "Voucher setup was changed by another user; reload and try again") : missing();
    }
    private static VoucherSetupResponse response(ResultSet rs) throws SQLException {
        return new VoucherSetupResponse(rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                rs.getObject("branch_id", UUID.class), rs.getString("branch_code"), rs.getString("branch_name"),
                rs.getInt("project_code_id"), rs.getString("project_name"), rs.getInt("finance_code_id"),
                rs.getString("finance_name"), rs.getInt("component_code_id"), rs.getString("component_name"),
                rs.getLong("coa_id"), rs.getString("coa_desc"), rs.getString("voucher_class"),
                rs.getString("voucher_type"), rs.getString("voucher_description"), rs.getString("document_type"),
                rs.getBoolean("auto_voucher"), rs.getLong("voucher_last_no"), rs.getString("ins_user"),
                instant(rs.getTimestamp("ins_date")), rs.getString("upd_user"), instant(rs.getTimestamp("upd_date")), rs.getLong("version"));
    }
    private static String voucherClass(String value) { return enumValue(value, CLASSES, "Voucher Class"); }
    private static String voucherType(String value) { return enumValue(value, TYPES, "Voucher Type"); }
    private static String documentType(String value) { return enumValue(value, DOCUMENT_TYPE_VALUES, "Doc Type"); }
    private static String voucherDescription(String voucherClass, String voucherType) {
        String description = VOUCHER_DESCRIPTIONS.get(voucherClass + ":" + voucherType);
        if (description == null) throw bad("Select one of the approved Voucher Class and Voucher Type combinations");
        return description;
    }
    private static String enumValue(String value, Set<String> allowed, String label) {
        String normalized = value.strip().toUpperCase(Locale.ROOT);
        if (!allowed.contains(normalized)) throw bad(label + " is invalid");
        return normalized;
    }
    private static Instant instant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException missing() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Voucher setup was not found"); }
    private record Context(String companyCode, String branchCode) {}
}
