package com.accountbm.common.config;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
public class ProductionSafetyValidator implements ApplicationRunner {
    private static final List<String> FORBIDDEN = List.of(
            "account-bm-development-secret-change-before-production",
            "generate-at-least-32-random-bytes",
            "changeme123!", "change-me", "account_bm");

    private final String jwtSecret;
    private final String databasePassword;
    private final String mfaKey;
    private final List<String> origins;
    private final boolean secureCookie;
    private final boolean bootstrapEnabled;

    public ProductionSafetyValidator(
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${spring.datasource.password}") String databasePassword,
            @Value("${app.mfa.encryption-key}") String mfaKey,
            @Value("${app.cors.allowed-origins}") List<String> origins,
            @Value("${app.auth-cookie.secure}") boolean secureCookie,
            @Value("${app.bootstrap.enabled}") boolean bootstrapEnabled) {
        this.jwtSecret = jwtSecret;
        this.databasePassword = databasePassword;
        this.mfaKey = mfaKey;
        this.origins = origins;
        this.secureCookie = secureCookie;
        this.bootstrapEnabled = bootstrapEnabled;
    }

    @Override
    public void run(ApplicationArguments args) {
        requireSecret("JWT_SECRET", jwtSecret, 32);
        requireSecret("DB_PASSWORD", databasePassword, 16);
        requireSecret("MFA_ENCRYPTION_KEY", mfaKey, 32);
        if (!secureCookie) throw new IllegalStateException("Production authentication cookies must be Secure");
        if (bootstrapEnabled) throw new IllegalStateException("Production administrator bootstrap must be disabled");
        if (origins.isEmpty() || origins.stream().anyMatch(origin -> origin.contains("localhost") || origin.contains("127.0.0.1") || origin.equals("*"))) {
            throw new IllegalStateException("Production CORS origins must be explicit HTTPS deployment origins");
        }
        if (origins.stream().anyMatch(origin -> !origin.startsWith("https://"))) {
            throw new IllegalStateException("Production CORS origins must use HTTPS");
        }
    }

    private static void requireSecret(String name, String value, int minimumBytes) {
        var normalized = value == null ? "" : value.strip().toLowerCase();
        if (normalized.getBytes(StandardCharsets.UTF_8).length < minimumBytes || FORBIDDEN.stream().anyMatch(normalized::contains)) {
            throw new IllegalStateException(name + " is missing, too short, or uses a forbidden development value");
        }
    }
}
