ALTER TABLE a_vr_type
    ADD COLUMN auto_voucher boolean NOT NULL DEFAULT false,
    ADD COLUMN voucher_last_no bigint NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_a_vr_type_voucher_last_no CHECK (voucher_last_no >= 0);

COMMENT ON COLUMN a_vr_type.auto_voucher IS 'When true, voucher creation allocates the next voucher number automatically.';
COMMENT ON COLUMN a_vr_type.voucher_last_no IS 'Last allocated voucher sequence number; may be updated or reset by an authorized user.';
