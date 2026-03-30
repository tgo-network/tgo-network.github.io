# home.tgo.network

Current scope convergence:

- The active release scope is now centered on `home`, `branches`, `members`, `events`, `articles`, `join`, and `about`
- The active admin scope is now centered on dashboard, articles, events/registrations, applications, members, staff, roles, and audit logs
- Legacy `topic/city/applications` compatibility code has been retired from the active implementation path and remains only as migration history plus 404 retirement assertions in tests

Current implementation status:

- Monorepo scaffold is in place for `apps/site`, `apps/admin`, `apps/api`, `packages/shared`, and `packages/db`
- Root scripts use `corepack pnpm` so the workspace does not depend on a healthy global `pnpm` shim
- Better Auth baseline, staff permission middleware, Drizzle schema, and seed scripts are wired into the API layer
- Public Astro routes now converge on home, branches, members, events, articles, join, about, and the legal pages
- The `/join` page now combines the join guide and application form, while `/apply` remains a compatibility redirect
- Public event detail pages now include an API-backed registration form for `open` and `waitlist` events
- Protected admin read APIs now return real authenticated data for dashboard, core content, events, and applications
- Admin authoring now supports content create, edit, publish, and archive flows through protected Hono endpoints and Vue editor screens
- Event operations now support create, edit, publish, archive, registration-state management, and agenda editing
- Event registration now supports public submissions plus staff review/update flows in the admin console
- Application review now supports detail pages, status updates, and internal review notes in the admin console
- Asset management now supports protected asset listing plus signed S3-compatible upload and finalize flows in the admin console
- Content and event editors now support selecting a cover asset, and the public site renders those images from API-provided asset metadata
- Homepage featured content is now configurable from the admin console and drives the public `/api/public/v1/home` payload
- Public `/api/public/v1/site-config` now returns the converged shared site contract without a separate legacy settings table
- Sensitive admin mutations now write audit records and can be reviewed from the admin console audit log page
- Staff account provisioning now supports protected list/create/update flows, and roles now support protected list/update flows in the admin console
- Internal automation now supports `POST /api/internal/v1/publish-scheduled-content` for due scheduled articles
- API integration tests now cover auth/permission rejection, staff and role management, scheduled publishing automation, and public content flows against an ephemeral PostgreSQL database
- Astro public data helpers now have lightweight Node tests for configured API access and fallback behavior
- Public write endpoints now have baseline rate limiting, and asset finalization now enforces stronger metadata checks
- Local bootstrap scripts are in place for `PostgreSQL`, optional `MinIO`, database seeding, and the initial super admin account
- `.gitignore` is now in place for local env files, package artifacts, and framework build output
- GitHub Actions CI now validates API environment config and runs `typecheck`, `build`, and the full test suite on pushes and pull requests
- API deployment now has a monorepo-aware Dockerfile plus an environment validation script for release checks
- Runtime probes now expose `/health`, `/ready`, and `/version` for deploy checks and platform monitoring
- API observability now includes structured request logs plus `X-Request-ID` correlation on successful and error responses
- GitHub Actions now also verifies the API Docker build and includes a manual GHCR image publish workflow
- Playwright browser smoke tests now cover public homepage/forms plus admin login/navigation, and a dedicated E2E workflow is in place
- Portable deployment templates now exist for the API container image and runtime env configuration
- Retired legacy routes such as public `topics/cities/applications` and admin `topics/featured-blocks/site-settings` are no longer exposed
- `npm run typecheck`, `npm run build`, `npm run test`, and `npm run test:e2e` pass locally, and the event registration, rate limiting, upload-hardening, public write, and staff/role management flows have been smoke-tested against the local API

Workspace commands:

```bash
env COREPACK_HOME="$PWD/.corepack" corepack pnpm install
npm run infra:up
npm run infra:up:storage
npm run bootstrap:dev
npm run typecheck
npm run build
npm run test
npm run test:api
npm run test:site
npm run test:admin
npm run test:e2e
npm run test:e2e:screenshots
npm run test:e2e:install
npm run env:check:api
npm run docker:build:api
npm run db:generate
npm run db:migrate
npm run db:seed
npm run auth:bootstrap-admin
npm run dev:site
npm run dev:admin
npm run dev:api
npm run infra:down
```

Local development quickstart:

1. Install dependencies:
   - `env COREPACK_HOME="$PWD/.corepack" corepack pnpm install`
2. Create the root env file:
   - `cp .env.example .env`
3. Start local infrastructure:
   - `npm run infra:up`
4. Bootstrap schema, seed data, and the first staff account:
   - `npm run bootstrap:dev`
5. Start local object storage if you want to test asset uploads:
   - `npm run infra:up:storage`
6. Run the apps you need:
   - `npm run dev:api`
   - `npm run dev:site`
   - `npm run dev:admin`
7. Run the current backend integration baseline when you want automated API verification:
   - `npm run test:api`
8. Run the Astro public data helper tests when you want a frontend-side fetch/fallback sanity check:
   - `npm run test:site`
9. Run the admin-side unit tests when you want a frontend permissions/auth shell sanity check:
   - `npm run test:admin`
10. Run the browser smoke suite when you want cross-app validation for public flows plus admin login/navigation:
   - `npm run test:e2e`
11. Generate the current public/admin page screenshots when you want a visual inspection baseline:
   - `npm run test:e2e:screenshots`
   - screenshots are written to `artifacts/screenshots/`
12. Validate API deployment configuration before a staging or production release:
   - `npm run env:check:api`
   - `npm run env:check:api -- production`
13. Build the API container image from the monorepo root when you want a deployment artifact:
   - `npm run docker:build:api`

Environment notes:

- Copy `.env.example` to `.env` before enabling auth-backed API flows
- `DATABASE_URL` and `BETTER_AUTH_SECRET` are required for `/api/auth/*` and protected admin endpoints
- `INTERNAL_API_TOKEN` protects `/api/internal/v1/*` automation routes such as scheduled publishing
- `APP_ENV`, `APP_VERSION`, and `GIT_SHA` optionally enrich runtime readiness and version probes
- `LOG_FORMAT` supports `logfmt` for local readability and `json` for structured staging or production logs
- The default local admin credentials are controlled by `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, and `DEV_ADMIN_NAME`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` enable admin asset uploads
- `npm run test:api` creates and destroys its own temporary PostgreSQL database based on `DATABASE_URL`
- `npm run test:site` does not require the API to be running because it mocks the public fetch layer
- `npm run test:e2e` starts local infra, reapplies bootstrap data, and runs browser smoke coverage across `site`, `admin`, and `api`
- `npm run test:e2e:screenshots` uses Playwright to capture the current public and admin pages into `artifacts/screenshots/`
- `npm run test:e2e:install` is available if you want a managed Playwright Chromium install instead of using a local Chrome browser
- `npm run env:check:api` loads `.env` when present and supports profiles like `runtime`, `internal`, `storage`, and `production`
- `GET /health` checks process liveness, `GET /ready` checks runtime readiness, and `GET /version` exposes release metadata
- API responses expose `X-Request-ID`, and error bodies include `error.requestId` for log correlation
- Without those values, public APIs still work and protected admin endpoints return `AUTH_NOT_CONFIGURED`
- The Astro site falls back to shared demo content when the API is not running, so static builds still succeed locally

Project planning documents:

- [Agent guidelines](AGENTS.md)
- [CI workflow](.github/workflows/ci.yml)
- [E2E workflow](.github/workflows/e2e.yml)
- [API image publish workflow](.github/workflows/publish-api-image.yml)
- [Deployment templates](deploy/README.md)
- [Documentation map](docs/README.md)
- [Local development](docs/local-development.md)
- [Overall architecture](docs/system-architecture.md)
- [MVP scope](docs/mvp-scope.md)
- [Route map](docs/route-map.md)
- [Data model](docs/data-model.md)
- [Schema adjustment checklist](docs/schema-adjustment-checklist.md)
- [Auth and permission](docs/auth-and-permission.md)
- [API design](docs/api-design.md)
- [API and DTO adjustment checklist](docs/api-dto-adjustment-checklist.md)
- [Content workflow](docs/content-workflow.md)
- [Media storage](docs/media-storage.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Implementation transition backlog](docs/implementation-transition-backlog.md)
- [Deployment and environments](docs/deployment-and-environments.md)
- [Testing strategy](docs/testing-strategy.md)
- [Operations runbook](docs/operations-runbook.md)
- [TGO target site benchmark](docs/benchmark-tgo-site.md)
