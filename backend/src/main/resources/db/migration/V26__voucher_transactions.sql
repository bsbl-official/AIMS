ALTER TABLE a_vr_type ADD COLUMN voucher_last_date date;

CREATE TABLE a_voucher_daily_sequence (
    voucher_setup_id uuid NOT NULL REFERENCES a_vr_type(id) ON DELETE CASCADE,
    voucher_date date NOT NULL,
    last_number bigint NOT NULL CHECK (last_number > 0),
    PRIMARY KEY (voucher_setup_id, voucher_date)
);

DO $$
DECLARE master_table text; child_table text; voucher_class text;
BEGIN
    FOREACH master_table IN ARRAY ARRAY['a_dr', 'a_cr', 'a_jv'] LOOP
        child_table := master_table || 'child';
        voucher_class := CASE master_table WHEN 'a_dr' THEN 'DEBIT' WHEN 'a_cr' THEN 'CREDIT' ELSE 'JOURNAL' END;
        EXECUTE format($sql$
            CREATE TABLE %I (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id uuid NOT NULL REFERENCES organizations(id),
                voucher_setup_id uuid NOT NULL REFERENCES a_vr_type(id),
                branch_id uuid NOT NULL,
                project_code_id integer NOT NULL,
                finance_code_id integer NOT NULL,
                component_code_id integer NOT NULL,
                coa_id bigint NOT NULL REFERENCES a_coa(coa_id),
                company_code varchar(40) NOT NULL,
                company_branch_code varchar(40) NOT NULL,
                project_code varchar(40) NOT NULL,
                finance_code varchar(40) NOT NULL,
                component_code varchar(40) NOT NULL,
                voucher_number varchar(20) NOT NULL,
                voucher_date date NOT NULL,
                voucher_class varchar(10) NOT NULL CHECK (voucher_class = %L),
                voucher_type varchar(10) NOT NULL,
                document_type varchar(10) NOT NULL,
                particulars varchar(200) NOT NULL,
                party_code varchar(6), paid_to varchar(100),
                cheque_number varchar(35), cheque_date date,
                bank_code varchar(20), bank_branch_code varchar(20),
                reference_bill_number varchar(30), reference_bill_date date,
                month_year char(7) NOT NULL,
                status varchar(12) NOT NULL DEFAULT 'DRAFT' CHECK (status = 'DRAFT'),
                total_debit numeric(15,2) NOT NULL CHECK (total_debit > 0),
                total_credit numeric(15,2) NOT NULL CHECK (total_credit > 0),
                ins_user varchar(50) NOT NULL, ins_date timestamptz NOT NULL DEFAULT clock_timestamp(),
                upd_user varchar(50), upd_date timestamptz,
                version bigint NOT NULL DEFAULT 0,
                UNIQUE (organization_id, id),
                UNIQUE (organization_id, voucher_setup_id, voucher_number),
                CHECK (total_debit = total_credit),
                FOREIGN KEY (organization_id, branch_id) REFERENCES branches(organization_id, id),
                FOREIGN KEY (organization_id, project_code_id) REFERENCES project_codes(organization_id, id),
                FOREIGN KEY (organization_id, project_code_id, finance_code_id)
                    REFERENCES finance_codes(organization_id, project_code_id, id),
                FOREIGN KEY (organization_id, component_code_id) REFERENCES component_codes(organization_id, id)
            )
        $sql$, master_table, voucher_class);
        EXECUTE format($sql$
            CREATE TABLE %I (
                id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
                organization_id uuid NOT NULL,
                voucher_id uuid NOT NULL,
                line_number integer NOT NULL CHECK (line_number > 0),
                entry_side char(1) NOT NULL CHECK (entry_side IN ('D','C')),
                company_code varchar(40) NOT NULL,
                coa_id bigint NOT NULL,
                l1_code varchar(6) NOT NULL, l2_code varchar(6) NOT NULL,
                l3_code varchar(10) NOT NULL, l4_code varchar(10) NOT NULL, l5_code varchar(10) NOT NULL,
                particulars varchar(100), amount numeric(15,2) NOT NULL CHECK (amount > 0),
                posting_flag varchar(1) NOT NULL DEFAULT 'N' CHECK (posting_flag = 'N'),
                audit_flag varchar(1), auto_voucher_flag varchar(2),
                bank_code varchar(20), bank_branch_code varchar(20), cheque_number varchar(35), cheque_date date,
                ins_user varchar(50) NOT NULL, ins_date timestamptz NOT NULL DEFAULT clock_timestamp(),
                upd_user varchar(50), upd_date timestamptz,
                UNIQUE (voucher_id, line_number),
                FOREIGN KEY (organization_id, voucher_id) REFERENCES %I(organization_id, id) ON DELETE CASCADE,
                FOREIGN KEY (company_code, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code)
                    REFERENCES a_acc_head(company_code, coa_id, l1_code, l2_code, l3_code, l4_code, l5_code)
            )
        $sql$, child_table, master_table);
        EXECUTE format('CREATE INDEX %I ON %I (organization_id, voucher_date DESC, voucher_number)', 'ix_' || master_table || '_search', master_table);
        EXECUTE format('CREATE INDEX %I ON %I (organization_id, voucher_id, entry_side)', 'ix_' || child_table || '_voucher', child_table);
    END LOOP;
END $$;

INSERT INTO role_permissions (organization_id, role_id, permission_code)
SELECT role.organization_id, role.id, permission.code
FROM roles role CROSS JOIN permissions permission
WHERE role.system_role AND permission.code IN ('journal.read', 'journal.create')
ON CONFLICT DO NOTHING;
