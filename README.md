# home.tgo.network

Current implementation status:

- Monorepo scaffold is in place for `apps/site`, `apps/admin`, `apps/api`, `packages/shared`, and `packages/db`
- Root scripts use `corepack pnpm` so the workspace does not depend on a healthy global `pnpm` shim
- Better Auth baseline, staff permission middleware, Drizzle schema, and seed scripts are wired into the API layer
- Public MVP routes now exist for topic, article, event, and city list/detail pages in `apps/site`
- Public API detail routes and the `/api/public/v1/applications` validation flow are backed by shared DTOs in `packages/shared`
- Public event detail pages now include an API-backed registration form for `open` and `waitlist` events
- Protected admin read APIs now return real authenticated data for dashboard, topics, articles, events, and applications
- Admin authoring now supports topic/article create, edit, publish, and archive flows through protected Hono endpoints and Vue editor screens
- Event operations now support create, edit, publish, archive, registration-state management, and agenda editing
- Event registration now supports public submissions plus staff review/update flows in the admin console
- Application review now supports detail pages, status updates, and internal review notes in the admin console
- Asset management now supports protected asset listing plus signed S3-compatible upload and finalize flows in the admin console
- Topic, article, and event editors now support selecting a cover asset, and the public site renders those images from API-provided asset metadata
- Homepage featured content is now configurable from the admin console and drives the public `/api/public/v1/home` payload
- Basic site settings now drive the public site header/footer configuration through `/api/public/v1/site-config`
- Sensitive admin mutations now write audit records and can be reviewed from the admin console audit log page
- Staff account provisioning now supports protected list/create/update flows, and roles now support protected list/update flows in the admin console
- Public write endpoints now have baseline rate limiting, and asset finalization now enforces stronger metadata checks
- Local bootstrap scripts are in place for `PostgreSQL`, optional `MinIO`, database seeding, and the initial super admin account
- `npm run typecheck` and `npm run build` pass, and the event registration, rate limiting, upload-hardening, and staff/role management flows have been smoke-tested against the local API

Workspace commands:

```bash
env COREPACK_HOME="$PWD/.corepack" corepack pnpm install
npm run infra:up
npm run infra:up:storage
npm run bootstrap:dev
npm run typecheck
npm run build
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

Environment notes:

- Copy `.env.example` to `.env` before enabling auth-backed API flows
- `DATABASE_URL` and `BETTER_AUTH_SECRET` are required for `/api/auth/*` and protected admin endpoints
- The default local admin credentials are controlled by `DEV_ADMIN_EMAIL`, `DEV_ADMIN_PASSWORD`, and `DEV_ADMIN_NAME`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` enable admin asset uploads
- Without those values, public APIs still work and protected admin endpoints return `AUTH_NOT_CONFIGURED`
- The Astro site falls back to shared demo content when the API is not running, so static builds still succeed locally

Project planning documents:

- [Agent guidelines](AGENTS.md)
- [Documentation map](docs/README.md)
- [Local development](docs/local-development.md)
- [Overall architecture](docs/system-architecture.md)
- [MVP scope](docs/mvp-scope.md)
- [Route map](docs/route-map.md)
- [Data model](docs/data-model.md)
- [Auth and permission](docs/auth-and-permission.md)
- [API design](docs/api-design.md)
- [Content workflow](docs/content-workflow.md)
- [Media storage](docs/media-storage.md)
- [Implementation roadmap](docs/implementation-roadmap.md)
- [Deployment and environments](docs/deployment-and-environments.md)
- [Testing strategy](docs/testing-strategy.md)
