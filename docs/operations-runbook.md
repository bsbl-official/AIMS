# Production operations runbook

## Deployment gate

Use the `prod` Spring profile. The application refuses to start when bootstrap admin is enabled, cookies are insecure, CORS is non-HTTPS, or a required database/JWT/MFA secret is missing or unsafe. Run backend tests, frontend lint/build, and container builds before promotion. Apply the main database migrations before routing traffic.

## Backup and recovery

- Target: RPO 15 minutes, RTO 4 hours.
- Enable PostgreSQL continuous archiving/WAL shipping in the selected hosting platform and retain encrypted daily base backups in a separate account or failure domain.
- Back up the `account_bm` database, which contains platform and organization-scoped accounting data.
- Quarterly, restore the database into an isolated environment, run Flyway validation, and execute cross-company isolation and accounting smoke tests. Record elapsed recovery time and evidence.
- Object storage must have versioning, server-side encryption, lifecycle retention, and cross-region or cross-account replication configured by the operator.

## Incident response

1. Preserve request IDs, security events, application logs, database logs, and infrastructure audit logs.
2. Revoke an affected session family; increment `user_profiles.security_version` to revoke every session for a user.
3. Rotate compromised JWT, MFA-encryption, database, and object-storage credentials through the secret manager. Restart all instances after JWT rotation.
4. If refresh-token reuse is detected, the service revokes the token family and all user sessions automatically.
5. Document scope, timeline, containment, recovery, and follow-up actions.

## Monitoring and alerts

Scrape `/actuator/prometheus` only from the monitoring network. Alert on failed health checks, HTTP 5xx rate, authentication failures/lockouts, refresh-token reuse, database pool saturation, posting failures, backup age, and restore-test failure. Correlate support reports using the `X-Request-ID` response header.

## Organization isolation

All companies share the main database and are isolated by `organization_id` and branch access. Every company-scoped query, update, uniqueness rule, and foreign key must include the organization boundary. Test cross-company and cross-branch denial before each release.

Legacy physical databases matching `account_bm_t_*`, if any, are no longer used. Inventory them with `SELECT datname FROM pg_database WHERE datname LIKE 'account_bm_t_%' ORDER BY datname;`. Back up and remove them only through a separately approved maintenance procedure.
