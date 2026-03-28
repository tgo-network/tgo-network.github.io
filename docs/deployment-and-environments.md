# TGO Network Deployment And Environment Design

## 1. Purpose

This document defines the deployment model and environment strategy for the platform.

It focuses on:

- application boundaries
- environment separation
- domain layout
- secrets and configuration ownership
- operational deployment expectations

## 2. Deployment Principles

- Keep applications independently deployable
- Prefer standard Node.js and static hosting patterns
- Avoid platform-locked capabilities unless intentionally chosen
- Separate application config by environment
- Keep runtime secrets outside the repository

## 3. Application Deployment Units

The platform should be deployed as three application units:

- `apps/site`
- `apps/admin`
- `apps/api`

Supporting services:

- `PostgreSQL`
- `S3-compatible object storage`
- optional CDN
- monitoring and log aggregation

## 4. Recommended Domain Layout

Recommended initial domains:

- `www.example.com`
- `admin.example.com`
- `api.example.com`
- `assets.example.com`

Domain responsibilities:

- `www`
  - public site traffic
- `admin`
  - staff admin traffic
- `api`
  - public, admin, and auth API traffic
- `assets`
  - public asset delivery or CDN access

## 5. Environment Set

Minimum environments:

- `local`
- `staging`
- `production`

Recommended usage:

- `local`
  - developer machine, local services or shared dev services
- `staging`
  - release candidate validation with near-production config
- `production`
  - live public traffic

## 6. Environment Isolation Rules

Each environment should have:

- separate database
- separate object storage bucket or path prefix
- separate auth secrets
- separate API base URLs
- separate cookie and CORS settings
- separate observability targets where practical

Do not reuse production secrets in staging or local.

## 7. Deployment Shape By App

### `apps/site`

Supported deployment modes:

- static hosting
- Node SSR hosting if needed later

Recommended MVP preference:

- static-first deployment with API-backed content fetch strategy appropriate to Astro mode

### `apps/admin`

Supported deployment modes:

- static hosting

Recommended MVP preference:

- static SPA deployment with authenticated API access

### `apps/api`

Supported deployment modes:

- Node.js server
- Docker container on managed or self-hosted infrastructure

Recommended MVP preference:

- Dockerized Node deployment

Reference artifact now available:

- build command: `npm run docker:build:api`
- Docker build target: `apps/api/Dockerfile`
- health endpoints for container or platform probes:
  - liveness: `GET /health`
  - readiness: `GET /ready`
  - release metadata: `GET /version`

## 8. Configuration Ownership

Recommended configuration split:

- build-time frontend config
- runtime backend config
- secrets stored in deployment environment

Examples of frontend config:

- `PUBLIC_SITE_URL`
- `PUBLIC_API_BASE_URL`

Examples of backend runtime config:

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `INTERNAL_API_TOKEN`
- `LOG_FORMAT`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `PUBLIC_WRITE_RATE_LIMIT_WINDOW_SECONDS`
- `PUBLIC_APPLICATION_RATE_LIMIT_MAX`
- `PUBLIC_EVENT_REGISTRATION_RATE_LIMIT_MAX`
- `ASSET_IMAGE_MAX_DIMENSION`
- `ASSET_IMAGE_MAX_PIXELS`
- `CORS_ALLOWED_ORIGINS`

## 8.1 Recommended Environment Matrix

Minimum environment matrix:

| Variable | local | staging | production | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | required | required | required | Separate database per environment |
| `BETTER_AUTH_SECRET` | required for auth | required | required | Rotate independently per environment |
| `BETTER_AUTH_URL` | recommended | required | required | May fall back to `PUBLIC_API_BASE_URL`, but explicit is better |
| `APP_ENV` | recommended | recommended | recommended | Helps runtime probes and operational logging |
| `APP_VERSION` | optional | recommended | recommended | Exposed by `GET /version` |
| `GIT_SHA` | optional | recommended | recommended | Exposed by `GET /version` |
| `LOG_FORMAT` | optional | recommended | recommended | `json` is preferred for centralized logs; `logfmt` remains valid |
| `PUBLIC_API_BASE_URL` | required for site/admin builds | required | required | Should point to the environment API origin |
| `CORS_ALLOWED_ORIGINS` | required | required | required | Include `site` and `admin` origins only |
| `INTERNAL_API_TOKEN` | recommended | required | required | Used by trusted schedulers and internal jobs |
| `S3_BUCKET` | optional | recommended | recommended | Required if asset uploads are enabled |
| `S3_ACCESS_KEY_ID` | optional | recommended | recommended | Required if asset uploads are enabled |
| `S3_SECRET_ACCESS_KEY` | optional | recommended | recommended | Required if asset uploads are enabled |
| `S3_ENDPOINT` | optional | provider dependent | provider dependent | Needed for MinIO or custom S3-compatible providers |
| `S3_PUBLIC_BASE_URL` | optional | recommended | recommended | Prefer explicit public asset delivery URL |

Operational helper:

- run `npm run env:check:api`
- or `npm run env:check:api -- production`

This validates the most important runtime configuration before deployment.

## 9. Secret Management Rules

- never commit real secrets to the repository
- use platform secret stores or deployment environment variables
- rotate auth and storage credentials on staff turnover or incident
- isolate secrets per environment

## 10. Database Deployment Strategy

Recommended baseline:

- managed Postgres such as Neon for early delivery
- standard connection string usage to preserve portability

Alternative:

- self-hosted Postgres if operational control is preferred

Requirements:

- automated backups
- migration execution process
- restore verification plan

## 11. Object Storage Deployment Strategy

Supported options:

- Cloudflare R2
- AWS S3
- MinIO

Selection rule:

- bind application logic to S3-compatible behavior
- avoid provider-specific assumptions in business code

## 12. CORS And Cookie Rules

Recommended baseline:

- allow `www`, `admin`, and local development origins explicitly
- avoid wildcard origins for authenticated endpoints
- use environment-specific cookie domain configuration

If admin and API live on different subdomains:

- ensure secure cookie and CORS settings are aligned

## 13. Build And Release Flow

Recommended release flow:

1. merge to main branch
2. build and test in CI
3. deploy to staging
4. validate critical flows
5. promote to production

Critical validations:

- staff login
- public page fetches
- article publish flow
- event publish flow
- asset upload flow
- request log correlation via `X-Request-ID`

Suggested deployment preflight:

1. `npm run env:check:api -- production`
2. `npm run docker:build:api`
3. verify the image starts with the expected runtime variables

Current repository automation:

- `.github/workflows/ci.yml`
  - builds the API Docker image on GitHub Actions to catch container regressions
- `.github/workflows/publish-api-image.yml`
  - manually publishes the API image to `ghcr.io` with `latest`, `sha-*`, and optional extra tags
- `deploy/api.compose.yml`
  - provides a portable Docker Compose runtime template for the published API image
- `deploy/api.env.example`
  - provides a runtime env template for staging or production API deployment

## 14. Migration Strategy

Recommended rules:

- schema changes go through Drizzle migrations
- apply migrations before serving new API code that depends on them
- never make manual production schema edits without codifying them later

## 15. Backup And Restore

Minimum requirements:

- automated database backups
- documented restore procedure
- periodic restore test in a non-production environment

For object storage:

- bucket versioning or provider-level retention if available
- controlled deletion flow

## 16. Logging And Monitoring Baseline

Minimum operational baseline:

- backend request logging
- request correlation IDs
- error tracking
- deployment event visibility
- database health visibility
- storage failure visibility

Recommended later additions:

- uptime checks
- queue or job monitoring if jobs are added
- admin activity dashboards

Current MVP note:

- if scheduled publishing is enabled, trigger `POST /api/internal/v1/publish-scheduled-content` from a trusted cron or platform scheduler using `INTERNAL_API_TOKEN`
- use the existing runtime probes for platform checks:
  - `GET /health` for liveness
  - `GET /ready` for readiness
  - `GET /version` for release verification
- every API response should surface `X-Request-ID`, and error payloads should echo `error.requestId`

## 17. Rollback Strategy

Application rollback should be possible independently for:

- `site`
- `admin`
- `api`

Important rule:

- schema rollbacks are harder than app rollbacks
- prefer backward-compatible migrations where possible

## 18. Local Development Environment

Local development should support:

- running all three apps together
- either local Postgres or a dedicated shared dev database
- either local S3-compatible storage or a dev bucket/prefix
- seeded basic roles and initial staff user

## 19. Open Deployment Decisions

These can remain open until implementation starts:

- exact hosting vendor
- exact CI platform
- exact monitoring stack
- exact CDN provider

They should not block scaffold or MVP development.

## 20. Recommended Next Use

This document should directly drive:

- environment variable templates
- deployment scripts
- CI pipeline design
- staging and production setup
