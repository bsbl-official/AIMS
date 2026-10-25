package com.accountbm.identity.service;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import javax.crypto.SecretKey;

import com.accountbm.identity.dto.IdentityDtos.CurrentUser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;

@Service
public class JwtTokenService {
    private final JwtEncoder encoder;
    private final String issuer;
    private final Duration accessTokenLifetime;

    public JwtTokenService(
            JwtEncoder encoder,
            @Value("${app.jwt.issuer}") String issuer,
            @Value("${app.jwt.access-token-minutes}") long accessTokenMinutes) {
        this.encoder = encoder;
        this.issuer = issuer;
        this.accessTokenLifetime = Duration.ofMinutes(accessTokenMinutes);
    }

    public AccessToken issue(CurrentUser user) {
        var now = Instant.now();
        var organization = user.organizations().isEmpty() ? null : user.organizations().getFirst();
        var claimsBuilder = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(now.plus(accessTokenLifetime))
                .subject(user.id().toString())
                .claim("email", user.email())
                .claim("name", user.displayName())
                .claim("super_admin", user.superAdmin())
                .claim("permissions", user.superAdmin() ? List.of("*") : user.permissions())
                .claim("branch_ids", organization == null ? List.of() : organization.branches().stream()
                        .map(branch -> branch.id().toString()).toList());
        if (organization != null) {
            claimsBuilder.claim("organization_id", organization.organizationId().toString());
        }
        var claims = claimsBuilder.build();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        return new AccessToken(
                encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue(),
                accessTokenLifetime.toSeconds());
    }

    public record AccessToken(String value, long expiresInSeconds) {}
}
