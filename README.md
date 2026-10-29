# AIMS

Foundation for a multi-user accounting application with a React frontend, Spring Boot backend, a PostgreSQL platform database, and an isolated PostgreSQL database for each company.

## Technology

- Frontend: React 19.3, TypeScript 6.0, Vite 8.3, React Router 7, Tailwind CSS 4.3
- Backend: Java 21, Spring Boot 4.1, Gradle 9.8 wrapper, Spring Security, Spring Data JPA, Flyway
- Database: PostgreSQL 18 with versioned SQL migrations

The backend is a modular monolith. Each business capability has its own top-level package (`organization`, `company`, `branch`, `identity`, `currency`, `fiscal`, `coa`, `journal`, and `audit`). Company and Branch each own their model, DTO, service, and controller layers. This gives strong transaction boundaries now and keeps a future service extraction possible without paying distributed-system costs early.

The local PostgreSQL container is exposed on port `5433` to avoid clashing with an existing PostgreSQL installation. Set `POSTGRES_PORT` and `DB_URL` together if a different host port is required.

## Run the complete stack with Docker

Create a local environment file and set a strong database password:

```powershell
Copy-Item .env.example .env
```

Also replace `JWT_SECRET` with at least 32 random characters and set a strong
`SUPER_ADMIN_PASSWORD` before the first start. The development defaults are:

```text
Email: admin@accountbm.local
Password: ChangeMe123!
```

The bootstrap password is used when the administrator is first created. Later
restarts do not overwrite an existing administrator password.

Build and start PostgreSQL, the API, and the web application:

```powershell
docker compose up -d --build --wait
docker compose ps
```

Open the frontend at `http://localhost:5173`. The backend health endpoint is available at `http://localhost:8080/actuator/health`, and PostgreSQL is exposed to pgAdmin or IntelliJ on `localhost:5433`.

The Compose project is named `account_bm`. Because Docker container names must be unique, its services use `account_bm_frontend`, `account_bm_backend`, and `account_bm_postgres`. The application images are `account_bm_frontend` and `account_bm_backend`.

View logs or stop the stack with:

```powershell
docker compose logs -f
docker compose down
```

`docker compose down` preserves the PostgreSQL volume. Use `docker compose down --volumes` only when the local accounting database should be permanently deleted.

## Start locally

Requirements: Docker, Java 21, and Node.js 22.12 or newer.

The checked-in development defaults work as-is. For custom credentials, export the matching `DB_USERNAME` and `DB_PASSWORD` values for both Docker Compose and Spring Boot; the available settings are listed in `.env.example`.

```bash
docker compose up -d postgres
cd backend
./gradlew bootRun
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

On Windows, use `gradlew.bat bootRun`. The backend issues its own signed JWT access tokens and rotating refresh tokens. Configure `JWT_SECRET`, `JWT_ISSUER`, token lifetimes, and the initial administrator through the settings in `.env.example`. Production secrets must come from the runtime environment.

## Authentication and access control

- Access tokens are short-lived HS256 JWTs; refresh tokens are random values stored in PostgreSQL only as SHA-256 hashes.
- The browser receives access and refresh credentials only as `HttpOnly`, `SameSite` cookies; they are never stored in web storage or exposed in API response bodies. CSRF tokens protect state-changing requests.
- Refresh tokens rotate on use and are revoked on logout or when a user is disabled.
- Set `AUTH_COOKIE_SECURE=true` in every HTTPS deployment. The default is `false` only so local HTTP development works.
- Five failed password attempts lock an account for 15 minutes.
- Roles belong to an organization and can be assigned any seeded permission through the Users & access screen.
- Administrative changes and login events are written to the append-only audit trail.
- The initial super administrator can create users, change their status and roles, and create or edit roles.

Open `/login` or simply visit the frontend. Authenticated users see navigation based on their permissions.

## Project structure

```text
account_bm/
├── backend/                   Spring Boot API and Flyway migrations
├── frontend/                  React component-based application
├── docs/database-design.md    ER model and integrity decisions
├── compose.yml                Local PostgreSQL
└── .env.example               Runtime configuration template
```

The frontend uses Tailwind CSS utilities throughout its reusable layout, button, card, badge, page header, toast, skeleton, modal, password input, and generic table components. The dashboard, chart-of-accounts, journal, authentication, and user-management modules compose those shared components; their sample accounting rows will be replaced with APIs as each module is implemented.

## Database migrations

- `V1__accounting_core.sql`: organizations, access model, currencies, fiscal calendar, hierarchical accounts, voucher journal, audit, outbox, indexes, and reference data.
- `V2__ledger_integrity.sql`: hierarchy checks, period controls, deferred double-entry balance enforcement, and immutability rules.
- `V3__identity_authentication.sql`: local credentials, account lockout, refresh-token rotation, and identity-management permissions.
- `V4__company_and_branch_setup.sql`: company profile fields, operational branches, branch-aware vouchers and sequences, and company/branch permissions.

See [the accounting database design](docs/database-design.md) and the [database-per-company architecture](docs/database-per-company-architecture.md) before adding module tables, tenant routing, or posting logic.
