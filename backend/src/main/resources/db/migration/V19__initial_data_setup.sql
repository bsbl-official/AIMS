CREATE TABLE a_monthly_bal (
    id                       bigserial PRIMARY KEY,
    entry_id                 uuid NOT NULL,
    organization_id          uuid NOT NULL REFERENCES organizations(id),
    branch_id                uuid NOT NULL,
    project_code_id          integer NOT NULL,
    finance_code_id          integer NOT NULL,
    component_code_id        integer NOT NULL,
    company_code             varchar(40) NOT NULL,
    company_branch_code      varchar(40) NOT NULL,
    finance_code             varchar(40) NOT NULL,
    project_code             varchar(40) NOT NULL,
    component_code           varchar(40) NOT NULL,
    mnyr                     char(7) NOT NULL CHECK (mnyr ~ '^(0[1-9]|1[0-2])/[0-9]{4}$'),
    financial_year_mnyr      char(7) NOT NULL CHECK (financial_year_mnyr ~ '^(0[1-9]|1[0-2])/[0-9]{4}$'),
    coa_id                   bigint NOT NULL,
    l1_code                  varchar(6) NOT NULL,
    l2_code                  varchar(6) NOT NULL,
    l3_code                  varchar(10) NOT NULL,
    l4_code                  varchar(10) NOT NULL,
    l5_code                  varchar(10) NOT NULL,
    bal_dr                   numeric(15,2) NOT NULL DEFAULT 0 CHECK (bal_dr >= 0),
    bal_cr                   numeric(15,2) NOT NULL DEFAULT 0 CHECK (bal_cr >= 0),
    cum_bal_dr               numeric(15,2) NOT NULL DEFAULT 0 CHECK (cum_bal_dr >= 0),
    cum_bal_cr               numeric(15,2) NOT NULL DEFAULT 0 CHECK (cum_bal_cr >= 0),
    bal_dr_cash              numeric(15,2) NOT NULL DEFAULT 0,
    bal_cr_cash              numeric(15,2) NOT NULL DEFAULT 0,
    cum_bal_dr_ext           numeric(15,2) NOT NULL DEFAULT 0,
    cum_bal_cr_ext           numeric(15,2) NOT NULL DEFAULT 0,
    cum_bal_dr_cash_ext      numeric(15,2) NOT NULL DEFAULT 0,
    cum_bal_cr_cash_ext      numeric(15,2) NOT NULL DEFAULT 0,
    ins_user                 varchar(50) NOT NULL,
    ins_date                 timestamptz NOT NULL DEFAULT clock_timestamp(),
    upd_user                 varchar(50),
    upd_date                 timestamptz,
    area_code                varchar(3),
    zone_code                varchar(3),
    region_code              varchar(4),
    posting_flag             varchar(3) NOT NULL DEFAULT 'N',
    FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id),
    FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
    FOREIGN KEY (organization_id, project_code_id, finance_code_id)
        REFERENCES finance_codes(organization_id, project_code_id, id),
    FOREIGN KEY (organization_id, component_code_id) REFERENCES component_codes(organization_id, id),
    FOREIGN KEY (company_code, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code)
        REFERENCES a_acc_head(company_code, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code),
    UNIQUE (entry_id, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code)
);

CREATE UNIQUE INDEX uq_a_monthly_bal_context_head
    ON a_monthly_bal (
        organization_id, branch_id, project_code_id, finance_code_id, component_code_id, mnyr,
        coa_id, l1_code, l2_code, l3_code, l4_code, l5_code
    );
CREATE INDEX ix_a_monthly_bal_entry ON a_monthly_bal (organization_id, entry_id);
CREATE INDEX ix_a_monthly_bal_search
    ON a_monthly_bal (organization_id, mnyr DESC, branch_id, project_code_id, finance_code_id, component_code_id);

INSERT INTO permissions (code, description) VALUES
    ('initial_data.read', 'View initial accounting balance entries'),
    ('initial_data.manage', 'Create and update initial accounting balance entries')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role
CROSS JOIN permissions permission
WHERE role.system_role
  AND permission.code IN ('initial_data.read', 'initial_data.manage')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE a_monthly_bal IS 'Initial monthly account balances, based on legacy A_MONTHLY_BAL.';
COMMENT ON COLUMN a_monthly_bal.entry_id IS 'Groups all account-head rows saved as one Initial Data Setup entry.';
COMMENT ON COLUMN a_monthly_bal.mnyr IS 'Selected calendar month in MM/YYYY format.';
COMMENT ON COLUMN a_monthly_bal.financial_year_mnyr IS 'Calculated financial-year start month in MM/YYYY format.';
