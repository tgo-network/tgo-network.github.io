# TGO Network Data Model Draft

## 1. Purpose

This document defines the initial domain model for the platform.

The goal is not to finalize every column in advance.

The goal is to:

- stabilize the core entities
- clarify ownership between auth, business data, and media
- reduce schema rework when implementation starts

## 2. Modeling Principles

- Use `UUID` primary keys
- Use `created_at` and `updated_at` on all core tables
- Prefer explicit relation tables for many-to-many relationships
- Keep authentication data separated from business authorization
- Keep file binaries out of the relational database
- Prefer stable internal IDs over human-readable identifiers in relations
- Use slugs for public URLs and names for display

## 3. Global Conventions

Recommended shared conventions:

- IDs: `uuid`
- Timestamps: `timestamptz`
- Text status values: enum or constrained text
- Public URL identifiers: `slug`
- Deletion strategy:
  - use soft deletion only where operational recovery matters
  - prefer status transitions over hard delete for published business entities

## 4. Domain Overview

Core domains:

- Identity
- Staff and permissions
- Content
- Events
- Applications
- Media
- Operations

High-level relation summary:

```text
users
  -> staff_accounts
  -> user_profiles
  -> articles (as author, optional)
  -> event_registrations

roles
  -> role_permission_bindings
staff_accounts
  -> staff_role_bindings

topics
  -> article_topic_bindings
articles
  -> article_tag_bindings
  -> assets

cities
  -> articles
  -> events
  -> applications

events
  -> event_sessions
  -> event_speaker_bindings
  -> event_registrations

assets
  -> asset_usages

users or staff_accounts
  -> audit_logs
```

## 5. Auth-Owned Versus App-Owned Tables

### Auth-Owned

`Better Auth` will own the core authentication tables.

Exact table names can vary by adapter, but conceptually they include:

- users
- accounts
- sessions
- verifications

These tables answer:

- who the user is
- how they authenticate
- whether they currently have a session

### App-Owned

The application owns:

- staff relationships
- roles and permissions
- content
- events
- applications
- media metadata
- audit records

## 6. Identity Tables

### `users`

Canonical identity record, managed alongside Better Auth.

Key fields:

- `id`
- `email`
- `email_verified`
- `name`
- `image`
- `status`
- `phone_number` nullable for future use
- `phone_verified_at` nullable for future use
- `created_at`
- `updated_at`

Notes:

- `phone_number` should be stored in normalized `E.164` format
- do not use email or phone as business foreign keys

### `user_profiles`

Optional profile extension for public or internal display data.

Key fields:

- `user_id`
- `display_name`
- `headline`
- `bio`
- `city_id` nullable
- `avatar_asset_id` nullable
- `social_links_json` nullable
- `created_at`
- `updated_at`

## 7. Staff and Permission Tables

### `staff_accounts`

Represents which users are allowed into the admin system.

Key fields:

- `id`
- `user_id`
- `status`
- `invited_by_staff_id` nullable
- `invited_at` nullable
- `activated_at` nullable
- `last_login_at` nullable
- `notes` nullable
- `created_at`
- `updated_at`

Suggested statuses:

- `invited`
- `active`
- `suspended`
- `disabled`

### `roles`

Reusable role definitions.

Key fields:

- `id`
- `code`
- `name`
- `description`
- `is_system`
- `created_at`
- `updated_at`

### `permissions`

Atomic capabilities.

Key fields:

- `id`
- `code`
- `name`
- `resource`
- `action`
- `created_at`
- `updated_at`

Permission naming convention:

- `article.read`
- `article.write`
- `article.publish`
- `event.manage`
- `application.review`

### `staff_role_bindings`

Assigns one or more roles to a staff account.

Key fields:

- `id`
- `staff_account_id`
- `role_id`
- `created_at`

### `role_permission_bindings`

Maps roles to permissions.

Key fields:

- `id`
- `role_id`
- `permission_id`
- `created_at`

## 8. Location and Taxonomy Tables

### `cities`

Represents city landing pages and city association for content and events.

Key fields:

- `id`
- `slug`
- `name`
- `short_name`
- `region`
- `summary`
- `body_richtext`
- `status`
- `cover_asset_id` nullable
- `seo_title` nullable
- `seo_description` nullable
- `created_at`
- `updated_at`

Suggested statuses:

- `draft`
- `published`
- `archived`

### `topics`

Represents special themes or editorial topic hubs.

Key fields:

- `id`
- `slug`
- `title`
- `summary`
- `body_richtext`
- `status`
- `cover_asset_id` nullable
- `seo_title` nullable
- `seo_description` nullable
- `published_at` nullable
- `created_at`
- `updated_at`

### `tags`

Lightweight cross-cutting classification.

Key fields:

- `id`
- `slug`
- `label`
- `created_at`
- `updated_at`

## 9. Content Tables

### `authors`

Author identity for public display.

Key fields:

- `id`
- `user_id` nullable
- `display_name`
- `bio`
- `avatar_asset_id` nullable
- `status`
- `created_at`
- `updated_at`

Notes:

- an author can map to a platform user or exist as a standalone editorial author record

### `articles`

Primary long-form content entity.

Key fields:

- `id`
- `slug`
- `title`
- `excerpt`
- `body_richtext`
- `status`
- `author_id`
- `primary_city_id` nullable
- `cover_asset_id` nullable
- `seo_title` nullable
- `seo_description` nullable
- `scheduled_at` nullable
- `published_at` nullable
- `created_by_staff_id`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

Suggested statuses:

- `draft`
- `in_review`
- `scheduled`
- `published`
- `archived`

### `article_topic_bindings`

Many-to-many relation between articles and topics.

Key fields:

- `id`
- `article_id`
- `topic_id`
- `created_at`

### `article_tag_bindings`

Many-to-many relation between articles and tags.

Key fields:

- `id`
- `article_id`
- `tag_id`
- `created_at`

## 10. Event Tables

### `events`

Primary event entity.

Key fields:

- `id`
- `slug`
- `title`
- `summary`
- `body_richtext`
- `status`
- `city_id`
- `venue_name` nullable
- `venue_address` nullable
- `starts_at`
- `ends_at`
- `timezone`
- `cover_asset_id` nullable
- `capacity` nullable
- `registration_state`
- `registration_url` nullable
- `published_at` nullable
- `created_by_staff_id`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

Suggested statuses:

- `draft`
- `published`
- `archived`

Suggested registration states:

- `not_open`
- `open`
- `waitlist`
- `closed`

### `speakers`

Speaker or guest profile for events.

Key fields:

- `id`
- `name`
- `title`
- `company`
- `bio`
- `avatar_asset_id` nullable
- `created_at`
- `updated_at`

### `event_speaker_bindings`

Associates speakers to events.

Key fields:

- `id`
- `event_id`
- `speaker_id`
- `role_label` nullable
- `sort_order`

### `event_sessions`

Agenda items inside an event.

Key fields:

- `id`
- `event_id`
- `title`
- `summary` nullable
- `starts_at` nullable
- `ends_at` nullable
- `speaker_name` nullable
- `speaker_id` nullable
- `sort_order`
- `created_at`
- `updated_at`

### `event_registrations`

Public event registration or RSVP records.

Key fields:

- `id`
- `event_id`
- `user_id` nullable
- `name`
- `phone_number` nullable
- `email` nullable
- `company` nullable
- `job_title` nullable
- `answers_json` nullable
- `status`
- `source`
- `reviewed_by_staff_id` nullable
- `reviewed_at` nullable
- `created_at`
- `updated_at`

Suggested statuses:

- `submitted`
- `approved`
- `rejected`
- `waitlisted`
- `cancelled`

## 11. Application Tables

### `applications`

Generic inbound form submissions such as trial, join, or contact requests.

Key fields:

- `id`
- `type`
- `name`
- `phone_number` nullable
- `email` nullable
- `company` nullable
- `job_title` nullable
- `city_id` nullable
- `message` nullable
- `source_page`
- `status`
- `assigned_to_staff_id` nullable
- `reviewed_by_staff_id` nullable
- `reviewed_at` nullable
- `internal_notes` nullable
- `created_at`
- `updated_at`

Suggested types:

- `trial`
- `membership`
- `contact`

Suggested statuses:

- `submitted`
- `in_review`
- `contacted`
- `approved`
- `rejected`
- `closed`

## 12. Media Tables

### `assets`

Metadata for files stored in object storage.

Key fields:

- `id`
- `storage_provider`
- `bucket`
- `object_key`
- `visibility`
- `asset_type`
- `mime_type`
- `byte_size`
- `width` nullable
- `height` nullable
- `checksum` nullable
- `original_filename`
- `alt_text` nullable
- `uploaded_by_staff_id` nullable
- `status`
- `created_at`
- `updated_at`

Suggested visibility values:

- `public`
- `private`

Suggested statuses:

- `uploaded`
- `active`
- `archived`
- `deleted`

### `asset_usages`

Optional relation table for tracking where assets are used.

Key fields:

- `id`
- `asset_id`
- `entity_type`
- `entity_id`
- `usage_type`
- `created_at`

## 13. Operations Tables

### `featured_blocks`

Homepage or landing-page blocks controlled by staff.

Key fields:

- `id`
- `code`
- `name`
- `status`
- `payload_json`
- `created_by_staff_id`
- `updated_by_staff_id`
- `created_at`
- `updated_at`

### `site_settings`

Small configuration store for site-level settings.

Key fields:

- `id`
- `key`
- `value_json`
- `updated_by_staff_id`
- `updated_at`

### `audit_logs`

Operational record of important staff actions.

Key fields:

- `id`
- `actor_user_id` nullable
- `actor_staff_account_id` nullable
- `action`
- `target_type`
- `target_id`
- `before_json` nullable
- `after_json` nullable
- `request_ip` nullable
- `user_agent` nullable
- `created_at`

## 14. Recommended MVP Cut Line

The following tables are MVP-critical:

- users
- user_profiles
- staff_accounts
- roles
- permissions
- staff_role_bindings
- role_permission_bindings
- cities
- topics
- tags
- authors
- articles
- article_topic_bindings
- article_tag_bindings
- events
- event_sessions
- event_registrations
- applications
- assets
- featured_blocks
- site_settings
- audit_logs

Tables that can be simplified or deferred:

- event_speaker_bindings
- speakers
- asset_usages

## 15. Recommended Indexes and Constraints

At minimum:

- unique index on `slug` for public entities
- unique index on `roles.code`
- unique index on `permissions.code`
- unique index on `tags.slug`
- unique index on `cities.slug`
- unique index on `topics.slug`
- unique index on `articles.slug`
- unique index on `events.slug`
- unique index on `staff_accounts.user_id`
- unique index on `assets.object_key`

Also add:

- foreign-key constraints for all direct relations
- composite unique constraints on relation tables where duplicates are invalid

Examples:

- unique `(article_id, topic_id)`
- unique `(article_id, tag_id)`
- unique `(staff_account_id, role_id)`
- unique `(role_id, permission_id)`

## 16. Open Modeling Decisions

These can stay open until implementation starts:

- whether article and topic bodies use HTML, Markdown, or editor JSON
- whether city pages need dedicated editor-only modules beyond rich text
- whether applications and event registrations should share a generic submission base table
- whether audit logs should capture full before and after payloads for every mutation

## 17. Recommended Next Use

This document should directly drive:

- Drizzle schema design
- API DTO definitions
- permission checks by resource
- admin form design
