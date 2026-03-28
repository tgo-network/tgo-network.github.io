# TGO Network Operations Runbook

## 1. Purpose

This document turns the architecture and deployment decisions into an execution checklist.

It focuses on:

- release preparation
- staging validation
- production deployment
- rollback rules
- backup and restore drills
- routine operational checks

Use this document together with:

- `docs/deployment-and-environments.md`
- `docs/testing-strategy.md`
- `docs/local-development.md`

## 2. Operational Ownership

Minimum recommended owners:

- release owner
  - coordinates the deployment and confirms checkpoints
- backend owner
  - runs or verifies migrations, API rollout, internal job health
- frontend owner
  - verifies `site` and `admin` deployments
- database owner
  - confirms backup status and restore readiness

For a small team, one person can hold multiple roles, but each responsibility should still be explicitly covered.

## 3. Release Preconditions

Before any staging or production deployment:

- `main` is green in CI
- API Docker image build is green in CI
- browser smoke workflow is green when auth, public forms, or frontend navigation changed
- `npm run typecheck` passes
- `npm run build` passes
- `npm run test` passes
- schema changes are captured in Drizzle migrations
- `.env.example` remains aligned with required runtime configuration
- rollback target is known for `site`, `admin`, and `api`
- `npm run env:check:api -- production` passes for the target API environment

If the release includes auth, permission, publishing, storage, or migration changes, do not skip staging validation.

## 4. Environment Readiness Checklist

For `staging` and `production`, verify:

- correct `DATABASE_URL`
- correct `BETTER_AUTH_SECRET`
- correct `BETTER_AUTH_URL`
- correct `PUBLIC_API_BASE_URL`
- correct `CORS_ALLOWED_ORIGINS`
- correct `INTERNAL_API_TOKEN`
- correct `S3_*` configuration
- database backup schedule is active
- object storage bucket or prefix is correct for the environment

Do not promote if any environment still points to another environment's database, bucket, or secrets.

Recommended command:

```bash
npm run env:check:api -- production
```

## 5. Standard Release Flow

Recommended sequence:

1. confirm CI is green on the target commit
2. confirm backup freshness for the target database
3. run API environment validation
4. build the API image or deployment artifact
5. optionally publish the API image via `.github/workflows/publish-api-image.yml`
6. deploy `api` to staging
7. run staging migrations
8. deploy `admin` to staging
9. deploy `site` to staging
10. validate staging critical flows
11. deploy `api` to production
12. run production migrations
13. deploy `admin` to production
14. deploy `site` to production
15. validate production critical flows

Why `api` goes first:

- frontend apps depend on API compatibility
- migrations and runtime compatibility need to be established before frontend promotion

Current build artifact:

- `npm run docker:build:api`
- Dockerfile path: `apps/api/Dockerfile`
- optional image publishing workflow: `.github/workflows/publish-api-image.yml`
- optional runtime deployment template: `deploy/api.compose.yml`

## 6. Staging Validation Checklist

After staging deployment, verify:

- `GET /health`
- `GET /ready`
- `GET /version`
- one successful response returns `X-Request-ID`
- one error response returns `error.requestId`
- one admin login works through the browser, not only direct API calls
- `GET /api/public/v1/site-config`
- `GET /api/public/v1/home`
- `GET /api/admin/v1/me` after login
- one article detail page loads
- one event detail page loads
- one admin content list page loads
- one protected admin mutation succeeds
- one public write flow succeeds
- one internal scheduled publishing run returns the expected shape

Recommended staging write checks:

- create or update one draft topic or article
- submit one public application
- submit one public event registration
- upload one asset if storage changes are included

## 7. Production Validation Checklist

After production deployment, verify:

- `GET /health`
- `GET /ready`
- `GET /version`
- logs can be correlated with `X-Request-ID`
- public homepage loads
- public article detail loads
- public event detail loads
- admin login works
- `GET /api/admin/v1/me` reflects a valid staff session
- one low-risk admin read page loads
- audit log page loads
- scheduler or cron for scheduled publishing remains configured

Avoid unnecessary production write tests unless the release specifically affects those flows.

## 8. Migration Safety Rules

Always assume schema rollback is harder than app rollback.

Required rules:

- prefer additive migrations
- avoid dropping columns and tables in the same release that removes their last usage
- deploy API code that tolerates both pre-migration and post-migration states where practical
- take a fresh backup before risky migrations

If a release contains destructive schema changes, require an explicit restore rehearsal in staging first.

## 9. Rollback Strategy

Rollback order depends on the failure domain.

### `site` rollback

Use when:

- public rendering is broken
- API is healthy
- content data is still valid

Rollback action:

- redeploy the previous known-good static or SSR build

### `admin` rollback

Use when:

- staff workflows are broken
- API is healthy enough to support the previous admin version

Rollback action:

- redeploy the previous known-good admin build

### `api` rollback

Use when:

- public or admin API contracts fail
- auth or storage integration is broken
- internal jobs or rate limits regress

Rollback action:

- redeploy the previous known-good API build only if schema compatibility still holds

### database restore

Use only when:

- data corruption has occurred
- a migration has caused unrecoverable logical damage
- application rollback alone cannot recover behavior

Database restore should be treated as a major incident, not a routine rollback.

## 10. Backup And Restore Drill

Minimum recurring drill:

- take the latest staging or production-style backup
- restore into an isolated non-production database
- run migrations if the restore workflow requires it
- start `apps/api` against the restored database
- verify `GET /api/public/v1/home`
- verify admin login works with a controlled staff account
- verify published content remains visible

Record:

- backup source timestamp
- restore destination
- restore duration
- validation results
- follow-up issues

## 11. Scheduled Publishing Operations

If scheduled publishing is enabled:

- ensure platform cron or scheduler calls `POST /api/internal/v1/publish-scheduled-content`
- authenticate with `INTERNAL_API_TOKEN`
- alert on repeated non-2xx responses
- log the returned `totalPublished` and `totalSkipped`

If `totalSkipped > 0`:

- inspect skipped article IDs
- review validation issues
- correct the article in admin
- rerun the internal endpoint manually if needed

## 12. Incident Triage

When an incident is detected:

1. identify the failing surface: `site`, `admin`, `api`, `db`, or `storage`
2. determine whether the issue is read-only, write-only, auth-related, or data-corruption-related
3. freeze further deployments if the scope is unclear
4. decide between rollback, hotfix, or restore
5. capture timeline and root cause notes while the context is fresh

When user-visible API failures occur:

- capture the failing `X-Request-ID`
- locate the matching `request.completed` or `request.failed` log entry
- use `error.requestId` from client-side payloads when browser access to headers is limited

High-priority incidents include:

- admin login failure
- public pages returning widespread 5xx responses
- storage upload failures for all editors
- migration failures
- scheduled publishing repeatedly failing

## 13. Post-Release Notes

After each production deployment, record:

- deployed commit or tag
- migration identifiers applied
- validation results
- any partial rollback performed
- known follow-up work

This can live in the deployment system, issue tracker, or release log, but it should exist somewhere durable.

## 14. Recommended Next Use

This runbook should directly drive:

- CI/CD pipeline gates
- staging signoff
- production release checklist usage
- backup and restore drills
