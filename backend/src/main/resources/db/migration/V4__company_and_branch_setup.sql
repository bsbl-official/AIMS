ALTER TABLE organizations
    ADD COLUMN trading_name varchar(200),
    ADD COLUMN country_code char(2),
    ADD COLUMN address_line_1 varchar(200),
    ADD COLUMN address_line_2 varchar(200),
    ADD COLUMN city varchar(100),
    ADD COLUMN state_province varchar(100),
    ADD COLUMN postal_code varchar(30),
    ADD COLUMN email varchar(320),
    ADD COLUMN phone varchar(50),
    ADD COLUMN website varchar(255),
    ADD CONSTRAINT ck_organizations_country_code
        CHECK (country_code IS NULL OR country_code = upper(country_code));

CREATE TABLE branches (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    code                 varchar(40) NOT NULL,
    name                 varchar(200) NOT NULL,
    branch_type          varchar(20) NOT NULL DEFAULT 'BRANCH'
                         CHECK (branch_type IN ('HEAD_OFFICE', 'BRANCH')),
    country_code         char(2),
    address_line_1       varchar(200),
    address_line_2       varchar(200),
    city                 varchar(100),
    state_province       varchar(100),
    postal_code          varchar(30),
    email                varchar(320),
    phone                varchar(50),
    timezone             varchar(60) NOT NULL DEFAULT 'UTC',
    status               varchar(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'INACTIVE', 'CLOSED')),
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    CONSTRAINT ck_branches_country_code
        CHECK (country_code IS NULL OR country_code = upper(country_code)),
    UNIQUE (organization_id, code),
    UNIQUE (organization_id, id)
);

CREATE UNIQUE INDEX uq_branches_active_head_office
    ON branches (organization_id)
    WHERE branch_type = 'HEAD_OFFICE' AND status = 'ACTIVE';

CREATE INDEX ix_branches_organization_status
    ON branches (organization_id, status, name);

INSERT INTO branches (organization_id, code, name, branch_type, country_code, timezone)
SELECT id, 'HO', legal_name || ' Head Office', 'HEAD_OFFICE', country_code, timezone
FROM organizations;

ALTER TABLE journals ADD COLUMN branch_id uuid;

UPDATE journals journal
SET branch_id = branch.id
FROM branches branch
WHERE branch.organization_id = journal.organization_id
  AND branch.branch_type = 'HEAD_OFFICE'
  AND journal.branch_id IS NULL;

ALTER TABLE journals
    ALTER COLUMN branch_id SET NOT NULL,
    ADD CONSTRAINT fk_journals_branch
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id);

CREATE INDEX ix_journals_branch_posting_date
    ON journals (organization_id, branch_id, posting_date)
    WHERE status = 'POSTED';

ALTER TABLE journal_sequences ADD COLUMN branch_id uuid;

UPDATE journal_sequences sequence
SET branch_id = branch.id
FROM branches branch
WHERE branch.organization_id = sequence.organization_id
  AND branch.branch_type = 'HEAD_OFFICE'
  AND sequence.branch_id IS NULL;

ALTER TABLE journal_sequences
    ALTER COLUMN branch_id SET NOT NULL,
    DROP CONSTRAINT journal_sequences_pkey,
    ADD CONSTRAINT journal_sequences_pkey
        PRIMARY KEY (organization_id, branch_id, fiscal_year_id, voucher_type_code),
    ADD CONSTRAINT fk_journal_sequences_branch
        FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id);

INSERT INTO permissions (code, description) VALUES
    ('companies.read', 'View company setup and legal entity information'),
    ('companies.manage', 'Create and update company setup'),
    ('branches.read', 'View company branches'),
    ('branches.manage', 'Create and update company branches')
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE branches IS 'Operational branches belonging to a legal company. Journals are posted against one branch.';
COMMENT ON COLUMN journals.branch_id IS 'Branch responsible for this voucher and its branch-level reporting.';
