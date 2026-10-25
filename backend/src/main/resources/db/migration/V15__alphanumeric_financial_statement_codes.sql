DO $$
DECLARE constraint_row record;
BEGIN
    FOR constraint_row IN
        SELECT conrelid::regclass AS table_name, conname
        FROM pg_constraint
        WHERE contype IN ('p', 'f')
          AND conrelid IN ('a_rep_code'::regclass, 'a_rep_group'::regclass,
                           'a_rep_layer1'::regclass, 'a_rep_spec'::regclass)
        ORDER BY CASE WHEN contype = 'f' THEN 0 ELSE 1 END
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_row.table_name, constraint_row.conname);
    END LOOP;
END $$;

ALTER TABLE a_rep_code DROP CONSTRAINT IF EXISTS a_rep_code_report_code_check;
ALTER TABLE a_rep_group DROP CONSTRAINT IF EXISTS a_rep_group_group_code_check;
ALTER TABLE a_rep_layer1 DROP CONSTRAINT IF EXISTS a_rep_layer1_layer1_code_check;
ALTER TABLE a_rep_spec DROP CONSTRAINT IF EXISTS a_rep_spec_layer2_code_check;

ALTER TABLE a_rep_code
    ALTER COLUMN report_code TYPE varchar(2) USING lpad(report_code::text, 2, '0');
ALTER TABLE a_rep_group
    ALTER COLUMN report_code TYPE varchar(2) USING lpad(report_code::text, 2, '0'),
    ALTER COLUMN group_code TYPE varchar(3) USING lpad(group_code::text, 3, '0');
ALTER TABLE a_rep_layer1
    ALTER COLUMN report_code TYPE varchar(2) USING lpad(report_code::text, 2, '0'),
    ALTER COLUMN group_code TYPE varchar(3) USING lpad(group_code::text, 3, '0'),
    ALTER COLUMN layer1_code TYPE varchar(3) USING lpad(layer1_code::text, 3, '0');
ALTER TABLE a_rep_spec
    ALTER COLUMN report_code TYPE varchar(2) USING lpad(report_code::text, 2, '0'),
    ALTER COLUMN group_code TYPE varchar(3) USING lpad(group_code::text, 3, '0'),
    ALTER COLUMN layer1_code TYPE varchar(3) USING lpad(layer1_code::text, 3, '0'),
    ALTER COLUMN layer2_code TYPE varchar(6) USING lpad(layer2_code::text, 6, '0');

ALTER TABLE a_rep_code
    ADD PRIMARY KEY (company_code, coa_id, report_code),
    ADD FOREIGN KEY (company_code) REFERENCES organizations(code),
    ADD FOREIGN KEY (coa_id) REFERENCES a_coa(coa_id),
    ADD CHECK (report_code ~ '^[A-Za-z0-9]+$');
ALTER TABLE a_rep_group
    ADD PRIMARY KEY (company_code, coa_id, report_code, group_code),
    ADD FOREIGN KEY (company_code, coa_id, report_code)
        REFERENCES a_rep_code(company_code, coa_id, report_code),
    ADD CHECK (group_code ~ '^[A-Za-z0-9]+$');
ALTER TABLE a_rep_layer1
    ADD PRIMARY KEY (company_code, coa_id, report_code, group_code, layer1_code),
    ADD FOREIGN KEY (company_code, coa_id, report_code, group_code)
        REFERENCES a_rep_group(company_code, coa_id, report_code, group_code),
    ADD CHECK (layer1_code ~ '^[A-Za-z0-9]+$');
ALTER TABLE a_rep_spec
    ADD PRIMARY KEY (company_code, coa_id, report_type, report_code, group_code, layer1_code, layer2_code),
    ADD FOREIGN KEY (company_code, coa_id, report_code, group_code, layer1_code)
        REFERENCES a_rep_layer1(company_code, coa_id, report_code, group_code, layer1_code),
    ADD CHECK (layer2_code ~ '^[A-Za-z0-9]+$');

COMMENT ON COLUMN a_rep_code.report_code IS 'Alphanumeric financial report code.';
COMMENT ON COLUMN a_rep_group.group_code IS 'Alphanumeric financial report group code.';
COMMENT ON COLUMN a_rep_layer1.layer1_code IS 'Alphanumeric financial statement layer code.';
COMMENT ON COLUMN a_rep_spec.layer2_code IS 'Alphanumeric financial statement specification code.';
