ALTER TABLE a_vr_type ADD COLUMN document_type varchar(10);

UPDATE a_vr_type SET document_type = CASE voucher_type
    WHEN 'BCR' THEN 'BANK'
    WHEN 'BDR' THEN 'BANK'
    WHEN 'CCR' THEN 'CASH'
    WHEN 'CDR' THEN 'CASH'
    WHEN 'JJV' THEN 'OTHERS'
    WHEN 'BANK' THEN 'BANK'
    WHEN 'CASH' THEN 'CASH'
    WHEN 'OTHERS' THEN 'OTHERS'
END;

ALTER TABLE a_vr_type
    ALTER COLUMN document_type SET NOT NULL,
    ADD CONSTRAINT ck_a_vr_type_document_type CHECK (document_type IN ('BANK', 'CASH', 'OTHERS'));

COMMENT ON COLUMN a_vr_type.document_type IS 'Journal document classification: BANK, CASH, or OTHERS.';
