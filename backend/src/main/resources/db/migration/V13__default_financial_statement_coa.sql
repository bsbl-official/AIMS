INSERT INTO a_coa (coa_id, coa_desc, ins_user, device_flage)
VALUES ('FS0001', 'Financial Statement', 'SYSTEM', 'N')
ON CONFLICT (coa_id) DO NOTHING;

COMMENT ON COLUMN a_rep_code.coa_id IS
    'Internal financial statement COA key. The application resolves this value automatically.';
