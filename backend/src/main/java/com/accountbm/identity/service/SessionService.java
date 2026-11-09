package com.accountbm.identity.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SessionService {
    private final JdbcTemplate jdbc;

    public SessionService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(readOnly = true)
    public List<SessionView> list(UUID userId, String currentRefreshToken) {
        UUID currentFamily = null;
        if (currentRefreshToken != null) {
            var rows = jdbc.query("SELECT family_id FROM refresh_tokens WHERE token_hash=?",
                    (rs, n) -> rs.getObject(1, UUID.class), hash(currentRefreshToken));
            if (!rows.isEmpty()) currentFamily = rows.getFirst();
        }
        var selectedFamily = currentFamily;
        return jdbc.query("""
                SELECT DISTINCT ON (family_id) family_id, created_at, expires_at, created_ip, user_agent
                FROM refresh_tokens
                WHERE user_id=? AND revoked_at IS NULL AND expires_at>clock_timestamp()
                ORDER BY family_id, created_at DESC
                """, (rs, n) -> new SessionView(
                rs.getObject("family_id", UUID.class),
                rs.getTimestamp("created_at").toInstant(),
                rs.getTimestamp("expires_at").toInstant(),
                rs.getString("created_ip"), rs.getString("user_agent"),
                rs.getObject("family_id", UUID.class).equals(selectedFamily)), userId);
    }

    @Transactional
    public void revoke(UUID userId, UUID familyId) {
        var changed = jdbc.update("""
                UPDATE refresh_tokens SET revoked_at=coalesce(revoked_at,clock_timestamp())
                WHERE user_id=? AND family_id=? AND revoked_at IS NULL
                """, userId, familyId);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found");
        jdbc.update("""
                INSERT INTO security_events(user_id,event_type,metadata)
                VALUES(?,'SESSION_REVOKED',jsonb_build_object('familyId',?))
                """, userId, familyId.toString());
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public record SessionView(UUID id, Instant lastSeenAt, Instant expiresAt,
                              String ipAddress, String userAgent, boolean current) {}
}
