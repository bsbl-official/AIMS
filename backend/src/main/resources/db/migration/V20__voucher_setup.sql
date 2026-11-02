CREATE TABLE a_vr_type (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id          uuid NOT NULL REFERENCES organizations(id),
    branch_id                uuid NOT NULL,
    project_code_id          integer NOT NULL,
    finance_code_id          integer NOT NULL,
    component_code_id        integer NOT NULL,
    coa_id                   bigint NOT NULL REFERENCES a_coa(coa_id),
    company_code             varchar(40) NOT NULL,
    company_branch_code      varchar(40) NOT NULL,
    project_code             varchar(40) NOT NULL,
    finance_code             varchar(40) NOT NULL,
    component_code           varchar(40) NOT NULL,
    voucher_class            varchar(10) NOT NULL CHECK (voucher_class IN ('DEBIT', 'CREDIT', 'JOURNAL')),
    voucher_type             varchar(10) NOT NULL CHECK (voucher_type IN ('BANK', 'CASH', 'OTHERS')),
    voucher_description      varchar(100) NOT NULL,
    ins_user                 varchar(50) NOT NULL,
    ins_date                 timestamptz NOT NULL DEFAULT clock_timestamp(),
    upd_user                 varchar(50),
    upd_date                 timestamptz,
    version                  bigint NOT NULL DEFAULT 0,
    FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id),
    FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
    FOREIGN KEY (organization_id, project_code_id, finance_code_id)
        REFERENCES finance_codes(organization_id, project_code_id, id),
    FOREIGN KEY (organization_id, component_code_id) REFERENCES component_codes(organization_id, id),
    UNIQUE (organization_id, branch_id, project_code_id, finance_code_id, component_code_id,
            coa_id, voucher_class, voucher_type)
);

CREATE INDEX ix_a_vr_type_company_context
    ON a_vr_type (organization_id, branch_id, project_code_id, finance_code_id, component_code_id, coa_id);

INSERT INTO permissions (code, description) VALUES
    ('voucher_setup.read', 'View voucher setup'),
    ('voucher_setup.manage', 'Create and maintain voucher setup')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role
CROSS JOIN permissions permission
WHERE role.system_role
  AND permission.code IN ('voucher_setup.read', 'voucher_setup.manage')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE a_vr_type IS 'Voucher class and voucher type configuration, based on legacy A_VR_TYPE.';
