DO $$
DECLARE constraint_row record;
BEGIN
    FOR constraint_row IN
        SELECT conrelid::regclass AS table_name, conname
        FROM pg_constraint
        WHERE contype IN ('p', 'f')
          AND conrelid IN ('a_coa'::regclass, 'a_rep_code'::regclass, 'a_rep_group'::regclass,
                           'a_rep_layer1'::regclass, 'a_rep_spec'::regclass)
        ORDER BY CASE WHEN contype = 'f' THEN 0 ELSE 1 END
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_row.table_name, constraint_row.conname);
    END LOOP;
END $$;

UPDATE a_coa SET coa_id = NULLIF(regexp_replace(coa_id, '[^0-9]', '', 'g'), '');
UPDATE a_rep_code SET coa_id = NULLIF(regexp_replace(coa_id, '[^0-9]', '', 'g'), '');
UPDATE a_rep_group SET coa_id = NULLIF(regexp_replace(coa_id, '[^0-9]', '', 'g'), '');
UPDATE a_rep_layer1 SET coa_id = NULLIF(regexp_replace(coa_id, '[^0-9]', '', 'g'), '');
UPDATE a_rep_spec SET coa_id = NULLIF(regexp_replace(coa_id, '[^0-9]', '', 'g'), '');

ALTER TABLE a_coa ALTER COLUMN coa_id TYPE bigint USING coa_id::bigint;
ALTER TABLE a_rep_code
    ALTER COLUMN coa_id TYPE bigint USING coa_id::bigint,
    ALTER COLUMN report_code TYPE integer USING report_code::integer;
ALTER TABLE a_rep_group
    ALTER COLUMN coa_id TYPE bigint USING coa_id::bigint,
    ALTER COLUMN report_code TYPE integer USING report_code::integer,
    ALTER COLUMN group_code TYPE integer USING group_code::integer;
ALTER TABLE a_rep_layer1
    ALTER COLUMN coa_id TYPE bigint USING coa_id::bigint,
    ALTER COLUMN report_code TYPE integer USING report_code::integer,
    ALTER COLUMN group_code TYPE integer USING group_code::integer,
    ALTER COLUMN layer1_code TYPE integer USING layer1_code::integer;
ALTER TABLE a_rep_spec
    ALTER COLUMN coa_id TYPE bigint USING coa_id::bigint,
    ALTER COLUMN report_code TYPE integer USING report_code::integer,
    ALTER COLUMN group_code TYPE integer USING group_code::integer,
    ALTER COLUMN layer1_code TYPE integer USING layer1_code::integer,
    ALTER COLUMN layer2_code TYPE bigint USING layer2_code::bigint,
    ALTER COLUMN note_id TYPE bigint USING note_id::bigint;

ALTER TABLE a_coa ADD PRIMARY KEY (coa_id), ADD CHECK (coa_id BETWEEN 1 AND 99);
ALTER TABLE a_rep_code
    ADD PRIMARY KEY (company_code, coa_id, report_code),
    ADD FOREIGN KEY (company_code) REFERENCES organizations(code),
    ADD FOREIGN KEY (coa_id) REFERENCES a_coa(coa_id),
    ADD CHECK (report_code BETWEEN 1 AND 99);
ALTER TABLE a_rep_group
    ADD PRIMARY KEY (company_code, coa_id, report_code, group_code),
    ADD FOREIGN KEY (company_code, coa_id, report_code)
        REFERENCES a_rep_code(company_code, coa_id, report_code),
    ADD CHECK (group_code BETWEEN 1 AND 999);
ALTER TABLE a_rep_layer1
    ADD PRIMARY KEY (company_code, coa_id, report_code, group_code, layer1_code),
    ADD FOREIGN KEY (company_code, coa_id, report_code, group_code)
        REFERENCES a_rep_group(company_code, coa_id, report_code, group_code),
    ADD CHECK (layer1_code BETWEEN 1 AND 999);
ALTER TABLE a_rep_spec
    ADD PRIMARY KEY (company_code, coa_id, report_type, report_code, group_code, layer1_code, layer2_code),
    ADD FOREIGN KEY (company_code, coa_id, report_code, group_code, layer1_code)
        REFERENCES a_rep_layer1(company_code, coa_id, report_code, group_code, layer1_code),
    ADD CHECK (layer2_code BETWEEN 1 AND 999999),
    ADD CHECK (note_id IS NULL OR note_id BETWEEN 1 AND 999999);

COMMENT ON COLUMN a_coa.coa_id IS 'Positive numeric chart-of-accounts identifier.';
