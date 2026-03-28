# TGO Network API Design Draft

## 1. Purpose

This document defines the API conventions and endpoint groups for the platform.

Goals:

- provide stable boundaries between frontends and backend
- reduce drift between public site, admin, and API
- clarify authentication and authorization expectations

## 2. API Design Principles

- All business data flows through the API layer
- Public and admin APIs are separated by intent and permission level
- Authentication endpoints are delegated to Better Auth
- Contracts should be typed and shared through the monorepo
- Mutating endpoints must validate input and enforce authorization

## 3. URL Structure

Recommended grouping:

- `/api/public/v1/*`
- `/api/admin/v1/*`
- `/api/internal/v1/*`
- `/api/auth/*`

Notes:

- `public` endpoints serve the Astro site and open form submissions
- `admin` endpoints serve the Vue admin console
- `internal` endpoints are reserved for trusted jobs or maintenance tasks
- `auth` endpoints are mounted from Better Auth

## 4. Transport And Format Rules

- JSON request and response bodies by default
- UTF-8 encoding
- `UUID` for identifiers
- ISO 8601 timestamps
- standard HTTP status codes

Recommended JSON success shape:

```json
{
  "data": {},
  "meta": {}
}
```

Recommended JSON error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid",
    "details": {}
  }
}
```

## 5. Common Query Conventions

Recommended list parameters:

- `page`
- `pageSize`
- `sort`
- `order`
- `status`
- `q`

Recommended pagination response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasNext": true
  }
}
```

## 6. Public API Group

### Site Configuration

- `GET /api/public/v1/site-config`
  - public branding and simple global settings
  - current MVP includes site name, navigation, footer tagline, and support email
- `GET /api/public/v1/home`
  - homepage payload including featured blocks
  - current MVP reads from an active homepage featured block when configured, then falls back to automatic published-content slices

### Topics

- `GET /api/public/v1/topics`
  - published topic list
- `GET /api/public/v1/topics/:slug`
  - topic detail with related content summary
  - list and detail responses include `coverImage` when a public asset is linked

### Articles

- `GET /api/public/v1/articles`
  - published article list
- `GET /api/public/v1/articles/:slug`
  - article detail
  - list and detail responses include `coverImage` when a public asset is linked

### Events

- `GET /api/public/v1/events`
  - published event list
- `GET /api/public/v1/events/:slug`
  - event detail
  - list and detail responses include `coverImage` when a public asset is linked
  - event payloads also include `registrationUrl` so the site can show an external fallback CTA when needed
- `POST /api/public/v1/events/:eventId/registrations`
  - public event registration
  - validates `name` plus at least one contact method: `email` or `phoneNumber`
  - returns a lightweight receipt with the persisted registration status

### Cities

- `GET /api/public/v1/cities`
  - published city list
- `GET /api/public/v1/cities/:slug`
  - city detail with related content summary

### Applications

- `POST /api/public/v1/applications`
  - submit trial, join, or contact application

### Public Validation Rules

- only published content should be returned
- archived or draft records must not leak into public responses
- public write endpoints should enforce rate limits and input validation
- current baseline rate limiting is in-memory and keyed by requester IP plus user agent
- rate-limited responses should return `429 RATE_LIMITED` plus `Retry-After` and `X-RateLimit-*` headers

## 7. Admin API Group

All admin endpoints require:

- authenticated session
- active staff account
- required permission code

### Session And Current User

- `GET /api/admin/v1/me`
  - current user profile, staff account, roles, permissions

### Dashboard

- `GET /api/admin/v1/dashboard`
  - minimal operations summary for MVP

### Articles

- `GET /api/admin/v1/articles`
- `GET /api/admin/v1/articles/references`
- `POST /api/admin/v1/articles`
- `GET /api/admin/v1/articles/:id`
- `PATCH /api/admin/v1/articles/:id`
- `POST /api/admin/v1/articles/:id/publish`
- `POST /api/admin/v1/articles/:id/archive`

### Topics

- `GET /api/admin/v1/topics`
- `POST /api/admin/v1/topics`
- `GET /api/admin/v1/topics/:id`
- `PATCH /api/admin/v1/topics/:id`
- `POST /api/admin/v1/topics/:id/publish`
- `POST /api/admin/v1/topics/:id/archive`

### Events

- `GET /api/admin/v1/events`
- `GET /api/admin/v1/events/references`
- `POST /api/admin/v1/events`
- `GET /api/admin/v1/events/:id`
- `PATCH /api/admin/v1/events/:id`
- `POST /api/admin/v1/events/:id/publish`
- `POST /api/admin/v1/events/:id/archive`

### Event Registrations

- `GET /api/admin/v1/events/:id/registrations`
- `GET /api/admin/v1/registrations/:id`
- `PATCH /api/admin/v1/registrations/:id`

Current MVP contract:

- public registration receipt returns:
  - `id`
  - `receivedAt`
  - `status`
  - `event`
  - `attendee`
- admin event registration list returns:
  - the event summary used by the review queue
  - attendee rows with `status`, `createdAt`, and `reviewedAt`
- admin event registration detail returns:
  - full attendee fields
  - `answersJson`
  - review metadata such as `reviewedByStaffId`
- admin registration update currently mutates:
  - `status`
  - and stamps `reviewedAt` plus `reviewedByStaffId`

### Audit Logs

- `GET /api/admin/v1/audit-logs`

Current MVP contract:

- returns recent sensitive admin mutations in reverse chronological order
- each record includes:
  - `action`
  - `targetType`
  - `targetId`
  - actor identity
  - request metadata
  - `beforeJson`
  - `afterJson`

### Applications

- `GET /api/admin/v1/applications`
- `GET /api/admin/v1/applications/:id`
- `PATCH /api/admin/v1/applications/:id`

### Assets

- `GET /api/admin/v1/assets`
- `POST /api/admin/v1/assets/uploads`
  - create upload intent or signed upload
- `POST /api/admin/v1/assets/uploads/complete`
  - finalize asset metadata after upload
- `PATCH /api/admin/v1/assets/:id`
- `DELETE /api/admin/v1/assets/:id`

Current MVP integration:

- topic, article, and event create/update payloads accept `coverAssetId`
- the API validates that selected cover assets exist, are active, are public, and are image files
- public responses resolve `coverAssetId` into `coverImage`

Current MVP contract:

- `POST /api/admin/v1/assets/uploads`
  - request body:
    - `filename`
    - `mimeType`
    - `byteSize`
    - `assetType`
    - `visibility`
  - response body:
    - `assetId`
    - `objectKey`
    - `uploadUrl`
    - `uploadMethod`
    - `uploadHeaders`
    - `intentToken`
    - `expiresAt`
    - `previewUrl`
- `POST /api/admin/v1/assets/uploads/complete`
  - request body:
    - `intentToken`
    - `altText`
    - `width`
    - `height`
    - `checksum`
  - behavior:
    - verify upload intent token
    - verify object presence in storage
    - persist asset metadata into `assets`
  - hardening rules:
    - object keys prefer server-approved extensions derived from the validated mime type
    - image uploads must include width and height metadata
    - document uploads must not include image dimensions
    - image uploads must stay within configured max dimension and max pixel limits

### Featured Blocks

- `GET /api/admin/v1/featured-blocks`
- `POST /api/admin/v1/featured-blocks`
- `PATCH /api/admin/v1/featured-blocks/:id`

Current MVP contract:

- `GET /api/admin/v1/featured-blocks/homepage`
  - returns the homepage featured block plus selectable published references
- `PATCH /api/admin/v1/featured-blocks/homepage`
  - saves hero copy, CTA labels/links, and curated topic/article/event/city selections

### Site Settings

- `GET /api/admin/v1/site-settings`
- `PATCH /api/admin/v1/site-settings`

Current MVP contract:

- `GET /api/admin/v1/site-settings`
  - returns basic public branding values
- `PATCH /api/admin/v1/site-settings`
  - updates site name, footer tagline, and support email

### Staff And Roles

Phase 4 or later:

- `GET /api/admin/v1/staff`
- `POST /api/admin/v1/staff`
- `PATCH /api/admin/v1/staff/:id`
- `GET /api/admin/v1/roles`
- `PATCH /api/admin/v1/roles/:id`

## 8. Internal API Group

Reserved for trusted automation and backend jobs.

Examples:

- `POST /api/internal/v1/revalidate`
- `POST /api/internal/v1/publish-scheduled-content`
- `POST /api/internal/v1/sync-derived-content`

Rules:

- never expose these routes to public frontend clients
- protect them with service credentials or internal network rules

## 9. Auth API Group

Mount Better Auth under:

- `/api/auth/*`

This group should handle:

- sign in
- sign out
- session validation
- password reset
- future phone OTP flows

Do not reimplement Better Auth primitives as custom business endpoints unless needed for policy wrappers.

## 10. Validation Strategy

Recommended structure:

- request schemas in `packages/shared`
- server-side validation in `apps/api`
- response DTOs shared with frontends

Use validation for:

- body payloads
- query parameters
- route params

## 11. Authorization Strategy

Recommended pattern:

- define required permission per admin route
- centralize auth context loading in middleware
- check business preconditions in service layer

Examples:

- article publish requires `article.publish`
- event edit requires `event.manage`
- application update requires `application.review`

## 12. Error Code Conventions

Recommended stable error codes:

- `UNAUTHENTICATED`
- `FORBIDDEN`
- `NOT_FOUND`
- `VALIDATION_ERROR`
- `CONFLICT`
- `RATE_LIMITED`
- `UNSUPPORTED_MEDIA_TYPE`
- `PAYLOAD_TOO_LARGE`
- `INTERNAL_ERROR`

## 13. Caching And Freshness Rules

Public GET endpoints may use caching if:

- content is published
- mutation invalidation is possible

Admin endpoints should default to fresh reads.

When published content changes:

- invalidate cache
- or trigger Astro rebuild or revalidation

## 14. Audit Expectations

Admin mutations that should generate audit records:

- article create, edit, publish, archive
- topic create, edit, publish, archive
- event create, edit, publish, archive
- application review changes
- asset deletion or replacement
- staff and role changes

## 15. Recommended Next Use

This document should directly drive:

- Hono route modules
- shared DTO packages
- frontend API clients
- permission middleware
