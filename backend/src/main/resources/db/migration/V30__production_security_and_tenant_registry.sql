ALTER TABLE organizations
    ADD COLUMN tenant_key uuid NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN database_name varchar(63),
    ADD COLUMN database_status varchar(20) NOT NULL DEFAULT 'PENDING'
        CHECK (database_status IN ('PENDING','PROVISIONING','READY','FAILED','SUSPENDED')),
    ADD COLUMN tenant_schema_version varchar(50),
    ADD COLUMN provisioned_at timestamptz,
    ADD COLUMN provisioning_error varchar(1000),
    ADD CONSTRAINT uq_organizations_tenant_key UNIQUE (tenant_key);

UPDATE organizations
SET database_name = 'account_bm_t_' || replace(tenant_key::text, '-', '');

ALTER TABLE organizations
    ALTER COLUMN database_name SET NOT NULL,
    ADD CONSTRAINT uq_organizations_database_name UNIQUE (database_name),
    ADD CONSTRAINT ck_organizations_database_name
        CHECK (database_name ~ '^account_bm_t_[0-9a-f]{32}$');

ALTER TABLE user_profiles
    ADD COLUMN security_version bigint NOT NULL DEFAULT 0,
    ADD COLUMN mfa_required boolean NOT NULL DEFAULT false,
    ADD COLUMN mfa_enabled_at timestamptz,
    ADD COLUMN totp_secret_ciphertext bytea,
    ADD CONSTRAINT ck_user_totp_complete CHECK (
        mfa_enabled_at IS NULL OR totp_secret_ciphertext IS NOT NULL
    );

UPDATE user_profiles SET mfa_required=true WHERE super_admin;

ALTER TABLE refresh_tokens
    ADD COLUMN family_id uuid,
    ADD COLUMN used_at timestamptz,
    ADD COLUMN reuse_detected_at timestamptz;

UPDATE refresh_tokens SET family_id = id WHERE family_id IS NULL;
ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL;
CREATE INDEX ix_refresh_tokens_family ON refresh_tokens(family_id, created_at);

CREATE TABLE mfa_recovery_codes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    code_hash   char(64) NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT clock_timestamp(),
    used_at     timestamptz,
    UNIQUE (user_id, code_hash)
);

CREATE TABLE login_rate_limits (
    limit_key       varchar(320) PRIMARY KEY,
    window_started timestamptz NOT NULL,
    attempts        integer NOT NULL CHECK (attempts >= 0),
    blocked_until   timestamptz,
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE security_events (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         uuid REFERENCES user_profiles(id),
    event_type      varchar(80) NOT NULL,
    occurred_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
    ip_address      inet,
    user_agent      varchar(500),
    correlation_id  varchar(100),
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (jsonb_typeof(metadata) = 'object')
);
CREATE INDEX ix_security_events_user_time ON security_events(user_id, occurred_at DESC);
CREATE INDEX ix_security_events_type_time ON security_events(event_type, occurred_at DESC);

CREATE TABLE provisioning_jobs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    status          varchar(20) NOT NULL CHECK (status IN ('PENDING','RUNNING','SUCCEEDED','FAILED')),
    attempt         integer NOT NULL DEFAULT 0 CHECK (attempt >= 0),
    requested_at    timestamptz NOT NULL DEFAULT clock_timestamp(),
    started_at      timestamptz,
    completed_at    timestamptz,
    last_error      varchar(1000)
);
CREATE INDEX ix_provisioning_jobs_pending ON provisioning_jobs(requested_at)
    WHERE status IN ('PENDING','FAILED');

INSERT INTO permissions (organization_id, code, name, description, system_permission)
VALUES
    (NULL, 'sessions.read', 'View sessions', 'View active login sessions', true),
    (NULL, 'sessions.manage', 'Manage sessions', 'Revoke active login sessions', true),
    (NULL, 'tenants.manage', 'Manage tenant databases', 'Provision and inspect tenant databases', true)
ON CONFLICT (code) WHERE organization_id IS NULL DO NOTHING;

INSERT INTO application_capabilities(code,module,name,description)
VALUES
    ('sessions.read','sessions','View sessions','View active login sessions'),
    ('sessions.manage','sessions','Manage sessions','Revoke active login sessions'),
    ('tenants.manage','tenants','Manage tenant databases','Provision and inspect tenant databases')
ON CONFLICT (code) DO NOTHING;

INSERT INTO permission_capabilities(permission_id,capability_code)
SELECT permission.id, permission.code
FROM permissions permission
WHERE permission.code IN ('sessions.read','sessions.manage','tenants.manage')
  AND permission.organization_id IS NULL
ON CONFLICT DO NOTHING;

COMMENT ON COLUMN organizations.tenant_key IS 'Immutable random identifier used to derive the physical tenant database name.';
COMMENT ON COLUMN organizations.provisioning_error IS 'Sanitized provisioning failure suitable for operational display.';
COMMENT ON COLUMN user_profiles.security_version IS 'Increment to invalidate all access and refresh sessions immediately.';

