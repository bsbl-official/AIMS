package com.accountbm.financialyear.service;

import static com.accountbm.financialyear.dto.FinancialYearDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Month;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.accountbm.organization.service.OrganizationAccessService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FinancialYearService {
    private final JdbcTemplate jdbc;
    private final OrganizationAccessService access;

    public FinancialYearService(JdbcTemplate jdbc, OrganizationAccessService access) {
        this.jdbc = jdbc;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<FinancialPeriodResponse> periods(UUID companyId, UUID actorId) {
        access.requireCompanyAdministrator(actorId, companyId);
        return findAll(companyId);
    }

    @Transactional
    public List<FinancialPeriodResponse> update(UUID companyId, SaveFinancialYearRequest request, UUID actorId) {
        access.requireCompanyAdministrator(actorId, companyId);
        for (int period = 1; period <= 12; period++) {
            int month = ((request.startMonth() + period - 2) % 12) + 1;
            int quarter = ((period - 1) / 3) + 1;
            String monthName = Month.of(month).getDisplayName(TextStyle.SHORT, Locale.ENGLISH);
            jdbc.update("""
                    INSERT INTO a_period
                        (organization_id, period, month, month_name, quarter, ins_user)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT (organization_id, period) DO UPDATE SET
                        month = EXCLUDED.month,
                        month_name = EXCLUDED.month_name,
                        quarter = EXCLUDED.quarter,
                        upd_user = EXCLUDED.ins_user,
                        upd_date = clock_timestamp()
                    """, companyId, period, month, monthName, quarter, actorId.toString());
        }
        jdbc.update("""
                INSERT INTO audit_events (organization_id, actor_user_id, action, entity_type, entity_id)
                VALUES (?, ?, 'FINANCIAL_YEAR_UPDATED', 'FINANCIAL_YEAR', ?)
                """, companyId, actorId, companyId.toString());
        return findAll(companyId);
    }

    private List<FinancialPeriodResponse> findAll(UUID companyId) {
        return jdbc.query("SELECT * FROM a_period WHERE organization_id = ? ORDER BY period",
                (rs, rowNum) -> map(rs), companyId);
    }

    private static FinancialPeriodResponse map(ResultSet rs) throws SQLException {
        return new FinancialPeriodResponse(
                rs.getObject("organization_id", UUID.class),
                rs.getInt("period"),
                rs.getInt("month"),
                rs.getString("month_name"),
                rs.getInt("quarter"),
                rs.getString("ins_user"),
                instant(rs.getTimestamp("ins_date")),
                rs.getString("upd_user"),
                instant(rs.getTimestamp("upd_date")));
    }

    private static java.time.Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }
}
