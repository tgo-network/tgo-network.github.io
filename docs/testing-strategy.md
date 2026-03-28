# TGO Network Testing Strategy

## 1. Purpose

This document defines a practical testing strategy for the platform.

The goal is not exhaustive theoretical coverage.

The goal is to:

- protect critical business flows
- keep tests aligned with the application split
- add confidence without slowing early delivery excessively

## 2. Testing Principles

- test the highest-risk logic at the lowest useful layer
- prefer stable tests over broad but brittle tests
- cover auth, permissions, publishing, and uploads early
- keep public site and admin tests aligned with real API contracts

## 3. Test Layers

Recommended layers:

- unit tests
- integration tests
- end-to-end tests
- manual release checks

## 4. Backend Test Scope

### Unit Tests

Use for:

- pure utility functions
- permission resolution logic
- content status transition helpers
- storage key generation
- input normalization helpers

### Integration Tests

Use for:

- API handlers
- auth middleware behavior
- permission enforcement
- repository or service logic against a test database
- upload intent and completion flows

Priority backend integration cases:

- unauthenticated admin request is rejected
- authenticated non-staff user is rejected
- inactive staff user is rejected
- missing permission is rejected
- publish endpoint changes content visibility correctly
- public endpoints return published content only
- asset upload completion persists metadata correctly
- public write endpoints enforce rate limits with the expected error shape
- asset upload completion rejects invalid dimension metadata

## 5. Public Site Test Scope

Focus on:

- route rendering
- data-loading integration
- published-state visibility
- SEO-critical output on key pages

Recommended tests:

- homepage renders featured content
- topic detail renders expected sections
- article detail renders title and content
- event detail reflects registration state
- event detail accepts a registration submission when the event is open or waitlist-only
- unpublished content is not rendered publicly

## 6. Admin Test Scope

Focus on:

- route protection
- permission-based navigation
- form submission
- table filters and mutation success states

Recommended tests:

- login-required redirect behavior
- permission-limited navigation visibility
- article create and publish form flow
- event create and publish flow
- event registration review queue and status update flow
- application review status update flow
- asset upload and asset selection flow
- staff account create/update flow
- role permission update flow

## 7. End-To-End Coverage

Do not try to test every page end-to-end.

For MVP, prioritize these critical paths:

1. staff login to admin shell
2. create article and publish article
3. create event and publish event
4. submit public event registration and review it in admin
5. submit public application
6. upload editorial image and use it in content
7. provision or update one staff account
8. adjust one role permission bundle
9. verify public page reflects published changes

## 8. Manual Release Checklist

Before production release, manually verify:

- admin login
- logout
- password reset if enabled
- homepage content load
- article list and detail
- event list and detail
- public event registration submission
- admin registration review update
- application submission
- asset upload
- one protected admin mutation with expected audit output visible in `GET /api/admin/v1/audit-logs`
- staff account creation or update
- role permission bundle update

## 9. Test Data Strategy

Recommended approach:

- seed minimal fixed roles and permissions
- seed one super admin
- seed a small content dataset for public tests
- keep fixtures deterministic

Avoid:

- fragile shared state across unrelated tests
- dependence on production-like mutable data

## 10. Environment Strategy For Tests

Recommended environments:

- unit tests with isolated execution
- integration tests with dedicated test database
- end-to-end tests against ephemeral or dedicated test environment

Important rule:

- never run destructive test flows against production services

## 11. Suggested Tooling Direction

The exact tool choice can follow the app scaffolds, but the strategy should remain:

- backend test runner in Node
- browser-based E2E for admin and public paths
- shared fixture generation where practical

Tooling should match the chosen frameworks once scaffolding is created.

## 12. Quality Gates By Milestone

### M0

- workspace builds
- baseline lint and type checks pass

### M1

- backend auth and permission integration tests pass
- migration flow works from empty database

### M2

- public API integration tests pass
- key public pages render successfully

### M3

- admin critical CRUD and publish E2E passes
- asset upload path passes

### M4

- release checklist documented and repeatable
- rollback and backup validation tested at least once

## 13. What To Defer

These do not need to block MVP:

- exhaustive visual regression coverage
- large-scale performance benchmarking
- full combinatorial role matrix tests
- heavy contract snapshot testing for every endpoint

Add them later only if risk justifies them.

## 14. Recommended Next Use

This document should directly drive:

- test package selection during scaffold
- CI test stages
- minimum pre-release validation
