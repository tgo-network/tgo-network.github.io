# TGO Network MVP Scope

## 1. Product Delivery Principle

This project should not choose between:

- building a throwaway MVP
- or trying to ship the full final product in one pass

The correct approach is:

Build on the final target architecture, but deliver in staged product slices.

This means:

- Architecture decisions should already align with the long-term system
- Feature scope should be intentionally limited per phase
- Later phases should extend the system, not replace it

## 2. What Must Be Stable Now

These decisions should be treated as stable unless there is explicit discussion to change them:

- Public site uses `Astro`
- Admin console uses `Vue + Vite`
- Backend uses `Hono`
- Primary relational data store is `PostgreSQL`
- Auth direction is `Better Auth`
- File binaries use `S3-compatible object storage`
- Public site, admin, and API remain separate applications
- Business authorization stays in our application layer

These are foundation decisions, not MVP-only choices.

## 3. What MVP Means In This Project

For this project, MVP should mean:

- The public site can launch with credible content and branding
- The admin can support essential staff operations
- The backend and data model are real, not disposable
- The system can evolve toward richer member, event, and auth workflows

MVP does not mean:

- every planned feature is present
- every workflow is fully automated
- every content type has a polished backend tool
- every long-term feature is implemented on day one

## 4. Phase Model

### Phase 0: Architecture Baseline

Goal:

- Finalize system shape, boundaries, and implementation direction

In scope:

- Stack selection
- Repository structure design
- System architecture document
- Agent rules and implementation constraints
- Initial planning documents

Exit criteria:

- Core technical choices are documented
- System boundaries are stable enough to start detailed design

### Phase 1: Walking Skeleton

Goal:

- Prove the whole system can run end-to-end with minimal features

In scope:

- Monorepo scaffold
- `apps/site`, `apps/admin`, `apps/api`
- Shared packages
- Database connection and initial migration flow
- Better Auth baseline integration
- Minimal deployable CI or local run path

Example deliverables:

- Public site homepage shell
- Admin login shell
- API health route
- Working database migration
- One authenticated admin-only API route

Exit criteria:

- The three applications run together
- Auth, database, and API wiring are proven
- The repository is ready for feature development

### Phase 2: Public MVP

Goal:

- Launch a credible public-facing site

In scope:

- Homepage
- Topic listing and detail pages
- Article or blog listing and detail pages
- Event listing and detail pages
- City pages
- Trial or contact application form
- Core SEO fields and metadata
- Basic media upload or media linking support

Likely content statuses:

- draft
- published
- archived

Out of scope for this phase:

- member-only areas
- phone OTP login
- advanced recommendation logic
- payment flows
- complex personalization

Exit criteria:

- Public users can browse key content domains
- Staff can publish enough content to keep the site current
- The site is launchable without hand-editing code for every update

### Phase 3: Admin MVP

Goal:

- Give staff the minimum internal tools needed to operate the site

In scope:

- Staff login
- Role-aware admin shell
- Article CRUD
- Topic management
- Event CRUD
- Application review
- Media asset management
- Basic site settings or featured content configuration

Out of scope for this phase:

- granular workflow engines
- advanced dashboards
- fine-grained audit analysis tools
- complicated multi-step approval chains

Exit criteria:

- Staff can manage core content without developer intervention
- Admin access is gated by role or permission checks
- Public content updates can flow through the backend

### Phase 4: Production Hardening

Goal:

- Make the system safe and maintainable for real operations

In scope:

- Audit logging
- Error handling conventions
- Monitoring and alerting
- Backup and restore process
- Rate limiting
- Upload validation and security
- Caching strategy
- Environment separation

Exit criteria:

- The system is operationally supportable
- Core risk areas have baseline controls

### Phase 5: Growth Features

Goal:

- Extend the platform after the core publishing and operations loop is stable

Candidate scope:

- Phone OTP login
- Notifications
- Member-only features
- Event check-in
- richer role system
- analytics dashboards
- automation and integrations

## 5. Recommended MVP Boundary

The recommended first real release should include:

- Public site with homepage, articles, topics, events, and city pages
- Admin with staff login and content/event management
- API and database that already match the long-term architecture
- File upload support for editorial assets

The recommended first release should not include:

- mobile-first auth experiments
- too many public account features
- heavy social or community features
- payment systems
- a large internal workflow platform

This keeps the first release useful without overloading the team.

## 6. MVP Scope By Domain

### Identity

MVP:

- user records
- staff login
- session management
- basic role-based access

Later:

- phone OTP login
- advanced profile settings
- member privilege layers

### Content

MVP:

- articles
- topics
- city pages
- featured blocks

Later:

- richer editorial workflow
- revision history UI
- scheduled publishing automation

### Events

MVP:

- event CRUD
- event detail pages
- registration form or intent capture

Later:

- check-in
- attendance workflows
- event reminders and notifications

### Applications

MVP:

- trial application or join/contact form
- admin-side review status

Later:

- multi-step review workflow
- internal assignment and follow-up tools

### Media

MVP:

- upload images and attachments
- asset metadata
- reuse uploaded assets in content and events

Later:

- transformations
- media library search improvements
- automated lifecycle rules

## 7. MVP Acceptance Criteria

Before calling the first release complete, the system should satisfy all of the following:

- Public users can discover the main content areas
- Staff can log in and manage content through the admin
- Public pages read from real backend-managed data
- Uploads do not depend on committing files into the repo
- Role checks exist for protected admin actions
- Core flows work without manual database edits

## 8. Documentation Required Before Implementation

Before feature implementation begins in earnest, the team should complete:

- `docs/mvp-scope.md`
- route and page map
- data model draft
- auth and permission design
- API design draft

Without these, implementation will likely drift.

## 9. Decision Rule For New Requests

When a new feature request appears, evaluate it using this order:

1. Does it change the architecture baseline
2. Is it required for the current phase to succeed
3. Does it belong in a later phase without blocking current delivery

If the answer to `2` is no, default to later-phase backlog unless there is a strong business reason.

## 10. Recommended Immediate Next Step

Now that the documentation baseline exists, the next step should be:

- start implementation with monorepo scaffolding

Why:

- the required planning documents are now in place
- further progress is best made through implementation and validation
- any later document changes should follow real build feedback instead of speculation
