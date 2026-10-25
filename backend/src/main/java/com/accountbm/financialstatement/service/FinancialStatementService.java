package com.accountbm.financialstatement.service;

import static com.accountbm.financialstatement.dto.FinancialStatementDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class FinancialStatementService {
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public FinancialStatementService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> hierarchy(UUID companyId, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId,
                "financial_statements.read", "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var normalizedCoa = defaultCoa();
        return jdbc.query("""
                SELECT report_code, report_desc, report_sum_label
                FROM a_rep_code
                WHERE company_code = ? AND coa_id = ?
                ORDER BY report_code
                """, (rs, rowNum) -> {
                    var report = report(rs);
                    return response(companyCode, normalizedCoa, report);
                }, companyCode, normalizedCoa);
    }

    @Transactional
    public ReportResponse createReport(UUID companyId, CreateReportRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var reportCode = code(request.reportCode());
        try {
            jdbc.update("""
                    INSERT INTO a_rep_code
                        (company_code, coa_id, report_code, report_desc, report_sum_label)
                    VALUES (?, ?, ?, ?, ?)
                    """, companyCode, coaId, reportCode, request.reportDescription().strip(),
                    blank(request.summaryLabel()));
        } catch (DataIntegrityViolationException exception) {
            throw conflict("A report with this code already exists for the selected company and COA");
        }
        audit(companyId, actorId, "FINANCIAL_REPORT_CREATED", key(coaId, reportCode));
        return response(companyCode, coaId, findReport(companyCode, coaId, reportCode));
    }

    @Transactional
    public GroupResponse createGroup(UUID companyId, CreateGroupRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var reportCode = code(request.reportCode());
        var groupCode = code(request.groupCode());
        findReport(companyCode, coaId, reportCode);
        try {
            jdbc.update("""
                    INSERT INTO a_rep_group
                        (company_code, coa_id, report_code, group_code, group_desc, group_sum_label)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """, companyCode, coaId, reportCode, groupCode,
                    request.groupDescription().strip(), blank(request.summaryLabel()));
        } catch (DataIntegrityViolationException exception) {
            throw conflict("A group with this code already exists under the selected report");
        }
        audit(companyId, actorId, "FINANCIAL_GROUP_CREATED", key(coaId, reportCode, groupCode));
        return response(companyCode, coaId, reportCode,
                findGroup(companyCode, coaId, reportCode, groupCode));
    }

    @Transactional
    public LayerResponse createLayer(UUID companyId, CreateLayerRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var reportCode = code(request.reportCode());
        var groupCode = code(request.groupCode());
        var layerCode = code(request.layerCode());
        findGroup(companyCode, coaId, reportCode, groupCode);
        try {
            jdbc.update("""
                    INSERT INTO a_rep_layer1
                        (company_code, coa_id, report_code, group_code, layer1_code,
                         layer1_desc, layer1_sum_label, layer1_sign)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, companyCode, coaId, reportCode, groupCode, layerCode,
                    request.layerDescription().strip(), blank(request.summaryLabel()), blank(request.sign()));
        } catch (DataIntegrityViolationException exception) {
            throw conflict("A layer with this code already exists under the selected group");
        }
        audit(companyId, actorId, "FINANCIAL_LAYER_CREATED", key(coaId, reportCode, groupCode, layerCode));
        return response(companyCode, coaId, reportCode, groupCode,
                findLayer(companyCode, coaId, reportCode, groupCode, layerCode));
    }

    @Transactional
    public SpecificationResponse createSpecification(
            UUID companyId, CreateSpecificationRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var reportCode = code(request.reportCode());
        var groupCode = code(request.groupCode());
        var layerCode = code(request.layerCode());
        var specificationCode = code(request.specificationCode());
        var report = findReport(companyCode, coaId, reportCode);
        var group = findGroup(companyCode, coaId, reportCode, groupCode);
        var layer = findLayer(companyCode, coaId, reportCode, groupCode, layerCode);
        try {
            jdbc.update("""
                    INSERT INTO a_rep_spec (
                        company_code, coa_id, report_type, report_code, report_desc, report_sum_label,
                        group_code, group_desc, group_sign, group_sum_label,
                        layer1_code, layer1_desc, layer1_sign, layer1_sum_label,
                        layer2_code, layer2_desc, layer2_sign, note_id, retain_earning_flag,
                        report_short, cf_flag, rp_flag, ratio_parameter, lq_cash_flag, savings_flag,
                        debt_flag, prn_paid_flag, sc_paid_flag, cur_asset_flag, cur_liability_flag,
                        split_figure_flag, combine_flag, ins_date, ins_user, layer2_code_dummy
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?, clock_timestamp(), ?, ?
                    )
                    """, companyCode, coaId, upper(request.reportType()), reportCode,
                    report.description(), report.summaryLabel(), groupCode, group.description(),
                    blank(request.groupSign()), group.summaryLabel(), layerCode, layer.description(),
                    layer.sign(), layer.summaryLabel(), specificationCode,
                    request.specificationDescription().strip(), blank(request.sign()), request.noteId(),
                    upper(request.retainEarningFlag()), upper(request.reportShort()), upper(request.cashFlowFlag()),
                    upper(request.receiptPaymentFlag()), blank(request.ratioParameter()),
                    upper(request.liquidCashFlag()), upper(request.savingsFlag()), upper(request.debtFlag()),
                    upper(request.principalPaidFlag()), upper(request.serviceChargePaidFlag()),
                    upper(request.currentAssetFlag()), upper(request.currentLiabilityFlag()),
                    upper(request.splitFigureFlag()), upper(request.combineFlag()), actorId.toString(),
                    codeOrNull(request.specificationCodeDummy()));
        } catch (DataIntegrityViolationException exception) {
            throw conflict("A specification with this code already exists under the selected layer");
        }
        audit(companyId, actorId, "FINANCIAL_SPECIFICATION_CREATED",
                key(coaId, reportCode, groupCode, layerCode, specificationCode));
        return findSpecification(companyCode, coaId, upper(request.reportType()), reportCode,
                groupCode, layerCode, specificationCode);
    }

    @Transactional
    public ReportResponse updateReport(UUID companyId, String reportCode, UpdateReportRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        requireUpdated(jdbc.update("""
                UPDATE a_rep_code SET report_desc = ?, report_sum_label = ?
                WHERE company_code = ? AND coa_id = ? AND report_code = ?
                """, request.reportDescription().strip(), blank(request.summaryLabel()),
                companyCode, coaId, normalizedReport), "Report");
        jdbc.update("""
                UPDATE a_rep_spec SET report_desc = ?, report_sum_label = ?, upd_date = clock_timestamp(), upd_user = ?
                WHERE company_code = ? AND coa_id = ? AND report_code = ?
                """, request.reportDescription().strip(), blank(request.summaryLabel()), actorId.toString(),
                companyCode, coaId, normalizedReport);
        audit(companyId, actorId, "FINANCIAL_REPORT_UPDATED", key(coaId, normalizedReport));
        return response(companyCode, coaId, findReport(companyCode, coaId, normalizedReport));
    }

    @Transactional
    public void deleteReport(UUID companyId, String reportCode, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        try {
            requireDeleted(jdbc.update("DELETE FROM a_rep_code WHERE company_code = ? AND coa_id = ? AND report_code = ?",
                    companyCode, coaId, normalizedReport), "Report");
        } catch (DataIntegrityViolationException exception) {
            throw conflict("Delete the report's group layers first");
        }
        audit(companyId, actorId, "FINANCIAL_REPORT_DELETED", key(coaId, normalizedReport));
    }

    @Transactional
    public GroupResponse updateGroup(UUID companyId, String reportCode, String groupCode,
            UpdateGroupRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        var normalizedGroup = code(groupCode);
        requireUpdated(jdbc.update("""
                UPDATE a_rep_group SET group_desc = ?, group_sum_label = ?
                WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ?
                """, request.groupDescription().strip(), blank(request.summaryLabel()),
                companyCode, coaId, normalizedReport, normalizedGroup), "Report group");
        jdbc.update("""
                UPDATE a_rep_spec SET group_desc = ?, group_sum_label = ?, upd_date = clock_timestamp(), upd_user = ?
                WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ?
                """, request.groupDescription().strip(), blank(request.summaryLabel()), actorId.toString(),
                companyCode, coaId, normalizedReport, normalizedGroup);
        audit(companyId, actorId, "FINANCIAL_GROUP_UPDATED", key(coaId, normalizedReport, normalizedGroup));
        return response(companyCode, coaId, normalizedReport,
                findGroup(companyCode, coaId, normalizedReport, normalizedGroup));
    }

    @Transactional
    public void deleteGroup(UUID companyId, String reportCode, String groupCode, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        var normalizedGroup = code(groupCode);
        try {
            requireDeleted(jdbc.update("""
                    DELETE FROM a_rep_group
                    WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ?
                    """, companyCode, coaId, normalizedReport, normalizedGroup), "Report group");
        } catch (DataIntegrityViolationException exception) {
            throw conflict("Delete the group's sub heads first");
        }
        audit(companyId, actorId, "FINANCIAL_GROUP_DELETED", key(coaId, normalizedReport, normalizedGroup));
    }

    @Transactional
    public LayerResponse updateLayer(UUID companyId, String reportCode, String groupCode, String layerCode,
            UpdateLayerRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        var normalizedGroup = code(groupCode);
        var normalizedLayer = code(layerCode);
        requireUpdated(jdbc.update("""
                UPDATE a_rep_layer1 SET layer1_desc = ?, layer1_sum_label = ?, layer1_sign = ?
                WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ? AND layer1_code = ?
                """, request.layerDescription().strip(), blank(request.summaryLabel()), blank(request.sign()),
                companyCode, coaId, normalizedReport, normalizedGroup, normalizedLayer), "Statement layer");
        jdbc.update("""
                UPDATE a_rep_spec SET layer1_desc = ?, layer1_sum_label = ?, layer1_sign = ?,
                    upd_date = clock_timestamp(), upd_user = ?
                WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ? AND layer1_code = ?
                """, request.layerDescription().strip(), blank(request.summaryLabel()), blank(request.sign()),
                actorId.toString(), companyCode, coaId, normalizedReport, normalizedGroup, normalizedLayer);
        audit(companyId, actorId, "FINANCIAL_LAYER_UPDATED", key(coaId, normalizedReport, normalizedGroup, normalizedLayer));
        return response(companyCode, coaId, normalizedReport, normalizedGroup,
                findLayer(companyCode, coaId, normalizedReport, normalizedGroup, normalizedLayer));
    }

    @Transactional
    public void deleteLayer(UUID companyId, String reportCode, String groupCode, String layerCode, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        var normalizedGroup = code(groupCode);
        var normalizedLayer = code(layerCode);
        try {
            requireDeleted(jdbc.update("""
                    DELETE FROM a_rep_layer1 WHERE company_code = ? AND coa_id = ? AND report_code = ?
                      AND group_code = ? AND layer1_code = ?
                    """, companyCode, coaId, normalizedReport, normalizedGroup, normalizedLayer), "Statement layer");
        } catch (DataIntegrityViolationException exception) {
            throw conflict("Delete the sub head's sub-sub heads first");
        }
        audit(companyId, actorId, "FINANCIAL_LAYER_DELETED", key(coaId, normalizedReport, normalizedGroup, normalizedLayer));
    }

    @Transactional
    public SpecificationResponse updateSpecification(UUID companyId, String reportCode, String groupCode,
            String layerCode, String reportType, String specificationCode,
            UpdateSpecificationRequest request, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        var normalizedGroup = code(groupCode);
        var normalizedLayer = code(layerCode);
        var normalizedType = code(reportType);
        var normalizedSpecification = code(specificationCode);
        requireUpdated(jdbc.update("""
                UPDATE a_rep_spec SET layer2_desc = ?, group_sign = ?, layer2_sign = ?, note_id = ?,
                    retain_earning_flag = ?, report_short = ?, cf_flag = ?, rp_flag = ?, ratio_parameter = ?,
                    lq_cash_flag = ?, savings_flag = ?, debt_flag = ?, prn_paid_flag = ?, sc_paid_flag = ?,
                    cur_asset_flag = ?, cur_liability_flag = ?, split_figure_flag = ?, combine_flag = ?,
                    layer2_code_dummy = ?, upd_date = clock_timestamp(), upd_user = ?
                WHERE company_code = ? AND coa_id = ? AND report_type = ? AND report_code = ?
                  AND group_code = ? AND layer1_code = ? AND layer2_code = ?
                """, request.specificationDescription().strip(), blank(request.groupSign()), blank(request.sign()),
                request.noteId(), upper(request.retainEarningFlag()), upper(request.reportShort()),
                upper(request.cashFlowFlag()), upper(request.receiptPaymentFlag()), blank(request.ratioParameter()),
                upper(request.liquidCashFlag()), upper(request.savingsFlag()), upper(request.debtFlag()),
                upper(request.principalPaidFlag()), upper(request.serviceChargePaidFlag()),
                upper(request.currentAssetFlag()), upper(request.currentLiabilityFlag()),
                upper(request.splitFigureFlag()), upper(request.combineFlag()), codeOrNull(request.specificationCodeDummy()),
                actorId.toString(), companyCode, coaId, normalizedType, normalizedReport, normalizedGroup,
                normalizedLayer, normalizedSpecification), "Statement specification");
        audit(companyId, actorId, "FINANCIAL_SPECIFICATION_UPDATED",
                key(coaId, normalizedReport, normalizedGroup, normalizedLayer, normalizedSpecification));
        return findSpecification(companyCode, coaId, normalizedType, normalizedReport,
                normalizedGroup, normalizedLayer, normalizedSpecification);
    }

    @Transactional
    public void deleteSpecification(UUID companyId, String reportCode, String groupCode, String layerCode,
            String reportType, String specificationCode, UUID actorId) {
        access.requireCompanyPermission(actorId, companyId, "financial_statements.manage");
        var companyCode = companyCode(companyId);
        var coaId = defaultCoa();
        var normalizedReport = code(reportCode);
        var normalizedGroup = code(groupCode);
        var normalizedLayer = code(layerCode);
        var normalizedType = code(reportType);
        var normalizedSpecification = code(specificationCode);
        requireDeleted(jdbc.update("""
                DELETE FROM a_rep_spec WHERE company_code = ? AND coa_id = ? AND report_type = ?
                  AND report_code = ? AND group_code = ? AND layer1_code = ? AND layer2_code = ?
                """, companyCode, coaId, normalizedType, normalizedReport, normalizedGroup,
                normalizedLayer, normalizedSpecification), "Statement specification");
        audit(companyId, actorId, "FINANCIAL_SPECIFICATION_DELETED",
                key(coaId, normalizedReport, normalizedGroup, normalizedLayer, normalizedSpecification));
    }

    private ReportResponse response(String companyCode, Long coaId, ReportRow report) {
        var groups = jdbc.query("""
                SELECT group_code, group_desc, group_sum_label FROM a_rep_group
                WHERE company_code = ? AND coa_id = ? AND report_code = ? ORDER BY group_code
                """, (rs, rowNum) -> response(companyCode, coaId, report.code(), group(rs)),
                companyCode, coaId, report.code());
        return new ReportResponse(report.code(), report.description(), report.summaryLabel(), groups);
    }

    private GroupResponse response(String companyCode, Long coaId, String reportCode, GroupRow group) {
        var layers = jdbc.query("""
                SELECT layer1_code, layer1_desc, layer1_sum_label, layer1_sign FROM a_rep_layer1
                WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ?
                ORDER BY layer1_code
                """, (rs, rowNum) -> response(companyCode, coaId, reportCode, group.code(), layer(rs)),
                companyCode, coaId, reportCode, group.code());
        return new GroupResponse(group.code(), group.description(), group.summaryLabel(), layers);
    }

    private LayerResponse response(
            String companyCode, Long coaId, String reportCode, String groupCode, LayerRow layer) {
        var specifications = jdbc.query("""
                SELECT * FROM a_rep_spec
                WHERE company_code = ? AND coa_id = ? AND report_code = ?
                  AND group_code = ? AND layer1_code = ?
                ORDER BY report_type, layer2_code
                """, (rs, rowNum) -> specification(rs), companyCode, coaId, reportCode, groupCode, layer.code());
        return new LayerResponse(layer.code(), layer.description(), layer.summaryLabel(), layer.sign(), specifications);
    }

    private ReportRow findReport(String companyCode, Long coaId, String reportCode) {
        var rows = jdbc.query("""
                SELECT report_code, report_desc, report_sum_label FROM a_rep_code
                WHERE company_code = ? AND coa_id = ? AND report_code = ?
                """, (rs, rowNum) -> report(rs), companyCode, coaId, reportCode);
        if (rows.isEmpty()) throw notFound("Report");
        return rows.getFirst();
    }

    private GroupRow findGroup(String companyCode, Long coaId, String reportCode, String groupCode) {
        var rows = jdbc.query("""
                SELECT group_code, group_desc, group_sum_label FROM a_rep_group
                WHERE company_code = ? AND coa_id = ? AND report_code = ? AND group_code = ?
                """, (rs, rowNum) -> group(rs), companyCode, coaId, reportCode, groupCode);
        if (rows.isEmpty()) throw notFound("Report group");
        return rows.getFirst();
    }

    private LayerRow findLayer(
            String companyCode, Long coaId, String reportCode, String groupCode, String layerCode) {
        var rows = jdbc.query("""
                SELECT layer1_code, layer1_desc, layer1_sum_label, layer1_sign FROM a_rep_layer1
                WHERE company_code = ? AND coa_id = ? AND report_code = ?
                  AND group_code = ? AND layer1_code = ?
                """, (rs, rowNum) -> layer(rs), companyCode, coaId, reportCode, groupCode, layerCode);
        if (rows.isEmpty()) throw notFound("Statement layer");
        return rows.getFirst();
    }

    private SpecificationResponse findSpecification(
            String companyCode, Long coaId, String reportType, String reportCode, String groupCode,
            String layerCode, String specificationCode) {
        var rows = jdbc.query("""
                SELECT * FROM a_rep_spec
                WHERE company_code = ? AND coa_id = ? AND report_type = ?
                  AND report_code = ? AND group_code = ?
                  AND layer1_code = ? AND layer2_code = ?
                """, (rs, rowNum) -> specification(rs), companyCode, coaId, reportType, reportCode,
                groupCode, layerCode, specificationCode);
        if (rows.isEmpty()) throw notFound("Statement specification");
        return rows.getFirst();
    }

    private String companyCode(UUID companyId) {
        var rows = jdbc.query("SELECT code FROM organizations WHERE id = ?",
                (rs, rowNum) -> rs.getString(1), companyId);
        if (rows.isEmpty()) throw notFound("Company");
        return rows.getFirst();
    }

    private Long defaultCoa() {
        var rows = jdbc.query("SELECT coa_id FROM a_coa ORDER BY coa_id LIMIT 1",
                (rs, rowNum) -> rs.getLong(1));
        if (rows.isEmpty()) throw notFound("Default chart of accounts");
        return rows.getFirst();
    }

    private void audit(UUID companyId, UUID actorId, String action, String entityId) {
        jdbc.update("""
                INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
                VALUES (?, ?, ?, 'FINANCIAL_STATEMENT_SETUP', ?)
                """, companyId, actorId, action, entityId);
    }

    private static void requireUpdated(int affectedRows, String item) {
        if (affectedRows == 0) throw notFound(item);
    }

    private static void requireDeleted(int affectedRows, String item) {
        if (affectedRows == 0) throw notFound(item);
    }

    private static ReportRow report(ResultSet rs) throws SQLException {
        return new ReportRow(rs.getString("report_code"), rs.getString("report_desc"),
                rs.getString("report_sum_label"));
    }

    private static GroupRow group(ResultSet rs) throws SQLException {
        return new GroupRow(rs.getString("group_code"), rs.getString("group_desc"),
                rs.getString("group_sum_label"));
    }

    private static LayerRow layer(ResultSet rs) throws SQLException {
        return new LayerRow(rs.getString("layer1_code"), rs.getString("layer1_desc"),
                rs.getString("layer1_sum_label"), rs.getString("layer1_sign"));
    }

    private static SpecificationResponse specification(ResultSet rs) throws SQLException {
        return new SpecificationResponse(
                rs.getString("layer2_code"), rs.getString("layer2_desc"), rs.getString("report_type"),
                rs.getString("group_sign"), rs.getString("layer2_sign"), nullableLong(rs, "note_id"),
                rs.getString("retain_earning_flag"), rs.getString("report_short"), rs.getString("cf_flag"),
                rs.getString("rp_flag"), rs.getString("ratio_parameter"), rs.getString("lq_cash_flag"),
                rs.getString("savings_flag"), rs.getString("debt_flag"), rs.getString("prn_paid_flag"),
                rs.getString("sc_paid_flag"), rs.getString("cur_asset_flag"),
                rs.getString("cur_liability_flag"), rs.getString("split_figure_flag"),
                rs.getString("combine_flag"), rs.getString("layer2_code_dummy"), rs.getString("ins_user"),
                instant(rs.getTimestamp("ins_date")), rs.getString("upd_user"),
                instant(rs.getTimestamp("upd_date")));
    }

    private static String code(String value) {
        return value.strip().toUpperCase(Locale.ROOT);
    }

    private static String codeOrNull(String value) {
        return value == null || value.isBlank() ? null : code(value);
    }

    private static String upper(String value) {
        return value == null || value.isBlank() ? null : code(value);
    }

    private static String blank(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }

    private static String key(Object... parts) {
        return java.util.Arrays.stream(parts).map(String::valueOf).collect(java.util.stream.Collectors.joining("/"));
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static ResponseStatusException notFound(String item) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, item + " was not found");
    }

    private static Long nullableLong(ResultSet rs, String column) throws SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    private record ReportRow(String code, String description, String summaryLabel) {}
    private record GroupRow(String code, String description, String summaryLabel) {}
    private record LayerRow(String code, String description, String summaryLabel, String sign) {}
}
