# AGENTS.md

## Purpose

This repository is the planning and implementation workspace for the TGO-like platform.

The product has three primary applications:

- Public site: `Astro`
- Admin console: `Vue + Vite`
- Backend API: `Hono`

Supporting infrastructure:

- Database: `PostgreSQL`
- ORM and migrations: `Drizzle ORM + Drizzle Kit`
- Authentication: `Better Auth`
- File storage: `S3-compatible object storage`

## Current Status

The repository is currently in the planning stage.

Before scaffolding or large implementation work:

- Read [README.md](/Users/ruix/Development/xrdavies/tgo-network.github.io/README.md)
- Read [docs/README.md](/Users/ruix/Development/xrdavies/tgo-network.github.io/docs/README.md)
- Read [docs/system-architecture.md](/Users/ruix/Development/xrdavies/tgo-network.github.io/docs/system-architecture.md)

The architecture document is the source of truth for high-level system decisions.

## Planned Repository Layout

When the workspace is scaffolded, use this structure:

```text
apps/
  site/         Astro public site
  admin/        Vue + Vite admin console
  api/          Hono API service

packages/
  db/           Drizzle schema, migrations, seed scripts
  shared/       Shared types, zod schemas, DTOs, constants
  ui/           Optional shared tokens or utilities

docs/
  planning and design documents
```

Do not collapse the public site, admin console, and backend into a single frontend framework.

## Architectural Rules

### Frontend Boundaries

- `apps/site` is for user-facing pages, SEO, content delivery, and low-JS interactive islands
- `apps/admin` is for internal staff workflows, tables, forms, permissions, and operations
- Do not build admin screens inside the Astro site

### Backend Boundaries

- `apps/api` is the only business API entry point
- Both `apps/site` and `apps/admin` should communicate through the API layer
- Do not let frontend apps directly own business logic that belongs in the API

### Data Boundaries

- Structured business data belongs in `PostgreSQL`
- File binaries belong in `S3-compatible object storage`
- Store only file metadata in the database

Examples of database data:

- users
- staff accounts
- roles and permissions
- articles
- topics
- events
- registrations
- applications

Examples of object storage data:

- cover images
- speaker photos
- event posters
- article inline images
- uploaded attachments

### Auth and Authorization

- `Better Auth` is responsible for authentication and session management
- Business authorization is owned by our application schema and middleware
- Do not rely on auth provider defaults to model staff permissions

Rule of thumb:

- Authentication answers who the user is
- Authorization answers what the user can do

### Portability

- Prefer standard Node.js-compatible libraries and deployment targets
- Avoid platform-locked features unless explicitly approved
- Do not introduce `Next.js` as the core application framework

## Implementation Guidance

### Preferred Order of Work

1. Finalize data model
2. Define API boundaries
3. Scaffold monorepo applications
4. Build public site MVP
5. Build admin MVP
6. Add operational hardening

### If You Are Adding New Features

- Check whether the feature belongs to `site`, `admin`, or `api`
- Update shared schemas or types when API contracts change
- Keep business rules in the backend
- Keep architecture docs aligned when major decisions change

### If You Are Changing Auth

- Preserve future support for phone OTP login
- Avoid coupling auth flows to a single frontend app
- Keep user identity concerns separate from staff role permissions

### If You Are Handling Uploads

- Route uploads through API-issued permissions or signed upload flows
- Persist file metadata in the database
- Reference assets by IDs or storage keys, not hardcoded vendor URLs

## Documentation Rules

- Update [docs/system-architecture.md](/Users/ruix/Development/xrdavies/tgo-network.github.io/docs/system-architecture.md) when architectural decisions change
- Keep `README.md` as the short entry point
- Keep this file focused on execution rules, not broad product background

## Non-Goals

Do not introduce these without explicit discussion:

- A single all-in-one frontend framework replacing the split architecture
- Frontend direct database access as the primary data path
- Vendor-specific features that reduce deployment portability
- File blobs stored directly in `PostgreSQL`

## Working Style for Agents

- Prefer incremental changes over speculative large rewrites
- Preserve existing architecture decisions unless the user asks to revisit them
- When a decision conflicts with this file, ask whether the architecture should change first
- Keep docs and implementation synchronized

## Commit Rules

- Use the `Conventional Commits 1.0.0` specification for every commit message
- Default format: `type(scope): description`
- Choose scopes that match the changed area when possible, such as `site`, `admin`, `api`, `db`, `shared`, or `docs`
- Keep the description short, imperative, and lowercase unless a proper noun requires capitalization
