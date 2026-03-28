# Documentation Map

This directory contains the planning and design documents for the TGO-like platform.

Recommended reading order:

1. `system-architecture.md`
2. `local-development.md`
3. `mvp-scope.md`
4. `route-map.md`
5. `data-model.md`
6. `auth-and-permission.md`
7. `api-design.md`
8. `content-workflow.md`
9. `media-storage.md`
10. `implementation-roadmap.md`
11. `deployment-and-environments.md`
12. `testing-strategy.md`
13. `operations-runbook.md`

Document roles:

- `system-architecture.md`
  - High-level technical architecture and system boundaries
- `local-development.md`
  - Local bootstrap flow, infrastructure commands, and smoke-test checklist
- `mvp-scope.md`
  - Delivery phases, MVP scope, and release boundary
- `route-map.md`
  - Public and admin pages, route ownership, and rendering expectations
- `data-model.md`
  - Core domains, tables, relationships, and lifecycle fields
- `auth-and-permission.md`
  - Authentication, staff roles, permission model, and future phone login path
- `api-design.md`
  - API conventions, endpoint groups, and contract rules
- `content-workflow.md`
  - Editorial states, publishing rules, and preview/publish flow
- `media-storage.md`
  - Object storage responsibilities, upload flow, and asset metadata
- `implementation-roadmap.md`
  - Build sequence, milestone outputs, and execution order
- `deployment-and-environments.md`
  - Environment separation, deployment units, and runtime configuration
- `testing-strategy.md`
  - Test layers, critical coverage, and milestone quality gates
- `operations-runbook.md`
  - Release execution, rollback, backup/restore, and operational checks

Suggested implementation order:

1. Scaffold monorepo and shared packages
2. Implement database schema and migrations
3. Implement auth and role checks
4. Implement core public and admin APIs
5. Implement admin content flows
6. Implement public site rendering against real APIs
7. Add deployment automation and production hardening
