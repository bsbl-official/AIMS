ALTER TABLE refresh_tokens
    ADD COLUMN mfa_verified_at timestamptz;

COMMENT ON COLUMN refresh_tokens.mfa_verified_at IS
    'Time the session last completed an MFA challenge; preserved across refresh rotation.';
