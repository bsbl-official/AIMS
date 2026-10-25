CREATE TABLE a_coa (
    coa_id       varchar(6) PRIMARY KEY,
    coa_desc     varchar(100) NOT NULL,
    ins_user     varchar(50) NOT NULL,
    ins_date     timestamptz NOT NULL DEFAULT clock_timestamp(),
    upd_user     varchar(50),
    upd_date     timestamptz,
    device_flage varchar(1) NOT NULL DEFAULT 'N' CHECK (device_flage IN ('Y', 'N'))
);

INSERT INTO permissions (code, description) VALUES
    ('coa.read', 'View chart of accounts setup'),
    ('coa.manage', 'Create and update chart of accounts setup')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role
CROSS JOIN permissions permission
WHERE role.system_role
  AND permission.code IN ('coa.read', 'coa.manage')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE a_coa IS 'Chart of accounts setup matching the legacy A_COA definition.';
COMMENT ON COLUMN a_coa.device_flage IS 'Y when the COA entry is device-enabled, otherwise N.';
