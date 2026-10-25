package com.accountbm.coa.service;

import static com.accountbm.coa.dto.ChartOfAccountDtos.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.accountbm.coa.model.ChartOfAccount;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChartOfAccountService {
    private final JdbcTemplate jdbc;

    public ChartOfAccountService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public List<ChartOfAccountResponse> chartOfAccounts() {
        return jdbc.query("SELECT * FROM a_coa ORDER BY coa_id", (rs, rowNum) -> response(map(rs)));
    }

    @Transactional(readOnly = true)
    public ChartOfAccountResponse chartOfAccount(Long coaId) {
        return response(find(coaId));
    }

    @Transactional
    public ChartOfAccountResponse create(CreateChartOfAccountRequest request, UUID actorId) {
        var coaId = request.coaId();
        try {
            jdbc.update("""
                    INSERT INTO a_coa (coa_id, coa_desc, ins_user, ins_date, device_flage)
                    VALUES (?, ?, ?, clock_timestamp(), ?)
                    """, coaId, request.description().strip(), actorId.toString(), flag(request.deviceFlag()));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A COA entry with this ID already exists");
        }
        return response(find(coaId));
    }

    @Transactional
    public ChartOfAccountResponse update(Long coaId, UpdateChartOfAccountRequest request, UUID actorId) {
        var updated = jdbc.update("""
                UPDATE a_coa
                SET coa_desc = ?, device_flage = ?, upd_user = ?, upd_date = clock_timestamp()
                WHERE coa_id = ?
                """, request.description().strip(), flag(request.deviceFlag()), actorId.toString(), coaId);
        if (updated == 0) throw notFound();
        return response(find(coaId));
    }

    private ChartOfAccount find(Long coaId) {
        var rows = jdbc.query("SELECT * FROM a_coa WHERE coa_id = ?", (rs, rowNum) -> map(rs), coaId);
        if (rows.isEmpty()) throw notFound();
        return rows.getFirst();
    }

    private static ChartOfAccount map(ResultSet rs) throws SQLException {
        return new ChartOfAccount(
                rs.getLong("coa_id"), rs.getString("coa_desc"), rs.getString("ins_user"),
                instant(rs.getTimestamp("ins_date")), rs.getString("upd_user"),
                instant(rs.getTimestamp("upd_date")), rs.getString("device_flage"));
    }

    private static ChartOfAccountResponse response(ChartOfAccount item) {
        return new ChartOfAccountResponse(item.coaId(), item.description(), item.insertedBy(), item.insertedAt(),
                item.updatedBy(), item.updatedAt(), item.deviceFlag());
    }

    private static String flag(String value) {
        return value.strip().toUpperCase(Locale.ROOT);
    }

    private static Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "COA entry was not found");
    }
}
