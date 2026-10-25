ALTER TABLE organizations
    DROP CONSTRAINT ck_organizations_code_positive,
    ALTER COLUMN code TYPE varchar(40) USING lpad(code::text, 2, '0'),
    ADD CONSTRAINT ck_organizations_code_digits CHECK (code ~ '^[0-9]+$');

COMMENT ON COLUMN organizations.code IS
    'Required digits-only business identifier and primary key. Stored as text to preserve leading zeros.';
