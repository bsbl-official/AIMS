package com.accountbm.identity.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import javax.crypto.SecretKey;

import com.accountbm.identity.dto.IdentityDtos.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;

@Service
public class JwtTokenService {
    private final JwtEncoder encoder;
    private final String issuer;
    private final String audience;
    private final Duration accessTokenLifetime;
    private final JdbcTemplate jdbc;

    public JwtTokenService(
            JwtEncoder encoder,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.audience}") String audience,
            JdbcTemplate jdbc,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes) {
        this.encoder = encoder;
        this.issuer = issuer;
        this.audience = audience;
        this.jdbc = jdbc;
        this.accessTokenLifetime = Duration.ofMinutes(accessTokenMinutes);
    }

    public AccessToken issue(CurrentUser user, UUID sessionFamilyId, Instant mfaVerifiedAt) {
        var now = Instant.now();
        var security = jdbc.queryForMap("SELECT security_version,mfa_enabled_at IS NOT NULL AS mfa FROM user_profiles WHERE id=?",user.id());
        var organization = user.organizations().isEmpty() ? null : user.organizations().getFirst();
        var claimsBuilder = JwtClaimsSet.builder()
                .issuer(issuer)
                .audience(List.of(audience))
                .id(UUID.randomUUID().toString())
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenLifetime))
                .subject(user.id().toString())
                .claim("email", user.email())
                .claim("name", user.displayName())
                .claim("super_admin", user.superAdmin())
                .claim("security_version", ((Number)security.get("security_version")).longValue())
                .claim("sid", sessionFamilyId.toString())
                .claim("mfa", Boolean.TRUE.equals(security.get("mfa")))
                .claim("permissions", user.superAdmin() ? List.of("*") : user.permissions())
                .claim("branch_ids", organization == null ? List.of() : organization.branches().stream()
                        .map(branch -> branch.id().toString()).toList());
        if (organization != null) {
            claimsBuilder.claim("organization_id", organization.organizationId().toString());
        }
        if (mfaVerifiedAt != null) claimsBuilder.claim("mfa_verified_at", mfaVerifiedAt);
        var claims = claimsBuilder.build();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        return new AccessToken(
                encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue(),
                accessTokenLifetime.toSeconds());
    }

    public record AccessToken(String value, long expiresInSeconds) {}
}
