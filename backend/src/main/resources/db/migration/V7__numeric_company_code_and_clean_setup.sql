-- Start company setup from a clean state. Reference catalogues such as currencies remain intact.
TRUNCATE TABLE organizations, user_profiles CASCADE;

CREATE TEMP TABLE organization_foreign_keys AS
SELECT conrelid::regclass::text AS table_name,
       conname,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f'
  AND confrelid = 'organizations'::regclass;

DO $$
DECLARE
    item record;
BEGIN
    FOR item IN SELECT table_name, conname FROM organization_foreign_keys LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', item.table_name, item.conname);
    END LOOP;
END $$;

ALTER TABLE organizations
    ADD CONSTRAINT uq_organizations_internal_id UNIQUE (id),
    DROP CONSTRAINT organizations_pkey,
    DROP CONSTRAINT organizations_code_key,
    ALTER COLUMN code TYPE bigint USING code::bigint,
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (code),
    ADD CONSTRAINT ck_organizations_code_positive CHECK (code > 0);

DO $$
DECLARE
    item record;
BEGIN
    FOR item IN SELECT table_name, conname, definition FROM organization_foreign_keys LOOP
        EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', item.table_name, item.conname, item.definition);
    END LOOP;
END $$;

DROP TABLE organization_foreign_keys;

COMMENT ON COLUMN organizations.code IS
    'Required positive integer business identifier and primary key for the company.';
COMMENT ON COLUMN organizations.id IS
    'Stable internal UUID retained as a unique relationship key for tenant-owned records.';
