CREATE TABLE project_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    code            varchar(40) NOT NULL,
    name            varchar(160) NOT NULL,
    description     varchar(500),
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    version         bigint NOT NULL DEFAULT 0,
    UNIQUE (organization_id, code),
    UNIQUE (organization_id, id)
);

CREATE TABLE finance_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    project_code_id uuid NOT NULL,
    code            varchar(40) NOT NULL,
    name            varchar(160) NOT NULL,
    description     varchar(500),
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    version         bigint NOT NULL DEFAULT 0,
    FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
    UNIQUE (organization_id, project_code_id, code),
    UNIQUE (organization_id, project_code_id, id),
    UNIQUE (organization_id, id)
);

CREATE TABLE component_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    project_code_id uuid NOT NULL,
    finance_code_id uuid NOT NULL,
    code            varchar(40) NOT NULL,
    name            varchar(160) NOT NULL,
    description     varchar(500),
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    version         bigint NOT NULL DEFAULT 0,
    FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
    FOREIGN KEY (organization_id, project_code_id, finance_code_id)
        REFERENCES finance_codes(organization_id, project_code_id, id),
    UNIQUE (organization_id, project_code_id, finance_code_id, code),
    UNIQUE (organization_id, id)
);

CREATE INDEX ix_project_codes_company_status ON project_codes (organization_id, status, name);
CREATE INDEX ix_finance_codes_project_status ON finance_codes (organization_id, project_code_id, status, name);
CREATE INDEX ix_component_codes_finance_status ON component_codes (organization_id, project_code_id, finance_code_id, status, name);

INSERT INTO permissions (code, description) VALUES
    ('project_codes.read', 'View project code setup'),
    ('project_codes.manage', 'Create and update project codes'),
    ('finance_codes.read', 'View finance code setup'),
    ('finance_codes.manage', 'Create and update finance codes'),
    ('component_codes.read', 'View component code setup'),
    ('component_codes.manage', 'Create and update component codes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role
CROSS JOIN permissions permission
WHERE role.system_role
  AND permission.code IN (
      'project_codes.read', 'project_codes.manage',
      'finance_codes.read', 'finance_codes.manage',
      'component_codes.read', 'component_codes.manage'
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE project_codes IS 'Independent company project dimensions used by finance and component codes.';
COMMENT ON TABLE finance_codes IS 'Finance dimensions that must belong to one project code.';
COMMENT ON TABLE component_codes IS 'Lowest-level dimensions constrained to a finance code within the same project.';
