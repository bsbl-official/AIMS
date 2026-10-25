CREATE OR REPLACE FUNCTION reject_account_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    cycle_found boolean;
    calculated_level smallint;
    parent_category varchar(20);
    child_category varchar(20);
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.hierarchy_level := 0;
        RETURN NEW;
    END IF;

    WITH RECURSIVE ancestors AS (
        SELECT id, parent_id
        FROM accounts
        WHERE organization_id = NEW.organization_id AND id = NEW.parent_id
        UNION ALL
        SELECT account.id, account.parent_id
        FROM accounts account
        JOIN ancestors ON account.id = ancestors.parent_id
        WHERE account.organization_id = NEW.organization_id
    )
    SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO cycle_found;

    IF cycle_found THEN
        RAISE EXCEPTION 'Account hierarchy cannot contain a cycle' USING ERRCODE = '23514';
    END IF;

    SELECT hierarchy_level + 1 INTO calculated_level
    FROM accounts
    WHERE organization_id = NEW.organization_id AND id = NEW.parent_id;

    IF calculated_level IS NULL OR calculated_level > 20 THEN
        RAISE EXCEPTION 'Invalid account parent or hierarchy exceeds 20 levels' USING ERRCODE = '23514';
    END IF;

    SELECT account_type.category INTO parent_category
    FROM accounts parent_account
    JOIN account_types account_type ON account_type.code = parent_account.account_type_code
    WHERE parent_account.organization_id = NEW.organization_id AND parent_account.id = NEW.parent_id;

    SELECT category INTO child_category FROM account_types WHERE code = NEW.account_type_code;
    IF parent_category <> child_category THEN
        RAISE EXCEPTION 'A child account must have the same accounting category as its parent' USING ERRCODE = '23514';
    END IF;

    NEW.hierarchy_level := calculated_level;
    RETURN NEW;
END;
$$;

CREATE TRIGGER account_hierarchy_guard
BEFORE INSERT OR UPDATE OF parent_id, account_type_code ON accounts
FOR EACH ROW EXECUTE FUNCTION reject_account_cycle();

CREATE OR REPLACE FUNCTION reject_incompatible_parent_category_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    new_category varchar(20);
    incompatible_children integer;
BEGIN
    SELECT category INTO new_category FROM account_types WHERE code = NEW.account_type_code;
    SELECT count(*) INTO incompatible_children
    FROM accounts child
    JOIN account_types child_type ON child_type.code = child.account_type_code
    WHERE child.organization_id = NEW.organization_id
      AND child.parent_id = NEW.id
      AND child_type.category <> new_category;

    IF incompatible_children > 0 THEN
        RAISE EXCEPTION 'An account category must match the category of its children' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER account_child_category_guard
BEFORE UPDATE OF account_type_code ON accounts
FOR EACH ROW EXECUTE FUNCTION reject_incompatible_parent_category_change();

CREATE OR REPLACE FUNCTION enforce_period_within_fiscal_year()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    year_start date;
    year_end date;
BEGIN
    SELECT start_date, end_date INTO year_start, year_end
    FROM fiscal_years
    WHERE organization_id = NEW.organization_id AND id = NEW.fiscal_year_id;

    IF NEW.start_date < year_start OR NEW.end_date > year_end THEN
        RAISE EXCEPTION 'Accounting period must be contained in its fiscal year' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER accounting_period_year_guard
BEFORE INSERT OR UPDATE OF fiscal_year_id, start_date, end_date ON accounting_periods
FOR EACH ROW EXECUTE FUNCTION enforce_period_within_fiscal_year();

CREATE OR REPLACE FUNCTION enforce_open_accounting_period()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    period_status varchar(20);
    period_start date;
    period_end date;
BEGIN
    IF NEW.status IN ('SUBMITTED', 'APPROVED', 'POSTED')
       AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status
            OR OLD.entry_date IS DISTINCT FROM NEW.entry_date OR OLD.period_id IS DISTINCT FROM NEW.period_id) THEN
        SELECT status, start_date, end_date
        INTO period_status, period_start, period_end
        FROM accounting_periods
        WHERE organization_id = NEW.organization_id AND id = NEW.period_id
        FOR SHARE;

        IF period_status NOT IN ('OPEN', 'SOFT_CLOSED') THEN
            RAISE EXCEPTION 'Journal cannot be processed in a % period', period_status USING ERRCODE = '23514';
        END IF;
        IF NEW.status = 'POSTED' AND period_status <> 'OPEN' THEN
            RAISE EXCEPTION 'Journal can only be posted to an open period' USING ERRCODE = '23514';
        END IF;
        IF NEW.entry_date NOT BETWEEN period_start AND period_end THEN
            RAISE EXCEPTION 'Journal date is outside its accounting period' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER journal_period_guard
BEFORE INSERT OR UPDATE OF status, entry_date, period_id ON journals
FOR EACH ROW EXECUTE FUNCTION enforce_open_accounting_period();

CREATE OR REPLACE FUNCTION protect_posted_journal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'POSTED' THEN
        RAISE EXCEPTION 'Posted journals are immutable; create a reversal voucher' USING ERRCODE = '55000';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER posted_journal_immutable
BEFORE UPDATE OR DELETE ON journals
FOR EACH ROW EXECUTE FUNCTION protect_posted_journal();

CREATE OR REPLACE FUNCTION protect_posted_journal_line()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_status varchar(20);
    target_journal_id uuid;
BEGIN
    target_journal_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.journal_id ELSE NEW.journal_id END;
    SELECT status INTO parent_status FROM journals WHERE id = target_journal_id;
    IF parent_status = 'POSTED' THEN
        RAISE EXCEPTION 'Lines of a posted journal are immutable; create a reversal voucher' USING ERRCODE = '55000';
    END IF;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER posted_journal_line_immutable
BEFORE UPDATE OR DELETE ON journal_lines
FOR EACH ROW EXECUTE FUNCTION protect_posted_journal_line();

CREATE OR REPLACE FUNCTION validate_posted_journal(p_journal_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    journal_status varchar(20);
    line_count integer;
    debit_sum numeric(24, 6);
    credit_sum numeric(24, 6);
    base_debit_sum numeric(24, 6);
    base_credit_sum numeric(24, 6);
    header_debit numeric(24, 6);
    header_credit numeric(24, 6);
    invalid_account_count integer;
BEGIN
    SELECT status, total_debit, total_credit
    INTO journal_status, header_debit, header_credit
    FROM journals WHERE id = p_journal_id;

    IF journal_status = 'POSTED' THEN
        SELECT count(*), coalesce(sum(debit_amount), 0), coalesce(sum(credit_amount), 0),
               coalesce(sum(base_debit_amount), 0), coalesce(sum(base_credit_amount), 0)
        INTO line_count, debit_sum, credit_sum, base_debit_sum, base_credit_sum
        FROM journal_lines WHERE journal_id = p_journal_id;

        IF line_count < 2 THEN
            RAISE EXCEPTION 'A posted journal requires at least two lines' USING ERRCODE = '23514';
        END IF;
        IF debit_sum <> credit_sum OR base_debit_sum <> base_credit_sum THEN
            RAISE EXCEPTION 'A posted journal must balance in transaction and base currency' USING ERRCODE = '23514';
        END IF;
        IF header_debit <> debit_sum OR header_credit <> credit_sum THEN
            RAISE EXCEPTION 'Journal header totals must equal line totals' USING ERRCODE = '23514';
        END IF;

        SELECT count(*) INTO invalid_account_count
        FROM journal_lines line
        JOIN journals journal ON journal.id = line.journal_id
        JOIN accounts account ON account.id = line.account_id
        WHERE line.journal_id = p_journal_id
          AND (account.status <> 'ACTIVE' OR NOT account.allow_posting
               OR journal.entry_date < account.valid_from
               OR (account.valid_to IS NOT NULL AND journal.entry_date > account.valid_to));

        IF invalid_account_count > 0 THEN
            RAISE EXCEPTION 'Posted journal contains an inactive, header, or out-of-date account' USING ERRCODE = '23514';
        END IF;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION validate_posted_journal_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM validate_posted_journal(CASE WHEN TG_OP = 'DELETE' THEN OLD.journal_id ELSE NEW.journal_id END);
    IF TG_OP = 'UPDATE' AND OLD.journal_id <> NEW.journal_id THEN
        PERFORM validate_posted_journal(OLD.journal_id);
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION validate_posted_journal_header_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM validate_posted_journal(NEW.id);
    RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER balanced_journal_lines
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_posted_journal_trigger();

CREATE CONSTRAINT TRIGGER balanced_journal_header
AFTER INSERT OR UPDATE ON journals
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_posted_journal_header_trigger();

CREATE OR REPLACE FUNCTION reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit events are append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER audit_events_append_only
BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

COMMENT ON TABLE journals IS 'Voucher header. Only POSTED journals affect the general ledger.';
COMMENT ON TABLE journal_lines IS 'Double-entry lines in transaction and organization base currency.';
COMMENT ON COLUMN journal_lines.dimensions IS 'Extensible validated dimensions such as cost center, project, or branch.';
COMMENT ON TABLE audit_events IS 'Append-only security and business audit trail.';
