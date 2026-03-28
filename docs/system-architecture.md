# TGO Network Overall Architecture

## 1. Project Goals

This project targets a product shape similar to `TGO`:

- Public-facing content site for brand, topics, events, blog, and city pages
- Staff admin console for content operations and event management
- Unified backend for auth, content, events, applications, and media
- Portable deployment model without binding the whole system to a single hosting vendor

Core engineering principles:

- Static-first for public pages
- Separate concerns between site, admin, and API
- Standard infrastructure choices for portability
- Business authorization owned by our application, not hidden inside a platform
- Leave room for future phone-based login and richer workflows

## 2. Chosen Stack

### Frontend

- Public site: `Astro`
- Admin console: `Vue + Vite`

### Backend

- API framework: `Hono`
- Database: `PostgreSQL`
- ORM and migrations: `Drizzle ORM + Drizzle Kit`
- Authentication: `Better Auth`
- File storage: `S3-compatible object storage`

### Infra

- Monorepo managed with `pnpm`
- Runtime: `Node.js`
- Deployment: `Docker` on any standard Node-compatible platform
- Optional managed services:
  - Database: `Neon` or self-hosted `PostgreSQL`
  - Object storage: `Cloudflare R2`, `AWS S3`, or `MinIO`

## 3. High-Level Architecture

```text
Users
  -> Public Site (Astro)
  -> Admin Console (Vue + Vite)

Public Site / Admin Console
  -> API Service (Hono)
  -> Auth Routes (Better Auth)

API Service
  -> PostgreSQL
  -> Object Storage
```

Design intent:

- The site focuses on SEO, content delivery, and low-JS rendering
- The admin focuses on forms, tables, permissions, and workflows
- The API becomes the only business entry point for both frontends
- The database remains the source of truth for users, content, events, and operations

## 4. Monorepo Layout

Recommended structure:

```text
apps/
  site/         Astro public site
  admin/        Vue + Vite admin console
  api/          Hono API service

packages/
  db/           Drizzle schema, migrations, seed scripts
  shared/       Shared types, zod schemas, API DTOs, constants
  ui/           Optional shared UI tokens or utilities

docs/
  system-architecture.md
```

Why this layout:

- `apps/site` and `apps/admin` can evolve independently
- `apps/api` keeps backend concerns away from frontend build pipelines
- `packages/db` centralizes schema ownership
- `packages/shared` reduces drift between API contracts and frontend consumers

## 5. Rendering Strategy

### Public Site

Use `Astro` as a static-first frontend.

Recommended rendering rules:

- Brand pages, topic pages, article pages, and city pages:
  - Prefer static generation
- Frequently updated homepage sections:
  - Start with build-time fetch
  - Move selected blocks to server rendering if freshness becomes important
- Interactive widgets:
  - Use Astro islands only where necessary

### Admin Console

Use `Vue + Vite` as a SPA for staff workflows.

Admin priorities:

- Rich forms
- Search and filtering
- Batch operations
- Table-heavy interfaces
- Role-aware navigation and actions

## 6. Backend Responsibilities

`Hono` will own:

- Public content APIs
- Admin APIs
- Auth mounting and session handling
- Validation, authorization, and business rules
- Media upload signing or upload orchestration
- Audit logging and operational endpoints

Suggested API grouping:

- `/api/public/*`
- `/api/admin/*`
- `/api/auth/*`
- `/api/internal/*` for background jobs or trusted system calls

## 7. Auth and Permission Model

### Authentication

Use `Better Auth` for:

- Email/password login
- Social login if needed later
- Session management
- Password reset
- Future phone OTP login

Important boundary:

- `Better Auth` answers: who is this user
- Our business tables answer: what can this user do

### Authorization

Business authorization should be implemented in our own schema and middleware.

Recommended model:

- `users`
- `staff_accounts`
- `roles`
- `permissions`
- `staff_role_bindings`
- `role_permission_bindings`

Examples:

- Public member account can register for events
- Staff editor can create and publish articles
- Event operator can manage registration records
- Super admin can manage roles and system settings

## 8. Core Business Domains

Recommended initial domains:

- Identity
  - users
  - profiles
  - sessions
  - staff accounts
- Content
  - articles
  - topics
  - tags
  - authors
  - featured blocks
- Events
  - events
  - event schedules
  - event registrations
  - attendance or check-in records
- Applications
  - trial applications
  - membership applications
- Media
  - assets
  - upload records
- Operations
  - audit logs
  - announcements
  - site settings

## 9. Content Source of Truth

This needs an explicit rule to avoid rework later.

Recommended approach:

- Prototype stage:
  - Astro may use local mock data or content collections for speed
- Production stage:
  - `PostgreSQL` becomes the source of truth
  - Admin writes content into the backend
  - Astro builds or renders from API-delivered published content

This preserves a smooth early workflow without blocking long-term CMS capability.

## 10. File and Media Strategy

Use S3-compatible object storage for:

- Cover images
- Speaker photos
- Article assets
- Downloadable attachments
- User-uploaded files if needed later

Recommended rule:

- Metadata in `PostgreSQL`
- Binary files in object storage

This avoids storing large blobs in the main relational database.

## 11. Deployment Model

Recommended domain split:

- `www.example.com` for public site
- `admin.example.com` for admin
- `api.example.com` for backend
- `assets.example.com` for media CDN or object storage public access

Recommended deployment style:

- `apps/site`
  - static hosting or Node SSR hosting
- `apps/admin`
  - static hosting
- `apps/api`
  - Dockerized Node service

This keeps each application deployable on different platforms if needed.

## 12. Environment Strategy

Keep at least these environments:

- local
- staging
- production

Recommended baseline:

- Independent environment variables per app
- Separate database per environment
- Separate object storage buckets or prefixes
- Separate Better Auth secrets and cookie settings

## 13. Initial Delivery Phases

### Phase 1: Foundation

- Set up monorepo
- Create Astro site skeleton
- Create Vue admin skeleton
- Create Hono API skeleton
- Add Drizzle schema package
- Add Better Auth baseline integration

### Phase 2: Public Site MVP

- Homepage
- Topic listing
- Event listing
- Article listing and detail pages
- City pages
- Trial application form

### Phase 3: Admin MVP

- Staff login
- Role-aware admin shell
- Article CRUD
- Event CRUD
- Application review

### Phase 4: Operational Hardening

- Audit logs
- Upload pipeline
- SEO controls
- Caching strategy
- Metrics and error monitoring

### Phase 5: Growth Features

- Phone OTP login
- Richer role system
- Event check-in
- Notifications
- Member-only features

## 14. Key Technical Decisions Already Made

- Do not use `Next.js` as the core application framework
- Public site and admin console will be separate frontends
- Backend will stay framework-light and portable
- `PostgreSQL` is the primary data store
- `Better Auth` is the chosen auth direction
- Future phone login must remain possible without rewriting the stack

## 15. Open Questions

These should be resolved before detailed implementation:

- Which modules must exist in the first public launch
- Whether the homepage content is fully CMS-managed or partially hard-coded
- Which staff roles are needed in the first admin release
- Which SMS provider will be used for future phone login
- Whether deployment will begin on self-hosted infrastructure or managed platforms
- Whether event registration needs payment in the first version

## 16. Related Design Documents

Supporting documents in this repository:

- `docs/mvp-scope.md`
- `docs/route-map.md`
- `docs/data-model.md`
- `docs/auth-and-permission.md`
- `docs/api-design.md`
- `docs/content-workflow.md`
- `docs/media-storage.md`
- `docs/implementation-roadmap.md`
- `docs/deployment-and-environments.md`
- `docs/testing-strategy.md`
- `docs/README.md`
