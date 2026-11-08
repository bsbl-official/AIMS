CREATE TABLE application_capabilities (
    code        varchar(100) PRIMARY KEY,
    module      varchar(60) NOT NULL,
    name        varchar(120) NOT NULL,
    description varchar(255) NOT NULL,
    active      boolean NOT NULL DEFAULT true
);

ALTER TABLE permissions
    ADD COLUMN id uuid DEFAULT gen_random_uuid(),
    ADD COLUMN organization_id uuid REFERENCES organizations(id),
    ADD COLUMN name varchar(120),
    ADD COLUMN status varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    ADD COLUMN system_permission boolean NOT NULL DEFAULT true,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    ADD COLUMN updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    ADD COLUMN version bigint NOT NULL DEFAULT 0;

UPDATE permissions
SET name = initcap(replace(replace(code, '.', ' '), '_', ' '));

ALTER TABLE permissions ALTER COLUMN id SET NOT NULL;
ALTER TABLE permissions ALTER COLUMN name SET NOT NULL;

ALTER TABLE role_permissions ADD COLUMN permission_id uuid;
UPDATE role_permissions role_permission
SET permission_id = permission.id
FROM permissions permission
WHERE permission.code = role_permission.permission_code;
ALTER TABLE role_permissions ALTER COLUMN permission_id SET NOT NULL;

ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_pkey;
ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_permission_code_fkey;
ALTER TABLE role_permissions DROP COLUMN permission_code;
ALTER TABLE permissions DROP CONSTRAINT permissions_pkey;
ALTER TABLE permissions ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id);
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_permission_id_fkey
    FOREIGN KEY (permission_id) REFERENCES permissions(id);

CREATE UNIQUE INDEX uq_system_permission_code ON permissions(code) WHERE organization_id IS NULL;
CREATE UNIQUE INDEX uq_company_permission_code ON permissions(organization_id, code) WHERE organization_id IS NOT NULL;
CREATE INDEX ix_permissions_company_status ON permissions(organization_id, status);

INSERT INTO permissions (organization_id, code, name, description, system_permission)
VALUES
    (NULL, 'permissions.read', 'View permissions', 'View the permission catalog and capability mappings', true),
    (NULL, 'permissions.manage', 'Manage permissions', 'Create and maintain company permissions and capability mappings', true)
ON CONFLICT (code) WHERE organization_id IS NULL DO NOTHING;

INSERT INTO application_capabilities (code, module, name, description)
SELECT code,
       split_part(code, '.', 1),
       initcap(replace(replace(code, '.', ' '), '_', ' ')),
       description
FROM permissions
WHERE organization_id IS NULL
ON CONFLICT (code) DO NOTHING;

CREATE TABLE permission_capabilities (
    permission_id  uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    capability_code varchar(100) NOT NULL REFERENCES application_capabilities(code),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (permission_id, capability_code)
);

INSERT INTO permission_capabilities (permission_id, capability_code)
SELECT id, code FROM permissions WHERE organization_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_id)
SELECT DISTINCT role_permission.organization_id, role_permission.role_id, target.id
FROM role_permissions role_permission
JOIN permissions source ON source.id = role_permission.permission_id
JOIN permissions target ON target.code = CASE
    WHEN source.code = 'roles.manage' THEN 'permissions.manage'
    ELSE 'permissions.read'
END AND target.organization_id IS NULL
WHERE source.code IN ('roles.read', 'roles.manage')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE application_capabilities IS 'Immutable application actions that may be granted by dynamic permissions.';
COMMENT ON TABLE permission_capabilities IS 'Maps global or company permissions to code-enforced application capabilities.';
