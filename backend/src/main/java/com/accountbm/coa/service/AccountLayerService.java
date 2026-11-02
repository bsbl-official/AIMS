package com.accountbm.coa.service;

import com.accountbm.organization.service.OrganizationAccessService;
import java.sql.Date;
import java.util.*;
import java.util.stream.IntStream;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AccountLayerService {
    // SQL identifiers below are application constants, never request values.
    private static final List<String> TABLES = List.of("a_l1", "a_l2", "a_l3", "a_l4", "a_acc_head");
    private static final List<String> HEAD_FIELDS = List.of("bs_is_code", "creation_dt", "retain_earning_flag",
            "closing_stock_flag", "opening_stock_flag", "party_code", "rp_dr_code", "rp_cr_code", "cf_code",
            "ratio_indicator", "cg_opb_code", "cg_dr_code", "cg_cr_code", "cg_code", "bs_is_code1", "cf_dr_code",
            "cf_cr_code", "bv_code", "bs_is_dr_pk_code", "bs_is_cr_pk_code", "rp_dr_pk_code", "rp_cr_pk_code",
            "bv_dr_code", "bv_cr_code", "br_flag");
    private static final Map<String, List<String>> REPORT_FIELDS = Map.of(
            "bs_is_code", List.of("BS", "IS"), "bs_is_code1", List.of("BS", "IS"),
            "rp_dr_code", List.of("RP"), "rp_cr_code", List.of("RP"),
            "cf_code", List.of("CF"), "cf_dr_code", List.of("CF"), "cf_cr_code", List.of("CF"));
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public AccountLayerService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> list(UUID companyId, long coaId, int level, UUID actor) {
        String table = table(level), company = company(companyId, actor, false);
        requireCoa(coaId);
        return jdbc.queryForList("SELECT * FROM " + table + " WHERE company_code = ? AND coa_id = ? ORDER BY "
                + String.join(",", keys(level)), company, coaId).stream().map(AccountLayerService::response).toList();
    }

    @Transactional
    public Map<String, Object> save(UUID companyId, long coaId, int level, Map<String, Object> data,
            UUID actor, boolean update) {
        String table = table(level), company = company(companyId, actor, true);
        requireCoa(coaId);
        var keyValues = keyValues(level, data);
        var values = new LinkedHashMap<String, Object>();
        for (String field : fields(level)) values.put(field, fieldValue(data, field));
        if (values.get("acctype") != null && !List.of("L", "A", "I", "E").contains(values.get("acctype")))
            throw bad("Account type must be L, A, I, or E");
        if (values.get("accgroup") != null && !List.of("B", "C", "O").contains(values.get("accgroup")))
            throw bad("Account group must be B, C, or O");
        validateReferences(company, values);
        var scope = new ArrayList<Object>(List.of(company, coaId));
        scope.addAll(keyValues);
        try {
            if (update) {
                var assignments = new ArrayList<String>();
                values.keySet().forEach(f -> assignments.add(f + " = ?"));
                var args = new ArrayList<>(values.values());
                args.add(actor.toString());
                args.addAll(scope);
                int changed = jdbc.update("UPDATE " + table + " SET " + String.join(",", assignments)
                        + ", upd_user = ?, upd_date = CURRENT_TIMESTAMP WHERE " + where(level), args.toArray());
                if (changed == 0) throw missing("Account");
            } else {
                var columns = new ArrayList<>(List.of("company_code", "coa_id"));
                columns.addAll(keys(level));
                columns.addAll(values.keySet());
                columns.add("ins_user");
                var args = new ArrayList<>(scope);
                args.addAll(values.values());
                args.add(actor.toString());
                jdbc.update("INSERT INTO " + table + " (" + String.join(",", columns) + ",ins_date) VALUES ("
                        + String.join(",", Collections.nCopies(columns.size(), "?")) + ",CURRENT_TIMESTAMP)", args.toArray());
            }
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This code already exists or its parent account no longer exists");
        }
        audit(companyId, actor, update ? "COA_UPDATED" : "COA_CREATED", coaId, keyValues);
        return response(jdbc.queryForMap("SELECT * FROM " + table + " WHERE " + where(level), scope.toArray()));
    }

    @Transactional
    public void delete(UUID companyId, long coaId, int level, Map<String, Object> data, UUID actor) {
        String table = table(level), company = company(companyId, actor, true);
        var keyValues = keyValues(level, data);
        var args = new ArrayList<Object>(List.of(company, coaId));
        args.addAll(keyValues);
        try {
            if (jdbc.update("DELETE FROM " + table + " WHERE " + where(level), args.toArray()) == 0) throw missing("Account");
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Delete child accounts first");
        }
        audit(companyId, actor, "COA_DELETED", coaId, keyValues);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> reportOptions(UUID companyId, UUID actor) {
        String company = company(companyId, actor, false);
        // FinancialStatementService uses the first Initial COA for the company's report hierarchy.
        return jdbc.queryForList("""
                SELECT DISTINCT report_code, layer2_code, layer2_desc FROM a_rep_spec
                WHERE company_code = ? AND coa_id = (SELECT coa_id FROM a_coa ORDER BY coa_id LIMIT 1)
                  AND report_code IN ('IS','BS','RP','CF') ORDER BY report_code, layer2_code, layer2_desc
                """, company);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> categories(UUID companyId, UUID actor) {
        company(companyId, actor, false);
        return jdbc.queryForList("SELECT category_code, category_desc FROM category_info ORDER BY category_code");
    }

    @Transactional
    public Map<String, Object> createCategory(UUID companyId, Map<String, Object> data, UUID actor) {
        company(companyId, actor, true);
        String code = text(data, "category_code", 6), description = text(data, "category_desc", 100);
        if (code == null || description == null) throw bad("Category code and description are required");
        try {
            jdbc.update("INSERT INTO category_info (category_code, category_desc) VALUES (?, ?)", code, description);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category code already exists");
        }
        return Map.of("category_code", code, "category_desc", description);
    }

    private void validateReferences(String company, Map<String, Object> values) {
        for (var entry : REPORT_FIELDS.entrySet()) {
            Object code = values.get(entry.getKey());
            if (code == null) continue;
            var args = new ArrayList<Object>(List.of(company, code));
            args.addAll(entry.getValue());
            Boolean exists = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM a_rep_spec WHERE company_code = ?"
                    + " AND layer2_code = ? AND coa_id = (SELECT coa_id FROM a_coa ORDER BY coa_id LIMIT 1)"
                    + " AND report_code IN (" + String.join(",", Collections.nCopies(entry.getValue().size(), "?")) + "))",
                    Boolean.class, args.toArray());
            if (!Boolean.TRUE.equals(exists)) throw bad(entry.getKey() + " must reference a " + String.join("/", entry.getValue()) + " statement sub-sub head");
        }
        if (values.get("category_code") != null && !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM category_info WHERE category_code = ?)", Boolean.class, values.get("category_code"))))
            throw bad("Select an existing category");
    }

    private Object fieldValue(Map<String, Object> data, String field) {
        int max = field.endsWith("_desc") || field.equals("acchead") ? 100
                : field.equals("ratio_indicator") ? 20 : field.endsWith("_pk_code") ? 12
                : field.equals("category_code") || field.equals("party_code") ? 6
                : field.equals("acc_spl_group") ? 2 : field.equals("acctype") || field.equals("accgroup") || flag(field) ? 1 : 10;
        String value = text(data, field, max);
        if (flag(field)) {
            if (value == null) return "N";
            if (!List.of("Y", "N").contains(value)) throw bad(field + " must be Y or N");
        }
        if (field.equals("creation_dt") && value != null) {
            try { return Date.valueOf(java.time.LocalDate.parse(value)); }
            catch (RuntimeException e) { throw bad("Creation date must be a valid YYYY-MM-DD date"); }
        }
        return value;
    }

    private static boolean flag(String field) { return field.endsWith("_flag") || field.equals("device_flage"); }
    private static Map<String, Object> response(Map<String, Object> row) {
        if (row.get("creation_dt") instanceof Date date) row.put("creation_dt", date.toLocalDate().toString());
        return row;
    }
    private static String text(Map<String, Object> data, String field, int max) {
        Object raw = data.get(field);
        if (raw == null) return null;
        if (!(raw instanceof String)) throw bad(field + " must be text");
        String value = ((String) raw).strip();
        if (value.length() > max) throw bad(field + " must be at most " + max + " characters");
        return value.isEmpty() ? null : value;
    }

    private String company(UUID companyId, UUID actor, boolean write) {
        access.requireCompanyPermission(actor, companyId, write ? new String[]{"coa.manage"} : new String[]{"coa.read", "coa.manage"});
        var rows = jdbc.queryForList("SELECT code FROM organizations WHERE id = ?", String.class, companyId);
        if (rows.isEmpty()) throw missing("Company");
        return rows.getFirst();
    }
    private void requireCoa(long id) {
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM a_coa WHERE coa_id = ?)", Boolean.class, id)))
            throw missing("Initial COA");
    }
    private static String table(int level) {
        if (level < 1 || level > 5) throw bad("Layer must be between 1 and 5");
        return TABLES.get(level - 1);
    }
    private static List<String> keys(int level) { return IntStream.rangeClosed(1, level).mapToObj(i -> "l" + i + "_code").toList(); }
    private static List<Object> keyValues(int level, Map<String, Object> data) {
        var result = new ArrayList<Object>();
        for (int i = 1; i <= level; i++) {
            String field = "l" + i + "_code", value = text(data, field, i < 3 ? 6 : 10);
            if (value == null) throw bad(field + " is required");
            result.add(value);
        }
        return result;
    }
    private static String where(int level) { return "company_code = ? AND coa_id = ? AND " + String.join(" AND ", keys(level).stream().map(k -> k + " = ?").toList()); }
    private static List<String> fields(int level) {
        var result = new ArrayList<>(List.of(level == 5 ? "acchead" : "l" + level + "_desc", "acctype", "accgroup"));
        if (level < 5) result.add("device_flage");
        if (level == 2) result.add("category_code");
        if (level == 3) result.add("acc_spl_group");
        if (level == 5) result.addAll(HEAD_FIELDS);
        return result;
    }
    private void audit(UUID company, UUID actor, String action, long coa, List<Object> keys) {
        jdbc.update("INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id) VALUES (?, ?, ?, 'COA_SETUP', ?)",
                company, actor, action, coa + "/" + String.join("/", keys.stream().map(Object::toString).toList()));
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException missing(String name) { return new ResponseStatusException(HttpStatus.NOT_FOUND, name + " not found"); }
}
