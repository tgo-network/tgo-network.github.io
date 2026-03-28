# TGO Network Implementation Roadmap

## 1. Purpose

This document converts the architecture and design set into an execution order.

It focuses on:

- build sequence
- dependency order
- milestone outputs
- what should be proven before moving forward

## 2. Execution Principles

- Build in vertical slices, not isolated layers
- Prove end-to-end integration early
- Keep the final architecture stable while limiting feature scope per milestone
- Prefer production-shaped infrastructure and fake content over fake architecture

## 3. Milestone Overview

| Milestone | Goal | Primary output |
| --- | --- | --- |
| M0 | Scaffold the monorepo baseline | Running workspace with three apps and shared packages |
| M1 | Establish backend foundation | Database schema, migrations, auth, permission middleware |
| M2 | Deliver public content MVP | Real public pages backed by API-managed data |
| M3 | Deliver admin operations MVP | Staff admin for content, events, applications, and assets |
| M4 | Harden for production use | Logging, validation, monitoring, deploy flow, backups |
| M5 | Expand product capabilities | Phone OTP and richer operational features |

## 4. Milestone Details

### M0: Monorepo Baseline

Goal:

- create a clean workspace matching the planned architecture

Deliverables:

- `apps/site`
- `apps/admin`
- `apps/api`
- `packages/db`
- `packages/shared`
- root workspace config
- shared TypeScript config
- root scripts for install, dev, build, lint, test

Definition of done:

- all apps install and start
- shared package imports resolve correctly
- basic CI or local build commands work

### M1: Backend Foundation

Goal:

- make the backend trustworthy enough for real feature work

Deliverables:

- Drizzle schema baseline
- migration generation and apply flow
- Better Auth integration
- staff account lookup and permission middleware
- seed data for initial roles and permissions
- API health check
- authenticated admin `me` endpoint

Definition of done:

- database migrations can be applied from scratch
- auth session validation works
- protected routes reject unauthorized users correctly

### M2: Public Content MVP

Goal:

- ship the public-facing browsing experience on real backend-managed data

Deliverables:

- homepage
- topics list and detail
- articles list and detail
- events list and detail
- cities list and detail
- application form
- SEO basics
- public API endpoints for all public content

Definition of done:

- Astro pages render from API data
- published-only filters work consistently
- site content can be updated without code edits

### M3: Admin Operations MVP

Goal:

- allow staff to run the site without developer intervention

Deliverables:

- admin login
- permission-aware shell
- article CRUD and publish flow
- topic CRUD and publish flow
- event CRUD and publish flow
- application review
- asset upload and selection
- featured blocks and site settings basics

Definition of done:

- staff can create and publish content
- public site changes flow from admin-managed data
- asset upload and reuse work in real forms

### M4: Production Hardening

Goal:

- reduce operational risk before or after launch

Deliverables:

- audit logs on sensitive mutations
- structured error handling
- rate limiting on public write endpoints
- upload validation hardening
- environment-specific config
- deployment runbook
- backup and restore process
- monitoring baseline

Definition of done:

- major operational risks have baseline mitigations
- deployment and rollback are documented

### M5: Growth Features

Goal:

- extend capability after the core publishing loop is stable

Candidate items:

- phone OTP login
- event check-in
- richer reporting
- notifications
- member-only areas

## 5. Recommended Task Order

Recommended order inside the repo:

1. root workspace and package manager config
2. `packages/shared`
3. `packages/db`
4. `apps/api`
5. `apps/admin`
6. `apps/site`

Reasoning:

- backend contracts should exist before frontend integration
- admin depends most directly on mutation APIs
- site can be integrated cleanly after public APIs stabilize

## 6. Critical Dependency Chain

Some items should not be delayed because they gate many later tasks:

- database schema conventions
- auth integration
- permission middleware
- asset upload contract
- publish-state filtering rules

If any of these drift late, multiple apps will need rework.

## 7. Parallelizable Work

Once M1 exists, these can proceed in parallel:

- Astro public page implementation
- Vue admin shell and forms
- API route expansion by domain
- asset upload UI and metadata handling

Parallel work is safe only if:

- DTOs are shared
- API contracts are stable
- permissions are defined per route

## 8. Definition Of Ready

Before implementing a domain area, all of the following should exist:

- relevant data model
- API contract
- permission expectation
- page ownership
- state transitions

## 9. Definition Of Done For Each Feature Slice

Each implemented slice should include:

- schema or model updates if needed
- API endpoint or service logic
- frontend integration
- auth and permission enforcement
- tests at the appropriate layer
- documentation updates when contracts change

## 10. Early Engineering Risks

Watch these areas closely:

- auth and permission logic split across too many layers
- public pages accidentally reading draft content
- uploads becoming vendor-specific too early
- admin routes implemented before permission mapping is enforced
- Astro and Vue drifting from shared DTOs

## 11. Recommended Immediate Next Step

The next concrete work item after documentation is:

- scaffold the monorepo and shared package layout

Reason:

- the documentation set is now sufficient to start implementation
- delaying scaffolding will not meaningfully improve planning quality
