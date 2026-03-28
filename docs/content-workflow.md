# TGO Network Content Workflow

## 1. Purpose

This document defines how content moves from creation to publication.

It applies primarily to:

- articles
- topics
- city pages
- events
- featured homepage blocks

## 2. Workflow Design Principles

- Public content must have an explicit publish state
- Draft work should not leak into public responses
- Publishing should be simple in MVP
- More complex approval chains can be added later
- Public site rendering should consume only publishable records

## 3. Core Content States

Recommended shared content states:

- `draft`
- `in_review`
- `scheduled`
- `published`
- `archived`

Meaning:

- `draft`
  - editable and not visible publicly
- `in_review`
  - waiting for editorial review and not visible publicly
- `scheduled`
  - approved for future publish time
- `published`
  - visible to public APIs
- `archived`
  - hidden from public view but retained for records

## 4. MVP Workflow Rule

For MVP, the system does not need a complicated approval engine.

A simple editorial lifecycle is enough:

1. create draft
2. edit content
3. optionally mark for review
4. publish or schedule
5. archive when no longer active

## 5. Content-Type Rules

### Articles

Required editorial fields:

- title
- slug
- excerpt
- body
- author
- topics
- cover image optional but recommended
- SEO fields optional but recommended

Current MVP implementation:

- admin stores the selected image as `coverAssetId`
- public APIs resolve that reference into a `coverImage` object with URL and metadata

Publishing rules:

- article must have title, slug, body, and author before publish
- only `published` articles appear in public article endpoints
- `scheduled` articles become public only after schedule time is reached

### Topics

Required editorial fields:

- title
- slug
- summary
- cover image optional but recommended for hubs and hero cards

Publishing rules:

- topics may publish with minimal curated body content
- related articles and events are derived dynamically from bindings

### City Pages

Required editorial fields:

- city name
- slug
- summary

Publishing rules:

- city pages can be published even if curated body content is minimal
- related articles and events are assembled from associated records

### Events

Required editorial fields:

- title
- slug
- city
- start time
- end time
- cover image optional but recommended for list cards and detail heroes

Additional event controls:

- content status controls public visibility
- registration state controls whether submissions are accepted
- `registration_url` can optionally point to an external form without removing the API-owned registration workflow

Important distinction:

- event `status=published` means the event page may be visible
- `registration_state=open` means registrations are allowed

Current MVP registration workflow:

1. a published event page accepts submissions only when `registration_state` is `open` or `waitlist`
2. the Astro event page posts to `/api/public/v1/events/:eventId/registrations`
3. the API persists attendee metadata in `event_registrations`
4. staff review those submissions in the admin registration queue
5. review actions update `status`, `reviewed_at`, and `reviewed_by_staff_id`

### Featured Blocks

Featured blocks control homepage and landing-page curation.

Recommended states:

- `draft`
- `active`
- `archived`

For MVP, `active` is equivalent to the currently published configuration.

## 6. Publishing Triggers

When content is published:

- the public API may start returning it immediately
- caches should be invalidated if caching is enabled
- Astro pages should be refreshed through SSR, rebuild, or revalidation strategy

When content is archived:

- public APIs must stop returning it
- historical admin access remains available

## 7. Preview Strategy

Recommended MVP preview approach:

- preview is available only to authenticated staff
- preview content is fetched through admin-authorized API calls
- public APIs should not expose draft or review content

Do not implement preview by weakening public filters.

## 8. SEO Ownership

Each publishable content type should support:

- `seo_title`
- `seo_description`
- canonical URL generation from slug
- Open Graph image using cover asset when available

If SEO fields are omitted:

- fall back to title and summary-derived values

## 9. Slug Policy

Recommended MVP rule:

- slug must be unique per content type
- slug edits are allowed before publish
- slug edits after publish should be restricted or logged carefully

Later enhancement:

- redirect records for changed slugs

## 10. Content Visibility Rules

Public site should only consume:

- `published` content
- or `scheduled` content whose publish time has already passed

Admin should be able to view:

- all states permitted by role

## 11. Editorial Ownership

Recommended MVP ownership:

- content editors own articles, topics, and featured blocks
- event managers own events
- event managers own registration review for their events
- super admins can override all publish operations

## 12. Scheduled Publishing

Do not overbuild this at first.

Recommended MVP-compatible approach:

- support `scheduled_at` on publishable entities
- use an internal scheduled job later to promote records to `published`

If scheduling is not implemented immediately:

- keep the field in the schema
- allow manual publish first

## 13. Content Source Of Truth

Prototype phase:

- local mock data or content collections may exist temporarily

Real product phase:

- backend-managed database records are the source of truth
- admin is the authoring interface
- Astro consumes published content from the backend

## 14. Out Of Scope For MVP

- multi-stage editorial approval chains
- collaborative editing
- revision history UI
- diff viewer
- content localization

## 15. Recommended Next Use

This document should directly drive:

- admin form states
- publish and archive endpoints
- public API filters
- Astro data-loading rules
