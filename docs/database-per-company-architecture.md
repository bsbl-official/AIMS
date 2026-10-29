# Database-per-company architecture

## Target topology

AIMS uses one **platform database** and one **tenant database per company**.

```text
account_bm_platform
  users, refresh tokens, companies, memberships, roles,
  permissions, tenant database registry, provisioning jobs,
  platform audit events

account_bm_t_<immutable-company-key>
  company profile snapshot, branches, project codes, finance codes,
  component codes, currencies, fiscal years and periods, chart of accounts,
  journals and lines, sequences, tenant audit events, outbox events
```

The tenant database name is generated from an immutable UUID-based key. It must
never be generated directly from a company name or editable company code.

## Platform database

The platform database is the control plane. The `organizations` record owns the
tenant database registry fields:

| Column | Purpose |
| --- | --- |
| `tenant_key` | Immutable random identifier used in database names |
| `database_name` | Physical PostgreSQL database name |
| `database_status` | `PROVISIONING`, `READY`, `FAILED`, `SUSPENDED` |
| `schema_version` | Last successfully applied tenant migration |
| `provisioned_at` | Successful provisioning time |
| `provisioning_error` | Sanitized last failure for operations |

Database passwords are not stored in `organizations`. Runtime credentials come
from environment variables or a production secret manager. If every company
uses a separate PostgreSQL role, the registry stores a secret reference, never
the secret value.

The fixed company assignment is resolved during login. The JWT contains the
company UUID and allowed branch UUIDs. Every tenant request must compare the
path company UUID with that authenticated scope before selecting a datasource.
The super administrator may explicitly select any company through a platform
operation.

## Tenant databases

Tenant tables do not need `organization_id`; the database is already the hard
tenant boundary. Parent-child constraints remain inside the database:

```text
project_codes
  └── finance_codes.project_code_id
        └── component_codes(project_code_id, finance_code_id)

branches
  └── journals.branch_id

fiscal_years
  └── fiscal_periods
        └── journals.fiscal_period_id

accounts (self-referencing hierarchy)
  └── journal_lines.account_id
```

Component codes use a composite foreign key to finance codes so a component
cannot combine a project with a finance code belonging to another project.
Ledger balance, period controls, voucher immutability, and optimistic locking
remain enforced inside each tenant database.

## Spring Boot routing

Use two datasource layers:

1. `PlatformJdbcTemplate` is the primary datasource and is used only by login,
   users, roles, companies, provisioning, and platform audit services.
2. `TenantDataSourceManager` resolves the company registry record, creates a
   bounded Hikari pool for that tenant, and returns a tenant `JdbcTemplate`.

Tenant services use an explicit boundary such as:

```java
tenantJdbc.withCompany(companyId, jdbc ->
    jdbc.query("select id, code, name from project_codes order by code", mapper));
```

Explicit company selection is preferable to an unrestricted thread-local. It
keeps background jobs, async work, and super-admin operations from accidentally
using the previous request's tenant.

Pools must be cached with an idle timeout and maximum cache size. Keeping one
permanent Hikari pool for every company will exhaust connections as the number
of companies grows. Production should place PgBouncer in front of PostgreSQL or
use a managed equivalent.

## Company provisioning

Creating a company is a state machine because PostgreSQL `CREATE DATABASE`
cannot run inside the platform transaction:

1. Insert the platform company with `database_status = 'PROVISIONING'`.
2. Commit the platform transaction.
3. A provisioning worker creates the database using a restricted provisioner
   credential with `CREATEDB`.
4. Run Flyway migrations from `classpath:db/tenant` against the new database.
5. Seed the company profile, base currency, head-office branch, default fiscal
   configuration, and required system data.
6. Mark the registry record `READY` and record its schema version.
7. On failure, mark it `FAILED`; retrying must be idempotent.

The web API should return the company and provisioning status. Users cannot be
assigned or log in until the tenant is `READY`.

## Transaction and reporting rules

- One accounting command changes one tenant database, preserving local ACID.
- Platform and tenant writes are coordinated with idempotent jobs/outbox events,
  not distributed XA transactions.
- Consolidated and cross-company reports are built from immutable exports into
  a reporting database or warehouse.
- Backups and restore drills operate per tenant database, allowing one company
  to be restored without affecting others.
- Flyway tenant migrations run in controlled batches, record failures per
  company, and stop routing traffic to tenants below the required version.

## Runtime configuration

Development can host the platform database and all tenant databases in one
PostgreSQL server. Production may distribute them across clusters while keeping
the same registry contract.

```text
PLATFORM_DB_URL=jdbc:postgresql://localhost:5432/account_bm_platform
PLATFORM_DB_USERNAME=account_bm_platform
PLATFORM_DB_PASSWORD=...

TENANT_DB_JDBC_BASE_URL=jdbc:postgresql://localhost:5432/
TENANT_DB_RUNTIME_USERNAME=account_bm_tenant
TENANT_DB_RUNTIME_PASSWORD=...
TENANT_DB_PROVISIONER_USERNAME=account_bm_provisioner
TENANT_DB_PROVISIONER_PASSWORD=...
TENANT_DB_NAME_PREFIX=account_bm_t_
TENANT_POOL_MAX_SIZE=10
TENANT_POOL_MIN_IDLE=0
TENANT_POOL_CACHE_SIZE=100
TENANT_POOL_IDLE_MINUTES=15
```

The provisioner credential is used only by the provisioning worker. The API's
normal runtime credential must not have `CREATEDB`.

## Migration from the current shared database

This conversion must be incremental and verifiable:

1. Add tenant registry and provisioning state to the platform database.
2. Split Flyway SQL into `db/platform` and `db/tenant` locations.
3. Provision a tenant database for every existing company.
4. Copy each company's branches and accounting rows in dependency order.
5. Compare row counts, financial totals, journal debit/credit totals, and hashes.
6. Put that company into a short maintenance window, copy the final delta, and
   switch its services to the tenant datasource.
7. Keep shared rows read-only during the verification period.
8. Remove legacy tenant tables from the platform database only after backups and
   reconciliation reports have been accepted.

Rewriting the existing Flyway files would break checksum history. New platform
migrations and a new tenant migration lineage must be introduced instead.
