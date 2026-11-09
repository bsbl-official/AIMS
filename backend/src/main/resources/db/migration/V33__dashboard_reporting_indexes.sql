CREATE INDEX IF NOT EXISTS ix_a_dr_dashboard
    ON a_dr (organization_id, branch_id, voucher_date);

CREATE INDEX IF NOT EXISTS ix_a_cr_dashboard
    ON a_cr (organization_id, branch_id, voucher_date);

CREATE INDEX IF NOT EXISTS ix_a_jv_dashboard
    ON a_jv (organization_id, branch_id, voucher_date);

CREATE INDEX IF NOT EXISTS ix_journals_dashboard
    ON journals (organization_id, branch_id, posting_date, status);

CREATE INDEX IF NOT EXISTS ix_journals_dashboard_entry
    ON journals (organization_id, branch_id, entry_date, status);
