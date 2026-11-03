-- Store the operational setup context selected by the user. Columns remain nullable
-- for records created before context-aware setup was introduced; the services require
-- and validate every value for all new and updated records.
DO $$
DECLARE target_table text;
BEGIN
    FOREACH target_table IN ARRAY ARRAY[
        'a_l1', 'a_l2', 'a_l3', 'a_l4', 'a_acc_head',
        'a_rep_code', 'a_rep_group', 'a_rep_layer1', 'a_rep_spec'
    ] LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN branch_code varchar(40)', target_table);
        EXECUTE format('ALTER TABLE %I ADD COLUMN project_code integer', target_table);
        EXECUTE format('ALTER TABLE %I ADD COLUMN finance_code integer', target_table);
        EXECUTE format('ALTER TABLE %I ADD COLUMN component_code integer', target_table);
        EXECUTE format('CREATE INDEX %I ON %I (company_code, coa_id, branch_code, project_code, finance_code, component_code)',
            'ix_' || target_table || '_setup_context', target_table);
    END LOOP;
END $$;

COMMENT ON COLUMN a_l1.branch_code IS 'Branch business code selected when the setup record was saved.';
COMMENT ON COLUMN a_l1.project_code IS 'Project code selected when the setup record was saved.';
COMMENT ON COLUMN a_l1.finance_code IS 'Finance code selected when the setup record was saved.';
COMMENT ON COLUMN a_l1.component_code IS 'Component code selected when the setup record was saved.';
