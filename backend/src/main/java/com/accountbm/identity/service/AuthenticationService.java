package com.accountbm.identity.service;

import static com.accountbm.identity.dto.IdentityDtos.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthenticationService {
    private static final Logger log = LoggerFactory.getLogger(AuthenticationService.class);
    private static final String DUMMY_HASH = "$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final long refreshTokenDays;

    public AuthenticationService(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            @Value("${app.jwt.refresh-token-days}") long refreshTokenDays) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.refreshTokenDays = refreshTokenDays;
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public TokenResponse login(LoginRequest request, String ipAddress, String userAgent) {
        var email = request.email().strip().toLowerCase(Locale.ROOT);
        var user = findByEmail(email);
        if (user == null) {
            passwordEncoder.matches(request.password(), DUMMY_HASH);
            log.warn("Login rejected: account does not exist email={} ip={}", email, ipAddress);
            throw unauthorized();
        }
        if (!"ACTIVE".equals(user.status())) {
            log.warn("Login rejected: account is not active userId={} status={} ip={}", user.id(), user.status(), ipAddress);
            throw unauthorized();
        }
        if (user.lockedUntil() != null && user.lockedUntil().isAfter(Instant.now())) {
            log.warn("Login rejected: account is temporarily locked userId={} lockedUntil={} ip={}", user.id(), user.lockedUntil(), ipAddress);
            throw unauthorized();
        }
        if (user.passwordHash() == null || !passwordEncoder.matches(request.password(), user.passwordHash())) {
            recordFailure(user.id(), user.failedAttempts());
            log.warn("Login rejected: password mismatch userId={} failedAttempt={} ip={}", user.id(), user.failedAttempts() + 1, ipAddress);
            throw unauthorized();
        }

        jdbc.update("UPDATE user_profiles SET failed_login_attempts = 0, locked_until = NULL, last_login_at = clock_timestamp(), updated_at = clock_timestamp() WHERE id = ?", user.id());
        var currentUser = loadCurrentUser(user.id());
        audit(user.id(), "AUTH_LOGIN", ipAddress);
        log.info("Login succeeded userId={} ip={}", user.id(), ipAddress);
        return issueTokens(currentUser, ipAddress, userAgent, null);
    }

    @Transactional
    public TokenResponse refresh(String rawToken, String ipAddress, String userAgent) {
        var rows = jdbc.query("""
                SELECT token.id, token.user_id
                FROM refresh_tokens token
                JOIN user_profiles user_profile ON user_profile.id = token.user_id
                WHERE token.token_hash = ? AND token.revoked_at IS NULL
                  AND token.expires_at > clock_timestamp() AND user_profile.status = 'ACTIVE'
                FOR UPDATE
                """, (rs, rowNum) -> new RefreshRow(rs.getObject("id", UUID.class), rs.getObject("user_id", UUID.class)), hash(rawToken));
        if (rows.isEmpty()) {
            log.warn("Refresh rejected: token is invalid, expired, or revoked ip={}", ipAddress);
            throw unauthorized();
        }

        var oldToken = rows.getFirst();
        var currentUser = loadCurrentUser(oldToken.userId());
        var response = issueTokens(currentUser, ipAddress, userAgent, oldToken.id());
        audit(oldToken.userId(), "AUTH_REFRESH", ipAddress);
        return response;
    }

    @Transactional
    public void logout(String rawToken) {
        jdbc.update("UPDATE refresh_tokens SET revoked_at = coalesce(revoked_at, clock_timestamp()) WHERE token_hash = ?", hash(rawToken));
    }

    @Transactional(readOnly = true)
    public CurrentUser currentUser(UUID id) {
        return loadCurrentUser(id);
    }

    private TokenResponse issueTokens(CurrentUser user, String ipAddress, String userAgent, UUID replacedTokenId) {
        var access = jwtTokenService.issue(user);
        var rawRefreshToken = randomToken();
        var refreshId = jdbc.queryForObject("""
                INSERT INTO refresh_tokens (user_id, token_hash, expires_at, created_ip, user_agent)
                VALUES (?, ?, ?, cast(? as inet), ?) RETURNING id
                """, UUID.class, user.id(), hash(rawRefreshToken), Timestamp.from(Instant.now().plus(refreshTokenDays, ChronoUnit.DAYS)),
                blankToNull(ipAddress), trim(userAgent, 500));
        if (replacedTokenId != null) {
            jdbc.update("UPDATE refresh_tokens SET revoked_at = clock_timestamp(), replaced_by_token_id = ? WHERE id = ?", refreshId, replacedTokenId);
        }
        return new TokenResponse(access.value(), rawRefreshToken, access.expiresInSeconds(), user);
    }

    private CurrentUser loadCurrentUser(UUID userId) {
        var users = jdbc.query("SELECT id, email, display_name, super_admin FROM user_profiles WHERE id = ? AND status = 'ACTIVE'",
                (rs, rowNum) -> new CurrentUserBase(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("display_name"), rs.getBoolean("super_admin")), userId);
        if (users.isEmpty()) throw unauthorized();
        var user = users.getFirst();

        var memberships = new LinkedHashMap<UUID, OrganizationAccessBuilder>();
        jdbc.query("""
                SELECT organization.id, organization.code, organization.legal_name, role.code AS role_code
                FROM organization_memberships membership
                JOIN organizations organization ON organization.id = membership.organization_id
                JOIN user_profiles assigned_user ON assigned_user.id = membership.user_id
                LEFT JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                LEFT JOIN roles role ON role.id = membership_role.role_id
                WHERE membership.user_id = ? AND membership.status = 'ACTIVE' AND organization.status = 'ACTIVE'
                  AND membership.organization_id = assigned_user.assigned_organization_id
                ORDER BY organization.legal_name, role.name
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> {
            var organizationId = rs.getObject("id", UUID.class);
            var organizationCode = rs.getString("code");
            var organizationName = rs.getString("legal_name");
            var item = memberships.computeIfAbsent(organizationId, ignored -> new OrganizationAccessBuilder(
                    organizationId, organizationCode, organizationName));
            var roleCode = rs.getString("role_code");
            if (roleCode != null) item.roles.add(roleCode);
        }, userId);

        memberships.values().forEach(item -> jdbc.query("""
                SELECT branch.id, branch.code, branch.name, branch.branch_type
                FROM organization_memberships membership
                JOIN membership_branches membership_branch ON membership_branch.membership_id = membership.id
                JOIN branches branch ON branch.id = membership_branch.branch_id
                  AND branch.organization_id = membership_branch.organization_id
                WHERE membership.user_id = ? AND membership.organization_id = ?
                  AND membership.status = 'ACTIVE' AND branch.status = 'ACTIVE'
                ORDER BY branch.name
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> item.branches.add(new BranchSummary(
                rs.getObject("id", UUID.class), rs.getString("code"), rs.getString("name"), rs.getString("branch_type"))),
                userId, item.id));

        var permissions = new LinkedHashSet<String>();
        jdbc.query("""
                SELECT DISTINCT role_permission.permission_code
                FROM organization_memberships membership
                JOIN user_profiles assigned_user ON assigned_user.id = membership.user_id
                JOIN membership_roles membership_role ON membership_role.membership_id = membership.id
                JOIN role_permissions role_permission ON role_permission.role_id = membership_role.role_id
                WHERE membership.user_id = ? AND membership.status = 'ACTIVE'
                  AND membership.organization_id = assigned_user.assigned_organization_id
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> permissions.add(rs.getString(1)), userId);

        return new CurrentUser(user.id(), user.email(), user.displayName(), user.superAdmin(), permissions,
                memberships.values().stream().map(OrganizationAccessBuilder::build).toList());
    }

    private UserLoginRow findByEmail(String email) {
        var rows = jdbc.query("""
                SELECT id, password_hash, status, failed_login_attempts, locked_until
                FROM user_profiles WHERE lower(email) = ?
                """, (rs, rowNum) -> new UserLoginRow(
                rs.getObject("id", UUID.class), rs.getString("password_hash"), rs.getString("status"),
                rs.getInt("failed_login_attempts"), rs.getTimestamp("locked_until") == null ? null : rs.getTimestamp("locked_until").toInstant()), email);
        return rows.isEmpty() ? null : rows.getFirst();
    }

    private void recordFailure(UUID userId, int currentFailures) {
        var next = currentFailures + 1;
        jdbc.update("""
                UPDATE user_profiles SET failed_login_attempts = ?,
                    locked_until = CASE WHEN ? >= 5 THEN clock_timestamp() + interval '15 minutes' ELSE locked_until END,
                    updated_at = clock_timestamp() WHERE id = ?
                """, next, next, userId);
    }

    private void audit(UUID userId, String action, String ipAddress) {
        jdbc.update("""
                INSERT INTO audit_events (actor_user_id, action, entity_type, entity_id, ip_address)
                VALUES (?, ?, 'USER_SESSION', ?, cast(? as inet))
                """, userId, action, userId.toString(), blankToNull(ipAddress));
    }

    private String randomToken() {
        var bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String hash(String value) {
        try {
            var bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static ResponseStatusException unauthorized() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email, password, or session");
    }

    private static String trim(String value, int maxLength) {
        if (value == null) return null;
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private record UserLoginRow(UUID id, String passwordHash, String status, int failedAttempts, Instant lockedUntil) {}
    private record CurrentUserBase(UUID id, String email, String displayName, boolean superAdmin) {}
    private record RefreshRow(UUID id, UUID userId) {}

    private static final class OrganizationAccessBuilder {
        private final UUID id;
        private final String code;
        private final String name;
        private final List<String> roles = new ArrayList<>();
        private final List<BranchSummary> branches = new ArrayList<>();

        private OrganizationAccessBuilder(UUID id, String code, String name) {
            this.id = id;
            this.code = code;
            this.name = name;
        }

        private OrganizationAccess build() {
            return new OrganizationAccess(id, code, name, List.copyOf(roles), List.copyOf(branches));
        }
    }
}
