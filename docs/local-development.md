# Local Development

This document defines the default local workflow for the current monorepo.

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

If you need the steps separately:

```bash
npm run db:migrate
npm run db:seed
npm run auth:bootstrap-admin
```

Bootstrap result:

- schema is migrated
- baseline topics, articles, events, cities, roles, and permissions are inserted
- a development super admin account is created or refreshed from `.env`

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

Recommended minimum verification after bootstrap:

### Public API

- `GET /api/public/v1/site-config`
- `GET /api/public/v1/home`
- `GET /api/public/v1/topics`
- `GET /api/public/v1/articles`
- `GET /api/public/v1/events`
- `GET /api/public/v1/cities`
- `POST /api/public/v1/events/:eventId/registrations`
- `POST /api/public/v1/applications`

### Auth

- `POST /api/auth/sign-in/email`
  - sign in with `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`

### Admin API

After sign-in and cookie/session setup:

- `GET /api/admin/v1/me`
- `GET /api/admin/v1/dashboard`
- `GET /api/admin/v1/topics`
- `POST /api/admin/v1/topics`
- `PATCH /api/admin/v1/topics/:id`
- `POST /api/admin/v1/topics/:id/publish`
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
- `GET /api/admin/v1/assets`
- `POST /api/admin/v1/assets/uploads`
- `POST /api/admin/v1/assets/uploads/complete`
- `GET /api/admin/v1/audit-logs`
- `GET /api/admin/v1/featured-blocks/homepage`
- `PATCH /api/admin/v1/featured-blocks/homepage`
- `GET /api/admin/v1/site-settings`
- `PATCH /api/admin/v1/site-settings`

Recommended asset verification:

- upload one public image asset through the admin flow
- assign that asset as `coverAssetId` on one published topic, article, or event
- confirm the matching public detail endpoint returns `coverImage.url`

Recommended homepage/settings verification:

- update `featured-blocks/homepage` with an active hero title and selected content IDs
- confirm `GET /api/public/v1/home` reflects the curated hero and section slices
- update `site-settings` and confirm `GET /api/public/v1/site-config` reflects the new header/footer values

Recommended event registration verification:

- submit `POST /api/public/v1/events/spring-platform-workshop/registrations` with `name` plus either `email` or `phoneNumber`
- confirm the submission appears in `GET /api/admin/v1/events/:id/registrations`
- open `GET /api/admin/v1/registrations/:id` to verify the stored attendee payload
- update the decision with `PATCH /api/admin/v1/registrations/:id`
- confirm `reviewedAt` and `reviewedByStaffId` are populated after the status change

Recommended audit verification:

- perform one protected mutation such as `PATCH /api/admin/v1/site-settings`
- confirm `GET /api/admin/v1/audit-logs` returns a fresh entry with `action`, `targetType`, actor identity, and before/after snapshots

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
