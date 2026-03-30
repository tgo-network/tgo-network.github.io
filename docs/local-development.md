# Local Development

This document defines the default local workflow for the current monorepo.

Important note:

- The current product scope is defined by `docs/mvp-scope.md`
- The old `topic/city/applications` implementation has been retired from the active code path; remaining mentions are migration history and route-retirement tests

## 1. Goals

Local development should let us:

- start the shared infrastructure we need now
- bootstrap database schema and baseline content
- create the first authenticated staff account
- run the public site, admin console, and API independently

## 2. Prerequisites

- `Node.js >= 22`
- `Docker Desktop` or another working Docker runtime
- repository dependencies installed with:
  - `env COREPACK_HOME="$PWD/.corepack" corepack pnpm install`

## 3. Environment Setup

Create the root env file before running auth-backed API flows:

```bash
cp .env.example .env
```

Important local variables:

- `DATABASE_URL`
  - local PostgreSQL connection string
- `BETTER_AUTH_SECRET`
  - required for `/api/auth/*` and staff session handling
- `BETTER_AUTH_URL`
  - auth base URL, defaults to the local API origin
- `LOG_FORMAT`
  - optional API log output format: `logfmt` or `json`
- `INTERNAL_API_TOKEN`
  - required for `/api/internal/v1/*` trusted automation routes such as scheduled publishing
- `DEV_ADMIN_EMAIL`
- `DEV_ADMIN_PASSWORD`
- `DEV_ADMIN_NAME`
  - used by the admin bootstrap script
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
  - required for admin asset uploads
- `S3_REGION`
- `S3_FORCE_PATH_STYLE`
- `S3_PUBLIC_BASE_URL`
- `ASSET_UPLOAD_EXPIRES_IN_SECONDS`
  - optional storage tuning for local MinIO or other S3-compatible providers
- `PUBLIC_WRITE_RATE_LIMIT_WINDOW_SECONDS`
- `PUBLIC_APPLICATION_RATE_LIMIT_MAX`
- `PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX`
  - baseline in-memory throttles for public write endpoints
- `ASSET_IMAGE_MAX_DIMENSION`
- `ASSET_IMAGE_MAX_PIXELS`
  - server-side image metadata limits enforced during asset finalization

## 4. Infrastructure Commands

Start PostgreSQL:

```bash
npm run infra:up
```

Start optional local object storage:

```bash
npm run infra:up:storage
```

Useful supporting commands:

```bash
npm run infra:logs
npm run infra:down
```

Current expectation:

- `infra:up`
  - starts `postgres`
- `infra:up:storage`
  - starts `minio` and the one-shot bucket setup job
  - creates the local bucket and enables public reads for public asset previews

## 5. Bootstrap Flow

Use the one-command bootstrap for a fresh local database:

```bash
npm run bootstrap:dev
```

This runs:

1. `npm run db:migrate`
2. `npm run db:seed`
3. `npm run auth:bootstrap-admin`

If you want the local database to use the scraped official TGO branch and event dataset instead of the demo event set, use:

```bash
npm run bootstrap:tgo-infoq
```

This runs:

1. `npm run db:migrate`
2. `npm run db:seed`
3. `npm run db:cleanup:demo-events`
4. `npm run db:import:tgo-infoq`
5. `npm run db:sync-homepage:tgo-infoq`
6. `npm run auth:bootstrap-admin`

If you need the steps separately:

```bash
npm run db:migrate
npm run db:seed
npm run auth:bootstrap-admin
```

Bootstrap result:

- schema is migrated
- baseline demo content, roles, and permissions are inserted
- a development super admin account is created or refreshed from `.env`

Official bootstrap result:

- roles, permissions, site pages, homepage shell, and admin account bootstrap stay unchanged
- seeded demo/test events are removed from the local database
- `data/imports/tgo-infoq/` is imported into `branches`, `branch_board_members`, `events`, `event_sessions`, and `assets`
- homepage featured branches, featured events, and metrics are synchronized to the imported dataset

## 6. Application Startup

Run each application independently:

```bash
npm run dev:api
npm run dev:site
npm run dev:admin
```

Default local URLs:

- Public site: `http://localhost:4321`
- Admin console: `http://localhost:5173`
- API service: `http://localhost:8787`

You can also run the three apps together:

```bash
npm run dev
```

## 7. Smoke Test Checklist

Automated backend coverage is now available before or after the manual checklist:

```bash
npm run test:api
```

Astro-side public data-loading coverage is also available:

```bash
npm run test:site
```

Browser-level smoke coverage is also available:

```bash
npm run test:e2e
```

What the integration suite does:

- creates a temporary PostgreSQL database derived from `DATABASE_URL`
- runs Drizzle migrations and seed data into that database
- exercises auth, permission checks, staff and role management, and scheduled publishing
- exercises public list/detail, application, registration, and rate-limit behavior
- drops the temporary database after the run finishes

What the Astro helper suite does:

- mocks public API fetch requests in Node
- verifies configured API base URL handling
- verifies fallback to shared demo content when public requests fail

What the Playwright smoke suite does:

- starts or reuses local `postgres` through `npm run infra:up`
- reapplies local migrations, seed data, and the bootstrapped super admin account
- starts `api`, `site`, and `admin` dev servers on fixed localhost ports
- verifies admin login, protected-route redirect behavior, public homepage rendering, public application submission, and public event registration submission

Browser note:

- on macOS, local runs prefer an installed `Google Chrome.app` when available
- if you prefer Playwright-managed browsers, run `npm run test:e2e:install` once

Important note:

- never point `DATABASE_URL` at a production instance when running the integration suite

Recommended minimum verification after bootstrap:

- confirm successful responses return an `X-Request-ID` header
- confirm error responses also include `error.requestId` for log correlation
- run `npm run test:e2e` when auth, public forms, or cross-app navigation changes

The route list below reflects the current local implementation baseline. It is useful for development smoke tests, but it is not the canonical product-scope document.

### Public API

- `GET /`
- `GET /health`
- `GET /ready`
- `GET /version`
- `GET /api/public/v1/site-config`
- `GET /api/public/v1/home`
- `GET /api/public/v1/branches`
- `GET /api/public/v1/members`
- `GET /api/public/v1/articles`
- `GET /api/public/v1/events`
- `GET /api/public/v1/join`
- `GET /api/public/v1/about`
- `POST /api/public/v1/events/:eventId/registrations`
- `POST /api/public/v1/join-applications`

### Auth

- `POST /api/auth/sign-in/email`
  - sign in with `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`

### Internal Automation

- `POST /api/internal/v1/publish-scheduled-content`
  - send `Authorization: Bearer $INTERNAL_API_TOKEN` or `x-internal-api-token`

### Admin API

After sign-in and cookie/session setup:

- `GET /api/admin/v1/me`
- `GET /api/admin/v1/dashboard`
- `GET /api/admin/v1/articles`
- `GET /api/admin/v1/articles/references`
- `POST /api/admin/v1/articles`
- `PATCH /api/admin/v1/articles/:id`
- `POST /api/admin/v1/articles/:id/publish`
- `GET /api/admin/v1/events`
- `GET /api/admin/v1/events/references`
- `POST /api/admin/v1/events`
- `PATCH /api/admin/v1/events/:id`
- `POST /api/admin/v1/events/:id/publish`
- `GET /api/admin/v1/events/:id/registrations`
- `GET /api/admin/v1/registrations/:id`
- `PATCH /api/admin/v1/registrations/:id`
- `GET /api/admin/v1/applications`
- `GET /api/admin/v1/applications/:id`
- `PATCH /api/admin/v1/applications/:id`
- `GET /api/admin/v1/members`
- `POST /api/admin/v1/members`
- `PATCH /api/admin/v1/members/:id`
- `GET /api/admin/v1/branches`
- `POST /api/admin/v1/branches`
- `PATCH /api/admin/v1/branches/:id`
- `GET /api/admin/v1/assets`
- `POST /api/admin/v1/assets/uploads`
- `POST /api/admin/v1/assets/uploads/complete`
- `GET /api/admin/v1/staff`
- `POST /api/admin/v1/staff`
- `PATCH /api/admin/v1/staff/:id`
- `GET /api/admin/v1/roles`
- `PATCH /api/admin/v1/roles/:id`
- `GET /api/admin/v1/audit-logs`
- `GET /api/admin/v1/homepage`
- `PATCH /api/admin/v1/homepage`
- `GET /api/admin/v1/pages/join`
- `PATCH /api/admin/v1/pages/join`
- `GET /api/admin/v1/pages/about`
- `PATCH /api/admin/v1/pages/about`

Recommended asset verification:

- upload one public image asset through the admin flow
- assign that asset as `coverAssetId` on one published article, event, branch, or member
- confirm the matching public detail endpoint returns `coverImage.url`

Recommended homepage/settings verification:

- update `homepage` with an active hero title and selected content IDs
- confirm `GET /api/public/v1/home` reflects the curated hero and section slices
- update `pages/join` or `pages/about` and confirm the public page payload changes are reflected by `GET /api/public/v1/join` or `GET /api/public/v1/about`

Recommended event registration verification:

- submit `POST /api/public/v1/events/spring-platform-workshop/registrations` with `name` plus either `email` or `phoneNumber`
- confirm the submission appears in `GET /api/admin/v1/events/:id/registrations`
- open `GET /api/admin/v1/registrations/:id` to verify the stored attendee payload
- update the decision with `PATCH /api/admin/v1/registrations/:id`
- confirm `reviewedAt` and `reviewedByStaffId` are populated after the status change

Recommended audit verification:

- perform one protected mutation such as `PATCH /api/admin/v1/homepage`
- confirm `GET /api/admin/v1/audit-logs` returns a fresh entry with `action`, `targetType`, actor identity, and before/after snapshots

Recommended staff and role verification:

- create one staff account with `POST /api/admin/v1/staff`
- update its `status`, `notes`, or role assignments with `PATCH /api/admin/v1/staff/:id`
- fetch `GET /api/admin/v1/staff` again to confirm the row reflects the new status and roles
- call `GET /api/admin/v1/roles` to load the permission bundle catalog
- save one role through `PATCH /api/admin/v1/roles/:id` and confirm the response returns the updated permission set

Recommended scheduled publishing verification:

- create one article with `status=scheduled` and a `scheduledAt` in the past
- call `POST /api/internal/v1/publish-scheduled-content` with `INTERNAL_API_TOKEN`
- confirm the response lists the article under `published`
- confirm `GET /api/admin/v1/articles/:id` now returns `status=published`
- confirm `GET /api/admin/v1/audit-logs` contains `article.publish_scheduled`

Recommended rate-limit verification:

- temporarily lower `PUBLIC_APPLICATION_RATE_LIMIT_MAX` or `PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX` in `.env`
- restart `apps/api`
- submit the same public form repeatedly from one client
- confirm the API returns `429 RATE_LIMITED` with `Retry-After`, `X-RateLimit-Limit`, and `X-RateLimit-Remaining`

## 8. Development Notes

- The public Astro site still falls back to shared demo content if the API is unavailable.
- Protected admin routes require both `DATABASE_URL` and `BETTER_AUTH_SECRET`.
- Object storage is only required when you want to exercise asset upload flows.
- Asset uploads use signed `PUT` URLs, so the storage provider must allow browser CORS for direct uploads from the admin UI.
- Local API smoke tests for uploads still work without browser CORS because the signed URL can be exercised from scripts or API clients.
- If `infra:up:storage` fails while pulling container images, retry after Docker Hub connectivity recovers.
