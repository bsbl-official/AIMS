DO $$
DECLARE voucher_table text;
BEGIN
    FOREACH voucher_table IN ARRAY ARRAY['a_dr', 'a_cr', 'a_jv'] LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN photo_data bytea, ADD COLUMN photo_name varchar(255), ADD COLUMN photo_content_type varchar(30), ADD COLUMN photo_size integer', voucher_table);
        EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I CHECK ((photo_data IS NULL AND photo_name IS NULL AND photo_content_type IS NULL AND photo_size IS NULL) OR (photo_data IS NOT NULL AND photo_name IS NOT NULL AND photo_content_type IN (''image/jpeg'',''image/png'',''image/webp'') AND photo_size = octet_length(photo_data) AND photo_size BETWEEN 1 AND 5242880))', voucher_table, 'ck_' || voucher_table || '_photo');
    END LOOP;
END $$;
