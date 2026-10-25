CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE currencies (
    code                 varchar(3) PRIMARY KEY,
    name                 varchar(80) NOT NULL,
    symbol               varchar(12),
    decimal_places       smallint NOT NULL DEFAULT 2 CHECK (decimal_places BETWEEN 0 AND 6),
    active               boolean NOT NULL DEFAULT true
);

CREATE TABLE organizations (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                 varchar(40) NOT NULL UNIQUE,
    legal_name           varchar(200) NOT NULL,
    registration_number  varchar(100),
    tax_identifier       varchar(100),
    base_currency_code   varchar(3) NOT NULL REFERENCES currencies(code),
    timezone             varchar(60) NOT NULL DEFAULT 'UTC',
    locale               varchar(20) NOT NULL DEFAULT 'en',
    status               varchar(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    UNIQUE (id, base_currency_code)
);

CREATE TABLE user_profiles (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_subject     varchar(255) NOT NULL UNIQUE,
    email                varchar(320) NOT NULL,
    display_name         varchar(160) NOT NULL,
    status               varchar(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED')),
    last_login_at        timestamptz,
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX uq_user_profiles_email_ci ON user_profiles (lower(email));

CREATE TABLE organization_memberships (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    user_id              uuid NOT NULL REFERENCES user_profiles(id),
    status               varchar(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
    joined_at            timestamptz,
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    UNIQUE (organization_id, user_id),
    UNIQUE (organization_id, id)
);

CREATE TABLE roles (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    code                 varchar(60) NOT NULL,
    name                 varchar(120) NOT NULL,
    system_role          boolean NOT NULL DEFAULT false,
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    UNIQUE (organization_id, code),
    UNIQUE (organization_id, id)
);

CREATE TABLE permissions (
    code                 varchar(100) PRIMARY KEY,
    description          varchar(255) NOT NULL
);

CREATE TABLE role_permissions (
    organization_id      uuid NOT NULL,
    role_id              uuid NOT NULL,
    permission_code      varchar(100) NOT NULL REFERENCES permissions(code),
    PRIMARY KEY (role_id, permission_code),
    FOREIGN KEY (organization_id, role_id) REFERENCES roles(organization_id, id)
);

CREATE TABLE membership_roles (
    organization_id      uuid NOT NULL,
    membership_id        uuid NOT NULL,
    role_id              uuid NOT NULL,
    PRIMARY KEY (membership_id, role_id),
    FOREIGN KEY (organization_id, membership_id)
        REFERENCES organization_memberships(organization_id, id),
    FOREIGN KEY (organization_id, role_id) REFERENCES roles(organization_id, id)
);

CREATE TABLE exchange_rates (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    from_currency_code   varchar(3) NOT NULL REFERENCES currencies(code),
    to_currency_code     varchar(3) NOT NULL REFERENCES currencies(code),
    rate_date            date NOT NULL,
    rate_type            varchar(20) NOT NULL DEFAULT 'SPOT'
                         CHECK (rate_type IN ('SPOT', 'AVERAGE', 'CLOSING', 'HISTORICAL')),
    rate                 numeric(24, 12) NOT NULL CHECK (rate > 0),
    source               varchar(120),
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_by           uuid REFERENCES user_profiles(id),
    UNIQUE (organization_id, from_currency_code, to_currency_code, rate_date, rate_type),
    CHECK (from_currency_code <> to_currency_code)
);

CREATE TABLE fiscal_years (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    name                 varchar(80) NOT NULL,
    start_date           date NOT NULL,
    end_date             date NOT NULL,
    status               varchar(20) NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('PLANNED', 'OPEN', 'CLOSED')),
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    CHECK (start_date <= end_date),
    UNIQUE (organization_id, name),
    UNIQUE (organization_id, id),
    CONSTRAINT ex_fiscal_years_no_overlap EXCLUDE USING gist
        (organization_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
);

CREATE TABLE accounting_periods (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL,
    fiscal_year_id       uuid NOT NULL,
    period_number        smallint NOT NULL CHECK (period_number BETWEEN 1 AND 99),
    name                 varchar(80) NOT NULL,
    start_date           date NOT NULL,
    end_date             date NOT NULL,
    status               varchar(20) NOT NULL DEFAULT 'OPEN'
                         CHECK (status IN ('FUTURE', 'OPEN', 'SOFT_CLOSED', 'CLOSED')),
    locked_at            timestamptz,
    locked_by            uuid REFERENCES user_profiles(id),
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    CHECK (start_date <= end_date),
    UNIQUE (organization_id, fiscal_year_id, period_number),
    UNIQUE (organization_id, id),
    CONSTRAINT ex_accounting_periods_no_overlap EXCLUDE USING gist
        (organization_id WITH =, daterange(start_date, end_date, '[]') WITH &&),
    FOREIGN KEY (organization_id, fiscal_year_id) REFERENCES fiscal_years(organization_id, id)
);

CREATE TABLE account_types (
    code                 varchar(30) PRIMARY KEY,
    name                 varchar(80) NOT NULL,
    category             varchar(20) NOT NULL
                         CHECK (category IN ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
    normal_balance       char(1) NOT NULL CHECK (normal_balance IN ('D', 'C')),
    statement_section    varchar(30) NOT NULL
                         CHECK (statement_section IN ('BALANCE_SHEET', 'PROFIT_AND_LOSS', 'OTHER_COMPREHENSIVE_INCOME'))
);

CREATE TABLE accounts (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    parent_id            uuid,
    account_type_code    varchar(30) NOT NULL REFERENCES account_types(code),
    code                 varchar(40) NOT NULL,
    name                 varchar(200) NOT NULL,
    description          text,
    currency_code        varchar(3) REFERENCES currencies(code),
    hierarchy_level      smallint NOT NULL DEFAULT 0 CHECK (hierarchy_level BETWEEN 0 AND 20),
    allow_posting        boolean NOT NULL DEFAULT true,
    control_account      boolean NOT NULL DEFAULT false,
    reconciliation_required boolean NOT NULL DEFAULT false,
    status               varchar(20) NOT NULL DEFAULT 'ACTIVE'
                         CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    valid_from           date NOT NULL DEFAULT current_date,
    valid_to             date,
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    version              bigint NOT NULL DEFAULT 0,
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    CHECK (parent_id IS NULL OR parent_id <> id),
    UNIQUE (organization_id, code),
    UNIQUE (organization_id, id),
    FOREIGN KEY (organization_id, parent_id) REFERENCES accounts(organization_id, id)
);

CREATE TABLE voucher_types (
    code                 varchar(30) PRIMARY KEY,
    name                 varchar(100) NOT NULL,
    default_prefix       varchar(10) NOT NULL,
    description          varchar(255) NOT NULL
);

CREATE TABLE journal_sequences (
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    fiscal_year_id       uuid NOT NULL,
    voucher_type_code    varchar(30) NOT NULL REFERENCES voucher_types(code),
    prefix               varchar(20) NOT NULL,
    next_value           bigint NOT NULL DEFAULT 1 CHECK (next_value > 0),
    version              bigint NOT NULL DEFAULT 0,
    PRIMARY KEY (organization_id, fiscal_year_id, voucher_type_code),
    FOREIGN KEY (organization_id, fiscal_year_id) REFERENCES fiscal_years(organization_id, id)
);

CREATE TABLE journals (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL REFERENCES organizations(id),
    voucher_type_code    varchar(30) NOT NULL REFERENCES voucher_types(code),
    voucher_number       varchar(80) NOT NULL,
    external_reference   varchar(120),
    entry_date           date NOT NULL,
    posting_date         date,
    period_id            uuid NOT NULL,
    currency_code        varchar(3) NOT NULL REFERENCES currencies(code),
    exchange_rate        numeric(24, 12) NOT NULL DEFAULT 1 CHECK (exchange_rate > 0),
    narration            text NOT NULL,
    status               varchar(20) NOT NULL DEFAULT 'DRAFT'
                         CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REJECTED', 'VOIDED')),
    source_module        varchar(40) NOT NULL DEFAULT 'GENERAL_LEDGER',
    original_journal_id  uuid,
    total_debit          numeric(24, 6) NOT NULL DEFAULT 0 CHECK (total_debit >= 0),
    total_credit         numeric(24, 6) NOT NULL DEFAULT 0 CHECK (total_credit >= 0),
    created_by           uuid NOT NULL REFERENCES user_profiles(id),
    submitted_by         uuid REFERENCES user_profiles(id),
    approved_by          uuid REFERENCES user_profiles(id),
    posted_by            uuid REFERENCES user_profiles(id),
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    posted_at            timestamptz,
    version              bigint NOT NULL DEFAULT 0,
    UNIQUE (organization_id, voucher_number),
    UNIQUE (organization_id, id),
    UNIQUE (original_journal_id),
    FOREIGN KEY (organization_id, period_id) REFERENCES accounting_periods(organization_id, id),
    FOREIGN KEY (organization_id, original_journal_id) REFERENCES journals(organization_id, id),
    CHECK ((status = 'POSTED' AND posting_date IS NOT NULL AND posted_at IS NOT NULL AND posted_by IS NOT NULL)
        OR status <> 'POSTED'),
    CHECK (original_journal_id IS NULL OR original_journal_id <> id)
);

CREATE TABLE journal_lines (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid NOT NULL,
    journal_id           uuid NOT NULL,
    line_number          integer NOT NULL CHECK (line_number > 0),
    account_id           uuid NOT NULL,
    description          varchar(500),
    debit_amount         numeric(24, 6) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0),
    credit_amount        numeric(24, 6) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
    base_debit_amount    numeric(24, 6) NOT NULL DEFAULT 0 CHECK (base_debit_amount >= 0),
    base_credit_amount   numeric(24, 6) NOT NULL DEFAULT 0 CHECK (base_credit_amount >= 0),
    dimensions           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (journal_id, line_number),
    FOREIGN KEY (organization_id, journal_id) REFERENCES journals(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, account_id) REFERENCES accounts(organization_id, id),
    CHECK ((debit_amount > 0 AND credit_amount = 0) OR (credit_amount > 0 AND debit_amount = 0)),
    CHECK ((base_debit_amount > 0 AND base_credit_amount = 0)
        OR (base_credit_amount > 0 AND base_debit_amount = 0)),
    CHECK (jsonb_typeof(dimensions) = 'object')
);

CREATE TABLE audit_events (
    id                   bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organization_id      uuid REFERENCES organizations(id),
    actor_user_id        uuid REFERENCES user_profiles(id),
    action               varchar(80) NOT NULL,
    entity_type          varchar(80) NOT NULL,
    entity_id            varchar(100) NOT NULL,
    occurred_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    correlation_id       uuid,
    request_id           varchar(100),
    ip_address           inet,
    before_state         jsonb,
    after_state          jsonb,
    metadata             jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE outbox_events (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id      uuid REFERENCES organizations(id),
    aggregate_type       varchar(80) NOT NULL,
    aggregate_id         varchar(100) NOT NULL,
    event_type           varchar(120) NOT NULL,
    payload              jsonb NOT NULL,
    occurred_at          timestamptz NOT NULL DEFAULT clock_timestamp(),
    published_at         timestamptz,
    attempts             integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    last_error           text
);

CREATE INDEX ix_memberships_user ON organization_memberships (user_id, status);
CREATE INDEX ix_exchange_rates_lookup ON exchange_rates
    (organization_id, from_currency_code, to_currency_code, rate_date DESC);
CREATE INDEX ix_periods_date ON accounting_periods (organization_id, start_date, end_date);
CREATE INDEX ix_accounts_parent ON accounts (organization_id, parent_id);
CREATE INDEX ix_accounts_type ON accounts (organization_id, account_type_code, status);
CREATE INDEX ix_journals_period_status ON journals (organization_id, period_id, status);
CREATE INDEX ix_journals_entry_date ON journals (organization_id, entry_date DESC);
CREATE INDEX ix_journal_lines_account ON journal_lines (organization_id, account_id, journal_id);
CREATE INDEX ix_journal_lines_dimensions ON journal_lines USING gin (dimensions);
CREATE INDEX ix_audit_entity ON audit_events (organization_id, entity_type, entity_id, occurred_at DESC);
CREATE INDEX ix_outbox_unpublished ON outbox_events (occurred_at) WHERE published_at IS NULL;

INSERT INTO currencies (code, name, symbol, decimal_places) VALUES
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'Pound Sterling', '£', 2),
    ('BDT', 'Bangladeshi Taka', '৳', 2),
    ('JPY', 'Japanese Yen', '¥', 0);

INSERT INTO account_types (code, name, category, normal_balance, statement_section) VALUES
    ('CURRENT_ASSET', 'Current Asset', 'ASSET', 'D', 'BALANCE_SHEET'),
    ('NON_CURRENT_ASSET', 'Non-current Asset', 'ASSET', 'D', 'BALANCE_SHEET'),
    ('CURRENT_LIABILITY', 'Current Liability', 'LIABILITY', 'C', 'BALANCE_SHEET'),
    ('NON_CURRENT_LIABILITY', 'Non-current Liability', 'LIABILITY', 'C', 'BALANCE_SHEET'),
    ('EQUITY', 'Equity', 'EQUITY', 'C', 'BALANCE_SHEET'),
    ('REVENUE', 'Revenue', 'INCOME', 'C', 'PROFIT_AND_LOSS'),
    ('OTHER_INCOME', 'Other Income', 'INCOME', 'C', 'PROFIT_AND_LOSS'),
    ('COST_OF_SALES', 'Cost of Sales', 'EXPENSE', 'D', 'PROFIT_AND_LOSS'),
    ('OPERATING_EXPENSE', 'Operating Expense', 'EXPENSE', 'D', 'PROFIT_AND_LOSS'),
    ('OTHER_EXPENSE', 'Other Expense', 'EXPENSE', 'D', 'PROFIT_AND_LOSS'),
    ('OCI', 'Other Comprehensive Income', 'EQUITY', 'C', 'OTHER_COMPREHENSIVE_INCOME');

INSERT INTO voucher_types (code, name, default_prefix, description) VALUES
    ('JOURNAL', 'Journal Voucher', 'JV', 'General double-entry journal'),
    ('RECEIPT', 'Receipt Voucher', 'RV', 'Cash or bank receipt'),
    ('PAYMENT', 'Payment Voucher', 'PV', 'Cash or bank payment'),
    ('CONTRA', 'Contra Voucher', 'CV', 'Transfer between cash and bank accounts'),
    ('ADJUSTMENT', 'Adjustment Voucher', 'AV', 'Period-end and correcting adjustment'),
    ('REVERSAL', 'Reversal Voucher', 'REV', 'Exact reversal of a posted journal');

INSERT INTO permissions (code, description) VALUES
    ('coa.read', 'View the chart of accounts'),
    ('coa.manage', 'Create and maintain accounts'),
    ('journal.read', 'View journals and vouchers'),
    ('journal.create', 'Create draft journals and vouchers'),
    ('journal.submit', 'Submit journals for approval'),
    ('journal.approve', 'Approve or reject submitted journals'),
    ('journal.post', 'Post approved journals to the ledger'),
    ('period.manage', 'Open, soft-close, and close accounting periods'),
    ('organization.manage', 'Manage organization settings and users'),
    ('report.read', 'View accounting and financial reports');
