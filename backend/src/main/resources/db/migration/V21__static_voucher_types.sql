ALTER TABLE a_vr_type DROP CONSTRAINT IF EXISTS a_vr_type_voucher_type_check;

UPDATE a_vr_type SET voucher_type = CASE voucher_class || ':' || voucher_type
    WHEN 'CREDIT:BANK' THEN 'BCR'
    WHEN 'CREDIT:CASH' THEN 'CCR'
    WHEN 'DEBIT:BANK' THEN 'BDR'
    WHEN 'DEBIT:CASH' THEN 'CDR'
    WHEN 'JOURNAL:OTHERS' THEN 'JJV'
    ELSE voucher_type
END;

UPDATE a_vr_type SET voucher_description = CASE voucher_type
    WHEN 'BCR' THEN 'BANK CREDIT VOUCHER'
    WHEN 'CCR' THEN 'CASH CREDIT VOUCHER'
    WHEN 'BDR' THEN 'BANK DEBIT VOUCHER'
    WHEN 'CDR' THEN 'CASH DEBIT VOUCHER'
    WHEN 'JJV' THEN 'JOURNAL VOUCHER'
    ELSE voucher_description
END;

ALTER TABLE a_vr_type
    ADD CONSTRAINT ck_a_vr_type_voucher_type CHECK (voucher_type IN ('BCR', 'CCR', 'BDR', 'CDR', 'JJV')) NOT VALID;

ALTER TABLE a_vr_type
    ADD CONSTRAINT ck_a_vr_type_approved_combination CHECK (
        (voucher_class = 'CREDIT' AND voucher_type IN ('BCR', 'CCR'))
        OR (voucher_class = 'DEBIT' AND voucher_type IN ('BDR', 'CDR'))
        OR (voucher_class = 'JOURNAL' AND voucher_type = 'JJV')
    ) NOT VALID;
