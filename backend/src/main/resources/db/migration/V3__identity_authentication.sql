ALTER TABLE user_profiles
    ADD COLUMN password_hash varchar(100),
    ADD COLUMN super_admin boolean NOT NULL DEFAULT false,
    ADD COLUMN failed_login_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_login_attempts BETWEEN 0 AND 100),
    ADD COLUMN locked_until timestamptz,
    ADD COLUMN password_changed_at timestamptz;

ALTER TABLE user_profiles
    ADD CONSTRAINT ck_user_password_present CHECK (password_hash IS NOT NULL OR identity_subject NOT LIKE 'local:%');

CREATE TABLE refresh_tokens (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id              uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    token_hash           char(64) NOT NULL UNIQUE,
    expires_at           timestamptz NOT NULL,
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    revoked_at           timestamptz,
    replaced_by_token_id uuid REFERENCES refresh_tokens(id),
    created_ip           inet,
    user_agent           varchar(500),
    CHECK (expires_at > created_at)
);

CREATE INDEX ix_refresh_tokens_user_active
    ON refresh_tokens (user_id, expires_at)
    WHERE revoked_at IS NULL;

INSERT INTO permissions (code, description) VALUES
    ('users.read', 'View users and their role assignments'),
    ('users.manage', 'Create, update, enable, and disable users'),
    ('roles.read', 'View roles and permissions'),
    ('roles.manage', 'Create and update roles and permission grants'),
    ('audit.read', 'View security and accounting audit events')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE refresh_tokens IS 'Hashed, rotating login refresh tokens. Raw token values never enter the database.';
COMMENT ON COLUMN user_profiles.super_admin IS 'Global platform administrator; grant only to the bootstrap account.';
