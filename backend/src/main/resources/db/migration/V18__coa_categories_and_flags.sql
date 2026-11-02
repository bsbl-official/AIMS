-- Minimal category dictionary for A_L2. Preserve any codes from the V17 setup.
CREATE TABLE category_info (
    category_code varchar(6) PRIMARY KEY,
    category_desc varchar(100)
);
INSERT INTO category_info (category_code, category_desc)
SELECT DISTINCT category_code, category_code FROM a_l2 WHERE category_code IS NOT NULL;
ALTER TABLE a_l2 ADD CONSTRAINT fk_a_l2_category FOREIGN KEY (category_code) REFERENCES category_info(category_code);

DO $$
DECLARE target_table text; target_field text;
BEGIN
    FOREACH target_table IN ARRAY ARRAY['a_l1','a_l2','a_l3','a_l4','a_acc_head'] LOOP
        FOR target_field IN SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = target_table
              AND (right(column_name, 5) = '_flag' OR column_name = 'device_flage')
        LOOP
            EXECUTE format('UPDATE %I SET %I = ''N'' WHERE %I IS NULL', target_table, target_field, target_field);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN %I SET DEFAULT ''N''', target_table, target_field);
        END LOOP;
    END LOOP;
END $$;
