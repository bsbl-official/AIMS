CREATE TABLE a_period (
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    period          smallint NOT NULL CHECK (period BETWEEN 1 AND 12),
    month           smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
    month_name      varchar(9) NOT NULL,
    quarter         smallint NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    ins_user        varchar(50) NOT NULL,
    ins_date        timestamptz NOT NULL DEFAULT clock_timestamp(),
    upd_user        varchar(50),
    upd_date        timestamptz,
    PRIMARY KEY (organization_id, period),
    UNIQUE (organization_id, month) DEFERRABLE INITIALLY DEFERRED
);

INSERT INTO permissions (code, description) VALUES
    ('financial_years.read', 'View financial year setup'),
    ('financial_years.manage', 'Create and maintain financial year setup')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role
CROSS JOIN permissions permission
WHERE role.system_role
  AND permission.code IN ('financial_years.read', 'financial_years.manage')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE a_period IS 'Company financial-year period to calendar-month mapping, based on legacy A_PERIOD.';
