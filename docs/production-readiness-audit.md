# AIMS production-readiness audit

**Audit date:** 2026-11-08  
**Baseline:** current working tree, including the uncommitted profile and dynamic-permission work  
**Target:** financial-grade, multi-company accounting product using one organization-scoped PostgreSQL database

## Executive verdict

**NO-GO for production financial use.** The application is a promising development-stage foundation, but it is not yet a complete or sufficiently verified accounting system. Four release blockers must be resolved before production:

1. The application writes vouchers to a second, legacy-shaped ledger that only supports `DRAFT`; the stronger posting, period, immutability, and balance controls attached to `journals`/`journal_lines` are therefore not used by the active voucher workflow.
2. Organization isolation is incomplete: numeric project/finance/component IDs are global primary keys, preventing normal code reuse across companies, and several redundant copied codes are not protected by matching constraints.
3. Production can start with known development secrets, and the bootstrap process promotes the configured email to super administrator on every startup.
4. Verification is far below the standard required for financial software: three unit tests, no frontend tests, no integration/cross-organization isolation tests, no CI pipeline, and no demonstrated backup restore or disaster-recovery test.

The system should be treated as an internal alpha until the P0 items and their acceptance tests are complete.

## Audit method and evidence

The review covered the Spring Boot backend, React frontend, 29 Flyway migrations, Docker/NGINX configuration, runtime environment template, database design documents, and the live local HTTP surface.

Verification performed:

- `backend/gradlew.bat test`: passed; only three unit test methods exist, all for voucher-number formatting.
- `frontend/npm run lint`: passed.
- `frontend/npm run build`: passed. Vite reported a 591.48 kB main JavaScript chunk after minification.
- `npm audit --omit=dev`: zero known production-package advisories at audit time (22 production dependencies assessed).
- Live Compose services: PostgreSQL, backend, and frontend were healthy.
- Live database: all Flyway migrations V1-V29 were successful; 49 application tables, 107 foreign keys, and 138 indexes are present.
- Live HTTP checks: unauthenticated APIs returned structured `401` responses; allowed-origin CORS succeeded and an unapproved origin was rejected with `403`.
- The live frontend response did not include CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` headers.

Limitations:

- A clean-database migration replay and an upgrade from a production-sized copy were not performed. Successful migration history proves only that this local database reached V29.
- Browser automation could not connect to the local browser host, so the UX/accessibility conclusions are based on source inspection rather than a completed visual and assistive-technology walkthrough.
- Java dependencies were compiled through Spring Boot dependency management, but no Java CVE/SBOM scanner is configured; the npm result does not cover the JVM or container images.
- No load, soak, penetration, failover, backup-restore, or recovery-point test was available.

## What is already strong

- Access and refresh tokens are placed in `HttpOnly` cookies; unsafe requests use CSRF protection, and credentialed CORS is allow-listed ([SecurityConfig.java](../backend/src/main/java/com/accountbm/common/config/SecurityConfig.java)).
- Passwords use BCrypt cost 12, refresh tokens are stored as SHA-256 hashes, and refresh tokens rotate on use.
- JWT signing secrets shorter than 32 bytes stop application startup.
- Most SQL values are parameterized. Dynamic voucher table names come from a fixed internal map rather than request input.
- Method-level capability checks are broadly applied, and service-layer company checks add a useful second authorization boundary.
- The original ledger schema has good financial controls: organization-aware foreign keys, deferred balance validation, open-period checks, posted-record immutability, reversal support, and append-only audit events.
- Monetary columns use exact numeric types, and mutable setup records generally use optimistic versions.
- Flyway owns schema changes while Hibernate validates, open-in-view is disabled, shutdown is graceful, and health probes are configured.
- Runtime containers use non-root users; the backend filesystem is read-only in Compose.
- Error responses use problem details, and unauthenticated access was correctly rejected in the live check.

## Prioritized findings

| ID | Priority | Area | Finding | Production impact |
|---|---|---|---|---|
| AIMS-001 | P0 | Accounting | Active vouchers bypass the controlled ledger and can never progress beyond `DRAFT`. | No complete posting, approval, reversal, or period-close workflow. |
| AIMS-002 | P0 | Organization isolation | Several IDs are globally scoped and redundant company codes are weakly constrained. | Code values collide between companies and inconsistent cross-company combinations can be represented. |
| AIMS-003 | P0 | Security/config | Known fallback secrets and unconditional super-admin bootstrap are accepted. | A configuration mistake can expose a privileged account or predictable JWT key. |
| AIMS-004 | P0 | Quality/operations | Automated verification, CI, restore evidence, and release controls are missing. | Financial correctness and safe recovery cannot be demonstrated. |
| AIMS-005 | P1 | Authorization | Company permission checks do not enforce a user's assigned branch scope. | A user can potentially access another branch in the same company. |
| AIMS-006 | P1 | Database | IDs and copied business codes coexist without constraints keeping them equal. | Updates can create contradictory accounting dimensions. |
| AIMS-007 | P1 | Accounting | Voucher creation has no idempotency contract despite allowing the header in CORS. | Retries can create duplicate financial documents. |
| AIMS-008 | P1 | Security | No MFA, network-level login throttling, breached-password control, or refresh-token replay-family response. | Account takeover defenses are below a financial-grade baseline. |
| AIMS-009 | P1 | Security | Client IP is derived from the first untrusted `X-Forwarded-For` value. | Audit evidence and any IP control can be spoofed. |
| AIMS-010 | P1 | API/performance | List endpoints are unpaginated and commonly return complete setup/transaction collections. | Latency, memory, and database load grow without a bound. |
| AIMS-011 | P1 | Operations | No production TLS gateway policy, secrets manager, resource limits, SBOM, Java/container scan, or immutable image pinning. | Deployment security and repeatability are not controlled. |
| AIMS-012 | P1 | Recovery | No documented and tested RPO/RTO, PITR, organization-level recovery, or migration rollback procedure. | Data recovery cannot be promised. |
| AIMS-013 | P2 | Attachments | Images are stored as database `bytea`; validation is only MIME plus short magic-byte checks. | Database growth, backup cost, and malicious-file risk increase. |
| AIMS-014 | P2 | Audit/observability | Audit coverage is selective; logs lack a defined request/correlation contract and metrics lack production export/alerts. | Incidents and financial changes are difficult to reconstruct. |
| AIMS-015 | P2 | UX/completeness | Dashboard values are hard-coded sample data. | Users can mistake sample balances for real financial information. |
| AIMS-016 | P2 | Accessibility | Modal focus is not trapped/restored and the custom select lacks a complete combobox/active-descendant model. | Keyboard and assistive-technology use is unreliable. |
| AIMS-017 | P2 | UX/API | Routes are only authentication-gated, not permission-gated; tables lack server paging/sorting and resilient state patterns. | Deep links produce avoidable authorization errors and large screens degrade. |
| AIMS-018 | P2 | Maintainability | Several pages/services are very large, and core UI files are compressed into one-line implementations. | Review, testing, and safe change become harder. |
| AIMS-019 | P2 | Frontend security | NGINX omits CSP/HSTS/referrer/permissions headers and the login email is prefilled with the admin address. | Browser hardening is incomplete and privileged identity is disclosed. |
| AIMS-020 | P3 | Performance | The initial bundle exceeds the configured 500 kB warning threshold. | Slower first load, especially on low-bandwidth devices. |

### AIMS-001 — competing ledgers and incomplete posting (P0)

V1 creates the stronger `accounts`, `journals`, and `journal_lines` model. V2 applies period controls, immutable posted vouchers, and deferred balance validation to that model. The active implementation introduced a second model in V17-V27:

- V26 creates three near-identical header tables (`a_dr`, `a_cr`, `a_jv`) and three child tables.
- Their status constraint is `CHECK (status = 'DRAFT')`; `posting_flag` is similarly fixed to `N`.
- `VoucherService` reads and writes the `a_*` tables, not `journals` or `journal_lines`.
- The UI exposes creation, editing, moving, listing, images, and deletion of drafts, but no submit/approve/post/reject/reverse lifecycle.
- The original outbox is defined but no publisher or operational workflow uses it.

This is the largest correctness risk. A balanced draft is not a posted accounting entry. The product currently cannot establish a reliable general ledger or produce defensible financial statements.

**Required decision:** make the modern `journals`/`journal_lines` design canonical. Replace the three voucher families with one `vouchers` table and one `voucher_lines` table, using `voucher_class`/`voucher_type` as data. Retain compatibility views only if a legacy export contract requires the old names.

**Acceptance:** maker-checker workflow, open-period enforcement, atomic posting, idempotent retry, immutable posted records, reversal, and trial-balance reconciliation are proven by database integration tests.

### AIMS-002 and AIMS-006 — tenancy and redundancy (P0/P1)

The runtime intentionally uses one datasource and one Flyway migration lineage. Isolation therefore depends on consistently scoped identifiers, queries, constraints, and authorization.

Current relational problems include:

- `project_codes.id`, `finance_codes.id`, and `component_codes.id` are global primary keys (V10 lines 46-87). Company A and Company B therefore cannot both use project code `1` in the shared database.
- `a_vr_type`, `a_monthly_bal`, and all voucher headers store `organization_id`, entity IDs, and copied company/branch/project/finance/component codes. Foreign keys validate the IDs but do not prove every copied code matches its referenced row.
- Component references validate `(organization_id, component_code_id)` independently of the selected project and finance IDs. The database can represent a component from a different finance combination.
- COA/reporting data is split between modern `accounts` and legacy `a_coa`, `a_l1`…`a_l4`, `a_acc_head`, and `a_rep_*` tables.
- `a_rep_spec` copies report, group, and layer descriptions and many loosely constrained flag strings into every row.
- `a_monthly_bal` stores monthly and cumulative values together, making derived totals another mutable source of truth.
- Reporting and COA hierarchies use long composite business-key foreign keys. They are expensive to propagate and make renaming business codes difficult.

### Recommended canonical database

- Keep identity, access control, company setup, accounting, audit, and outbox records in one PostgreSQL database.
- Require `organization_id` on every company-owned aggregate and include it in foreign keys and uniqueness rules. Use surrogate immutable IDs and unique business codes scoped to their organization and parent, e.g. `UNIQUE(organization_id, project_id, code)`.
- Use one account adjacency tree (`accounts.parent_id`) rather than one table per level. Enforce cycle/depth/posting rules as already demonstrated in V2.
- Use one reporting-node hierarchy with a parent ID. Store each description once and map leaf nodes to accounts; use typed boolean/enum columns instead of free-form flags.
- Treat opening balances as immutable batches plus lines. Calculate cumulative balances from posted ledger entries or controlled projections, not user-editable cumulative columns.
- Store attachment metadata and SHA-256 in PostgreSQL; put file bytes in private object storage with malware scan/quarantine status and signed, short-lived retrieval.
- Preserve numeric precision at `numeric(24,6)` and explicit currency/rate policy; avoid the later reduction to `numeric(15,2)` unless a documented business limit proves it safe.

### Migration approach

Do not rewrite applied migrations. Add forward migrations that normalize organization-aware keys and the canonical ledger incrementally.

1. Add missing organization-aware unique constraints and composite foreign keys.
2. Build the canonical organization-scoped accounting schema and service workflow.
3. For each company, copy dimensions, COA, opening balances, setup, drafts, and journals in dependency order.
4. Reconcile row counts; per-account opening balances; voucher debit/credit totals; sequence maxima; attachment hashes; and aggregate hashes.
5. Switch one company at a time after reconciliation, while retaining one physical database and one transaction boundary.

Avoid indefinite dual writes between the old and new ledgers. They create a new reconciliation problem and can silently diverge.

### AIMS-003 — startup secrets and bootstrap privilege (P0)

`application.yml` and Compose contain development fallback database credentials, JWT secret, admin email, and `ChangeMe123!`. `.env.example` repeats the default administrator identity and password. `IdentityBootstrap` creates the account if absent and sets `super_admin = true` for the configured email on every startup, including when an existing account had previously been demoted.

**Remediation:**

- Add an explicit production profile that has no secret defaults and fails startup unless cookie security, trusted origins, issuer/audience, and secret references are valid.
- Replace environment plaintext with a secret manager or orchestrator secret mount; support signing-key rotation using `kid`. Prefer asymmetric signing when services will validate tokens independently.
- Make bootstrap a one-time, separately invoked provisioning command. Generate a random one-time credential, force rotation, record the event, and never re-promote on normal startup.
- Remove the prefilled admin email from `LoginPage.tsx`.

### AIMS-004 — verification and delivery controls (P0)

The repository has one test class with three pure unit tests. There are no frontend tests or CI definitions. No test proves migrations, cross-organization isolation, authentication, authorization, voucher transactions, concurrency, or database invariants.

**Minimum release gates:**

- Unit tests for domain rules and validation.
- PostgreSQL integration tests (Testcontainers) that replay all migrations and exercise actual constraints/triggers.
- API tests for every authorization capability and cross-company/cross-branch denial.
- Concurrency tests for voucher numbering, optimistic updates, refresh rotation, and posting.
- Frontend component tests plus end-to-end tests for critical accounting journeys.
- Contract tests for problem details, pagination, idempotency, and optimistic concurrency.
- Mutation/property tests for debit-credit invariants and monetary rounding.
- CI gates for backend tests, frontend lint/test/build, migration validation, coverage thresholds, secret scanning, SAST, Java/npm SCA, SBOM, container scan, and signed images.
- Staging restore drill and recorded recovery evidence before release.

### AIMS-005 — branch authorization gap (P1)

JWTs contain allowed branch IDs, and `membership_branches` exists, but `OrganizationAccessService.requireCompanyPermission` checks company membership and capabilities only. Voucher and setup services accept a company ID and then allow selection of branches within that company without consistently checking the actor's assigned branch set. UI filtering is not a security boundary.

**Remediation:** require branch scope in every branch-bound service operation. Centralize an `AccessScope` containing actor, company, allowed branches, and capabilities; validate it before every company- or branch-scoped command. Add negative tests that enumerate IDs belonging to another branch and company.

### AIMS-007 — idempotency and financial concurrency (P1)

CORS allows `Idempotency-Key`, but voucher endpoints do not consume or persist it. Automatic daily sequence allocation is atomic, but client retries can still create multiple vouchers with different sequence numbers. Manual numbering uniqueness is scoped to voucher setup rather than a clearly documented legal numbering scope.

**Remediation:** store `(organization_id, operation, idempotency_key, request_hash, result_reference, status, expires_at)` in the same transaction as creation/posting. A repeated identical request returns the original result; a different payload with the same key returns conflict. Define sequence scope, gaps policy, fiscal reset, and voided-number reporting.

### AIMS-008 and AIMS-009 — authentication hardening (P1)

Positive controls include BCrypt, constant-work handling for unknown users, account lockout, short access tokens, hashed rotating refresh tokens, CSRF, and restricted CORS. Remaining financial-grade gaps:

- No MFA or step-up authentication for privileged/financial actions.
- Lockout is account-based; there is no gateway/IP/device rate limiting.
- A replayed rotated refresh token is rejected but does not revoke the token family or create a high-signal incident event.
- Access-token permissions remain effective until expiry after a user is disabled or a role is changed.
- Tokens have issuer and expiry but no audience, `jti`, session/version claim, or signing-key identifier.
- `AuthenticationController.clientIp` trusts the first `X-Forwarded-For` value. NGINX appends to an incoming value, so a client can influence the recorded address unless the edge strips it.
- Password policy is length-only and there is no compromised-password check, self-service recovery, or forced reset for provisioned users.

Add WebAuthn/TOTP MFA, rate limits, session inventory/revocation, refresh-family theft detection, a user/session security version, trusted-proxy configuration, and security alerts. Configure the edge to replace—rather than append untrusted—forwarded headers and let Spring trust only known proxies.

### AIMS-010 — API and database performance (P1)

Company, branch, dimension, identity, initial-data, COA, financial-statement, voucher-setup, and voucher list endpoints return unbounded lists. `VoucherService` combines three tables with a union and no limit. The live schema already has 138 indexes for 49 tables, but there is no recorded query-plan or redundant-index analysis.

Standardize cursor pagination:

```json
{
  "items": [],
  "nextCursor": "opaque-or-null",
  "total": null
}
```

Use stable `(business_date DESC, id DESC)` cursors for transactions, bounded page sizes (default 50, maximum 200), indexed filters, and server-side sorting. Add slow-query logging, representative `EXPLAIN (ANALYZE, BUFFERS)` baselines, pool saturation metrics, and workload-specific index review after the canonical schema is chosen.

### AIMS-011, AIMS-012, and AIMS-014 — production operations (P1/P2)

Compose is suitable for local development, not a production topology. PostgreSQL and backend ports are published, image tags are mutable, and no CPU/memory limits, network policies, TLS policy, secret integration, Java/container scanning, log pipeline, alerting, or high-availability database configuration exists.

Define and test:

- TLS termination, HSTS, internal-only database/API networking, firewall rules, and trusted proxies.
- Managed PostgreSQL or documented HA, encrypted storage, PITR, organization-level export/recovery, and quarterly restore drills.
- Explicit RPO/RTO, capacity limits, connection budgets, and PgBouncer policy.
- Structured JSON logs with request/correlation/user/organization IDs but no secrets or sensitive payloads.
- Prometheus/OpenTelemetry export and alerts for error rate, latency, authentication anomalies, pool saturation, failed outbox events, migration lag, disk, backup age, and unbalanced/reconciliation failures.
- Immutable digest-pinned images, SBOM and provenance, container read-only/rootless policy, resource limits, and rolling/canary deployment with migration compatibility checks.
- Runbooks for compromised credentials, failed migration, database outage, restore, and key rotation.

### AIMS-013 — file storage and validation (P2)

Voucher and profile images are stored in PostgreSQL. Voucher images permit up to 5 MB each, which increases WAL, backup, replication, and restore costs. Validation checks the declared MIME type and a short signature but does not fully decode, sanitize metadata, scan malware, or guard against decompression/resource abuse.

Move voucher evidence to private object storage; enforce size and decoded pixel limits, re-encode accepted images, strip metadata, malware-scan asynchronously, store hashes, and authorize every download. Keep profile images smaller and separately cached. Add retention/legal-hold policy before enabling document uploads broadly.

### AIMS-015 through AIMS-020 — UI/UX, accessibility, and frontend delivery (P2/P3)

- `DashboardPage.tsx` contains static dollar balances, a fixed October 2026 period, and sample voucher counts. Replace it with organization/branch-aware APIs or visibly label/remove the page before production.
- Routes are protected only by authentication. Add capability-aware route guards and a helpful forbidden page; backend authorization remains authoritative.
- `Modal.tsx` moves initial focus but does not trap focus, mark the background inert, or restore focus to the opener. It also closes on backdrop/Escape without a consistent dirty-form guard.
- The custom select uses listbox roles but lacks a complete combobox model and `aria-activedescendant`; its active option is primarily visual.
- Wide data tables depend on horizontal scrolling and have no server paging, column priority, sticky actions, or small-screen record alternative.
- Company/branch switching uses `window.confirm` and DOM inspection for dialogs. Replace this with explicit dirty-state registration and an accessible application confirmation dialog.
- Loading, empty, stale, offline, session-expired, and partial-failure patterns are not consistently centralized.
- Large screens mix orchestration, fetching, forms, and presentation (up to 770 lines in one page); several files use dense one-line JSX. Split by feature state, form, table, and API hooks.
- The main production chunk is 591.48 kB. Lazy-load route modules and isolate PDF generation (`jspdf`/`html2canvas`) behind dynamic imports.
- Add CSP, HSTS at the HTTPS edge, `Referrer-Policy`, `Permissions-Policy`, and `X-Content-Type-Options` to NGINX. The live frontend response currently exposes only ordinary NGINX headers.

Complete WCAG 2.2 AA verification with automated axe checks and manual keyboard, screen-reader, zoom/reflow, contrast, reduced-motion, and mobile tests. The attempted live browser walkthrough was blocked by the audit environment and remains a release gate.

## Required interface changes

These are recommendations, not changes made by this audit:

- Version production APIs under `/api/v1` before external clients depend on the current routes.
- Return paged collection envelopes and stable cursors.
- Require `Idempotency-Key` for voucher creation/posting/import and persist the result.
- Use `ETag`/`If-Match` or an explicit required version for all mutable aggregates.
- Replace client-selected unrestricted company/branch identifiers with a server-resolved `AccessScope`; reject mismatched path, token, organization, and branch context.
- Separate commands for draft, submit, approve/reject, post, reverse, and void. Do not expose a generic status update.
- Add normalized error codes alongside human-readable problem details.
- Add session/MFA endpoints and administrative session revocation.
- Store attachment metadata separately and return short-lived authorized download URLs.

## Phased remediation roadmap

Effort is relative and assumes a small experienced product team; architecture and data-migration discovery can change estimates.

### Phase 0 — contain immediate risk (1-2 weeks)

- Mark the product non-production and remove sample financial claims.
- Fail production startup on defaults; replace bootstrap and configure secure cookies/TLS headers.
- Add CI skeleton, secret/SCA/container scans, and baseline integration test infrastructure.
- Enforce branch authorization and trusted proxy handling.
- Define canonical ledger decision, RPO/RTO, posting workflow, and segregation-of-duties matrix.

**Exit:** no known default credentials; security-critical authorization tests pass; release pipeline blocks failed checks.

### Phase 1 — canonical accounting and organization isolation (6-10 weeks)

- Strengthen organization-aware constraints and cross-company authorization boundaries in the main datasource.
- Build canonical accounts, fiscal periods, vouchers, lines, sequences, audit, and outbox schema.
- Implement maker-checker posting, immutability, reversal, and opening-balance batches.
- Add integration, concurrency, and property tests.

**Exit:** two organizations operate with proven logical and authorization isolation; posted ledgers reconcile under concurrent and retry scenarios.

### Phase 2 — migration and operational readiness (4-8 weeks)

- Build company-by-company migration and reconciliation tooling.
- Add pagination, query baselines, object-storage attachments, structured telemetry, alerts, and runbooks.
- Run load, migration, backup/restore, and failure-injection tests in staging.

**Exit:** rehearsal migration balances exactly; RPO/RTO and restore evidence are signed off.

### Phase 3 — product and UX readiness (3-6 weeks)

- Replace sample dashboards and complete reporting/period-close journeys.
- Add permission route guards, consistent states, accessible dialogs/selects/tables, and responsive workflows.
- Add end-to-end regression coverage and performance budgets.

**Exit:** critical journeys pass WCAG 2.2 AA manual checks, browser/device matrix, and end-to-end release tests.

## Production release acceptance checklist

AIMS may be reconsidered for production only when all are true:

- [ ] One canonical ledger is used by every financial workflow; legacy tables are read-only or retired.
- [ ] Submit, approve, post, reject, reverse, void, and period-close duties are separated and audited.
- [ ] Every posted voucher is immutable, balanced, idempotent, and within an open period.
- [ ] Every company-owned query and constraint is organization-scoped; cross-company and cross-branch negative tests pass.
- [ ] Migration reconciliation proves row counts, account balances, voucher totals, sequences, and attachment hashes.
- [ ] Production refuses all development defaults and uses managed, rotated secrets.
- [ ] MFA and privileged step-up authentication are enabled; session theft/replay handling is tested.
- [ ] API pagination, resource limits, rate limits, and performance SLOs are enforced.
- [ ] CI runs unit, integration, authorization, migration, frontend, end-to-end, security, and image checks.
- [ ] Backups, PITR, organization recovery, key rotation, and failed-migration recovery meet signed RPO/RTO targets.
- [ ] Logs, metrics, traces, reconciliation alerts, and incident runbooks are operational.
- [ ] No sample financial data is presented as real; UX and accessibility validation is complete.
- [ ] Security review, accounting-owner sign-off, and staged release approval are recorded.

## Recommended ownership

| Workstream | Accountable owner |
|---|---|
| Ledger model, posting, reconciliation | Accounting domain lead + backend lead |
| Organization-scoped database and migration | Data architect/DBA + backend lead |
| Authentication, authorization, AppSec | Security lead + backend lead |
| CI/CD, observability, backup/DR | Platform/SRE lead |
| UX, accessibility, frontend testing | Product design + frontend lead |
| Release acceptance and residual risk | Product owner + finance control owner |

