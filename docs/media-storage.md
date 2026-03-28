# TGO Network Media And Object Storage Design

## 1. Purpose

This document defines:

- what belongs in object storage
- what belongs in the relational database
- how uploads should flow through the system

## 2. Design Principles

- Store binary files in object storage
- Store file metadata in PostgreSQL
- Avoid vendor-locked file access patterns
- Upload through API-controlled flows
- Keep asset references stable through internal asset IDs

## 3. What Belongs In Object Storage

Recommended object storage assets:

- homepage banners
- topic cover images
- article cover images
- article inline images
- city page covers
- event posters
- speaker photos
- application attachments
- future user-uploaded files

## 4. What Does Not Belong In Object Storage

These should remain in PostgreSQL:

- article titles and bodies
- topic metadata
- event records and registration states
- user identities
- role and permission data
- asset metadata

These can remain in frontend source control when stable:

- brand logo
- fixed icons
- developer-managed placeholder graphics

## 5. Metadata Model

Use the `assets` table as the file metadata source of truth.

Minimum metadata fields:

- `id`
- `storage_provider`
- `bucket`
- `object_key`
- `visibility`
- `asset_type`
- `mime_type`
- `byte_size`
- `width`
- `height`
- `original_filename`
- `alt_text`
- `uploaded_by_staff_id`
- `status`
- `created_at`

## 6. Asset Types

Recommended initial asset types:

- `site-banner`
- `topic-cover`
- `article-cover`
- `article-inline`
- `city-cover`
- `event-poster`
- `speaker-avatar`
- `application-attachment`
- `generic-file`

These types can drive:

- validation
- size limits
- editor UI labels
- lifecycle rules later

## 7. Visibility Model

Recommended visibility values:

- `public`
- `private`

Use `public` for:

- cover images
- inline editorial images
- public event posters

Use `private` for:

- application attachments
- internal-only documents
- future user-submitted sensitive files

## 8. Storage Key Strategy

Recommended key shape:

```text
{environment}/{domain}/{asset-type}/{yyyy}/{mm}/{asset-id}-{slugified-name}.{ext}
```

Example:

```text
prod/content/article-cover/2026/03/8f6d...-ai-architecture.webp
```

Benefits:

- environment isolation
- easier debugging
- predictable bucket hygiene
- avoids filename collisions

## 9. Upload Flow

Recommended upload flow:

1. admin client requests upload intent from API
2. API validates asset type and permissions
3. API returns signed upload data or upload credentials
4. client uploads directly to object storage
5. client calls upload-complete endpoint
6. API verifies object presence and writes asset metadata
7. business entity stores `asset_id` reference

Benefits:

- backend remains the control point
- frontend does not need long-lived storage secrets
- storage provider can change without changing business data relations

Current MVP implementation:

- upload intent returns a signed `PUT` URL plus an `intentToken`
- completion uses `intentToken` to verify the expected object key and metadata
- asset records are inserted only after the object exists in storage
- public asset preview URLs are derived from storage configuration, not stored in business entities
- topics, articles, and events store `cover_asset_id` references instead of raw asset URLs
- public APIs resolve those references into runtime `coverImage` URLs for Astro pages

## 10. Validation Rules

At minimum validate:

- file size
- mime type
- allowed extension
- visibility class
- asset type authorization

Recommended MVP examples:

- editorial images:
  - allow `image/jpeg`, `image/png`, `image/webp`
- attachments:
  - allow a small explicit set such as `application/pdf`

Reject:

- executable formats
- unknown content types
- oversized files

## 11. Security Rules

- signed uploads should be short-lived
- admin upload endpoints require staff authentication
- private files should be delivered using signed download URLs or proxied access
- public URLs should be generated from metadata, not hardcoded into business records

## 12. Deletion Strategy

Recommended MVP rule:

- deleting an asset from the UI should archive it first
- hard deletion from storage should be a controlled maintenance operation

Reasons:

- avoids breaking published pages immediately
- reduces accidental loss of still-referenced files

## 13. Asset Usage Tracking

Asset usage tracking is optional for MVP but recommended later.

Benefits:

- detect unused files
- warn before deleting referenced assets
- support cleanup policies

If implemented, use `asset_usages` with:

- `asset_id`
- `entity_type`
- `entity_id`
- `usage_type`

## 14. CDN And Delivery

Recommended delivery model:

- object storage for origin
- optional CDN in front of public assets

Do not make business logic depend on CDN-specific URLs.

Store:

- bucket or provider metadata
- object key
- visibility

Derive public or signed access URLs at runtime.

## 15. MVP Scope

Required in MVP:

- editorial image uploads
- event poster uploads
- application attachment uploads if forms require files
- asset metadata persistence
- cover asset selection inside topic, article, and event admin editors

Can wait until later:

- image transformations
- responsive image variants
- media deduplication
- lifecycle retention policies

## 16. Recommended Next Use

This document should directly drive:

- asset schema design
- upload endpoints
- admin media library behavior
- frontend image integration rules
