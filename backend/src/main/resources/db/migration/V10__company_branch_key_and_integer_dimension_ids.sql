ALTER TABLE organizations
    ADD CONSTRAINT uq_organizations_id_code UNIQUE (id, code);

ALTER TABLE branches ADD COLUMN company_code varchar(40);

UPDATE branches branch
SET company_code = organization.code
FROM organizations organization
WHERE organization.id = branch.organization_id;

ALTER TABLE branches
    ALTER COLUMN company_code SET NOT NULL,
    ADD CONSTRAINT fk_branches_company_identity
        FOREIGN KEY (organization_id, company_code) REFERENCES organizations(id, code);

CREATE INDEX ix_branches_company_code ON branches (company_code);

CREATE TEMP TABLE migrated_project_codes AS
SELECT code::integer AS id, organization_id, name, description, status, created_at, updated_at, version
FROM project_codes;

CREATE TEMP TABLE migrated_finance_codes AS
SELECT finance.code::integer AS id, finance.organization_id, project.code::integer AS project_code_id,
       finance.name, finance.description, finance.status, finance.created_at, finance.updated_at, finance.version
FROM finance_codes finance
JOIN project_codes project
  ON project.organization_id = finance.organization_id AND project.id = finance.project_code_id;

CREATE TEMP TABLE migrated_component_codes AS
SELECT component.code::integer AS id, component.organization_id,
       project.code::integer AS project_code_id, finance.code::integer AS finance_code_id,
       component.name, component.description, component.status,
       component.created_at, component.updated_at, component.version
FROM component_codes component
JOIN project_codes project
  ON project.organization_id = component.organization_id AND project.id = component.project_code_id
JOIN finance_codes finance
  ON finance.organization_id = component.organization_id
 AND finance.project_code_id = component.project_code_id
 AND finance.id = component.finance_code_id;

DROP TABLE component_codes;
DROP TABLE finance_codes;
DROP TABLE project_codes;

CREATE TABLE project_codes (
    id              integer PRIMARY KEY CHECK (id > 0),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    name            varchar(160) NOT NULL,
    description     varchar(500),
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    version         bigint NOT NULL DEFAULT 0,
    UNIQUE (organization_id, id)
);

CREATE TABLE finance_codes (
    id              integer PRIMARY KEY CHECK (id > 0),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    project_code_id integer NOT NULL,
    name            varchar(160) NOT NULL,
    description     varchar(500),
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    version         bigint NOT NULL DEFAULT 0,
    FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
    UNIQUE (organization_id, project_code_id, id),
    UNIQUE (organization_id, id)
);

CREATE TABLE component_codes (
    id              integer PRIMARY KEY CHECK (id > 0),
    organization_id uuid NOT NULL REFERENCES organizations(id),
    project_code_id integer NOT NULL,
    finance_code_id integer NOT NULL,
    name            varchar(160) NOT NULL,
    description     varchar(500),
    status          varchar(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at      timestamptz NOT NULL DEFAULT clock_timestamp(),
    version         bigint NOT NULL DEFAULT 0,
    FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
    FOREIGN KEY (organization_id, project_code_id, finance_code_id)
        REFERENCES finance_codes(organization_id, project_code_id, id),
    UNIQUE (organization_id, id)
);

INSERT INTO project_codes
SELECT * FROM migrated_project_codes;

INSERT INTO finance_codes
SELECT * FROM migrated_finance_codes;

INSERT INTO component_codes
SELECT * FROM migrated_component_codes;

CREATE INDEX ix_project_codes_company_status ON project_codes (organization_id, status, name);
CREATE INDEX ix_finance_codes_project_status ON finance_codes (organization_id, project_code_id, status, name);
CREATE INDEX ix_component_codes_finance_status ON component_codes (organization_id, project_code_id, finance_code_id, status, name);

COMMENT ON COLUMN branches.company_code IS 'Company business key stored with the branch and enforced with organization_id.';
COMMENT ON COLUMN project_codes.id IS 'User-entered positive integer project code and table primary key.';
COMMENT ON COLUMN finance_codes.id IS 'User-entered positive integer finance code and table primary key.';
COMMENT ON COLUMN component_codes.id IS 'User-entered positive integer component code and table primary key.';
