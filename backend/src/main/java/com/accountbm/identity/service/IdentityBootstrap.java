package com.accountbm.identity.service;

import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class IdentityBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(IdentityBootstrap.class);

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;
    private final String displayName;

    public IdentityBootstrap(
            JdbcTemplate jdbc,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap.admin-email}") String email,
            @Value("${app.bootstrap.admin-password}") String password,
            @Value("${app.bootstrap.admin-name}") String displayName) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.email = email.strip().toLowerCase(Locale.ROOT);
        this.password = password;
        this.displayName = displayName.strip();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        ensureSuperAdmin();
        log.info("Identity bootstrap ready for administrator {}", email);
    }

    private UUID ensureSuperAdmin() {
        var users = jdbc.query("SELECT id, password_hash FROM user_profiles WHERE lower(email) = ?",
                (rs, rowNum) -> new ExistingUser(rs.getObject("id", UUID.class), rs.getString("password_hash")), email);
        if (users.isEmpty()) {
            var userId = jdbc.queryForObject("""
                    INSERT INTO user_profiles
                        (identity_subject, email, display_name, password_hash, super_admin, password_changed_at)
                    VALUES (?, ?, ?, ?, true, clock_timestamp()) RETURNING id
                    """, UUID.class, "local:" + UUID.randomUUID(), email, displayName, passwordEncoder.encode(password));
            log.info("Created bootstrap super administrator email={} userId={}", email, userId);
            return userId;
        }
        var user = users.getFirst();
        if (user.passwordHash() == null) {
            jdbc.update("""
                    UPDATE user_profiles SET password_hash = ?, super_admin = true,
                        password_changed_at = clock_timestamp(), updated_at = clock_timestamp()
                    WHERE id = ?
                    """, passwordEncoder.encode(password), user.id());
            log.info("Initialized local password for existing bootstrap administrator email={} userId={}", email, user.id());
        } else {
            jdbc.update("UPDATE user_profiles SET super_admin = true WHERE id = ?", user.id());
            log.info("Bootstrap administrator already exists; configured password was not reapplied email={} userId={}", email, user.id());
        }
        return user.id();
    }

    private record ExistingUser(UUID id, String passwordHash) {}
}
