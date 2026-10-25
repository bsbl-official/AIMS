CREATE TABLE a_rep_code (
    company_code     varchar(40) NOT NULL REFERENCES organizations(code),
    coa_id           varchar(6) NOT NULL REFERENCES a_coa(coa_id),
    report_code      varchar(2) NOT NULL,
    report_desc      varchar(100) NOT NULL,
    report_sum_label varchar(100),
    PRIMARY KEY (company_code, coa_id, report_code)
);

CREATE TABLE a_rep_group (
    company_code    varchar(40) NOT NULL,
    coa_id          varchar(6) NOT NULL,
    report_code     varchar(2) NOT NULL,
    group_code      varchar(3) NOT NULL,
    group_desc      varchar(100) NOT NULL,
    group_sum_label varchar(100),
    PRIMARY KEY (company_code, coa_id, report_code, group_code),
    FOREIGN KEY (company_code, coa_id, report_code)
        REFERENCES a_rep_code(company_code, coa_id, report_code)
);

CREATE TABLE a_rep_layer1 (
    company_code     varchar(40) NOT NULL,
    coa_id           varchar(6) NOT NULL,
    report_code      varchar(2) NOT NULL,
    group_code       varchar(3) NOT NULL,
    layer1_code      varchar(3) NOT NULL,
    layer1_desc      varchar(100) NOT NULL,
    layer1_sum_label varchar(100),
    layer1_sign      varchar(1) CHECK (layer1_sign IN ('+', '-')),
    PRIMARY KEY (company_code, coa_id, report_code, group_code, layer1_code),
    FOREIGN KEY (company_code, coa_id, report_code, group_code)
        REFERENCES a_rep_group(company_code, coa_id, report_code, group_code)
);

CREATE TABLE a_rep_spec (
    company_code       varchar(40) NOT NULL,
    coa_id             varchar(6) NOT NULL,
    report_type        varchar(1) NOT NULL,
    report_code        varchar(2) NOT NULL,
    report_desc        varchar(100) NOT NULL,
    report_sum_label   varchar(100),
    group_code         varchar(3) NOT NULL,
    group_desc         varchar(100) NOT NULL,
    group_sign         varchar(1) CHECK (group_sign IN ('+', '-')),
    group_sum_label    varchar(100),
    layer1_code        varchar(3) NOT NULL,
    layer1_desc        varchar(100) NOT NULL,
    layer1_sign        varchar(1) CHECK (layer1_sign IN ('+', '-')),
    layer1_sum_label   varchar(100),
    layer2_code        varchar(6) NOT NULL,
    layer2_desc        varchar(100) NOT NULL,
    layer2_sign        varchar(1) CHECK (layer2_sign IN ('+', '-')),
    note_id            varchar(6),
    retain_earning_flag varchar(1),
    report_short       varchar(6),
    cf_flag            varchar(5),
    rp_flag            varchar(5),
    ratio_parameter    varchar(30),
    lq_cash_flag       varchar(1),
    savings_flag       varchar(1),
    debt_flag          varchar(1),
    prn_paid_flag      varchar(1),
    sc_paid_flag       varchar(1),
    cur_asset_flag     varchar(1),
    cur_liability_flag varchar(1),
    split_figure_flag  varchar(1),
    combine_flag       varchar(1),
    ins_date           timestamptz NOT NULL DEFAULT clock_timestamp(),
    ins_user           varchar(75) NOT NULL,
    upd_date           timestamptz,
    upd_user           varchar(75),
    layer2_code_dummy  varchar(50),
    PRIMARY KEY (company_code, coa_id, report_type, report_code, group_code, layer1_code, layer2_code),
    FOREIGN KEY (company_code, coa_id, report_code, group_code, layer1_code)
        REFERENCES a_rep_layer1(company_code, coa_id, report_code, group_code, layer1_code)
);

CREATE INDEX ix_rep_code_coa ON a_rep_code (company_code, coa_id);
CREATE INDEX ix_rep_group_report ON a_rep_group (company_code, coa_id, report_code);
CREATE INDEX ix_rep_layer1_group ON a_rep_layer1 (company_code, coa_id, report_code, group_code);
CREATE INDEX ix_rep_spec_layer1 ON a_rep_spec (company_code, coa_id, report_code, group_code, layer1_code);

INSERT INTO permissions (code, description) VALUES
    ('financial_statements.read', 'View financial statement setup'),
    ('financial_statements.manage', 'Create and maintain financial statement setup')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role
CROSS JOIN permissions permission
WHERE role.system_role
  AND permission.code IN ('financial_statements.read', 'financial_statements.manage')
ON CONFLICT DO NOTHING;
