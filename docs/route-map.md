# TGO Network Route Map

## 1. Purpose

This document defines the initial page and route structure for:

- the public site
- the staff admin console

It also clarifies:

- which routes belong to which application
- which routes are part of MVP
- which routes prefer static rendering versus dynamic data

## 2. Route Design Principles

- Public-facing routes belong to `apps/site`
- Staff-facing routes belong to `apps/admin`
- Business data should come from the API layer, not local frontend-only state
- Public pages should be static-first where feasible
- Admin pages should optimize for workflow speed, not static generation

## 3. Public Site Routes

| Route | Purpose | Rendering | Data source | Phase |
| --- | --- | --- | --- | --- |
| `/` | Homepage with brand, featured topics, events, and calls to action | Static-first with selected dynamic blocks if needed | Public site config, featured blocks, published topics, events | 2 |
| `/topics` | Topic listing page | Static or server-rendered | Published topics | 2 |
| `/topics/[slug]` | Topic detail page with related content | Static-first | Topic detail, related articles, related events | 2 |
| `/articles` | Article or blog listing page | Static-first | Published articles | 2 |
| `/articles/[slug]` | Article detail page | Static-first | Published article detail, related topics | 2 |
| `/events` | Event listing page | Static-first | Published events | 2 |
| `/events/[slug]` | Event detail page with agenda, registration state, and inline registration form when open | Static-first | Event detail, sessions, registration state, public registration submission | 2 |
| `/cities` | City listing page | Static-first | Published city summaries | 2 |
| `/cities/[slug]` | City detail page | Static-first | City content, related topics, related events, related articles | 2 |
| `/apply` | Trial, join, or contact application page | Server-capable public form page | Public site config, application submission endpoint | 2 |
| `/about` | Brand or organization intro page | Static | Managed content or static page data | 2 |
| `/privacy` | Privacy policy | Static | Managed or repo-backed content | 2 |
| `/terms` | Terms of service | Static | Managed or repo-backed content | 2 |

## 4. Public Site Route Notes

### Homepage

Recommended homepage blocks:

- hero
- featured topics
- featured articles
- featured events
- city network highlights
- application call to action

### Topic Pages

Each topic detail page should support:

- descriptive intro content
- cover image
- related articles
- related events
- SEO metadata

### Article Pages

Each article detail page should support:

- author information
- topic tags
- cover image
- rich content body
- recommended related content later

### Event Pages

Each event detail page should support:

- summary and body content
- event time and venue
- city association
- speaker or agenda sections
- registration or contact call to action
- inline public registration form for `open` and `waitlist` states
- external registration fallback when `registrationUrl` is configured

### City Pages

Each city page should act as a curated landing page for a city chapter or local presence.

Recommended elements:

- city intro
- featured events
- featured articles
- city-specific highlights

## 5. Admin Console Routes

| Route | Purpose | Protection | Primary API group | Phase |
| --- | --- | --- | --- | --- |
| `/login` | Staff login page | Public | Auth | 1 |
| `/` | Root route redirect | Protected | Admin | 1 |
| `/dashboard` | Basic operations overview | Protected | Admin | 3 |
| `/articles` | Article list and filters | Protected | Admin | 3 |
| `/articles/new` | Create article | Protected | Admin | 3 |
| `/articles/:id/edit` | Edit article | Protected | Admin | 3 |
| `/topics` | Topic list | Protected | Admin | 3 |
| `/topics/new` | Create topic | Protected | Admin | 3 |
| `/topics/:id/edit` | Edit topic | Protected | Admin | 3 |
| `/events` | Event list and filters | Protected | Admin | 3 |
| `/events/new` | Create event | Protected | Admin | 3 |
| `/events/:id/edit` | Edit event | Protected | Admin | 3 |
| `/events/:id/registrations` | Event-specific registration queue | Protected | Admin | 3 |
| `/registrations/:id` | Registration detail and review decision | Protected | Admin | 3 |
| `/applications` | Application review queue | Protected | Admin | 3 |
| `/applications/:id` | Application detail and notes | Protected | Admin | 3 |
| `/assets` | Media library | Protected | Admin | 3 |
| `/featured-blocks` | Homepage and featured content configuration | Protected | Admin | 3 |
| `/settings/site` | Basic site settings | Protected | Admin | 3 |
| `/staff` | Staff account management | Protected | Admin | 4 |
| `/roles` | Role and permission management | Protected | Admin | 4 |
| `/audit-logs` | Audit visibility | Protected | Admin | 4 |

## 6. Admin Route Notes

### Minimal Admin Shell

The first admin shell should provide:

- session-aware layout
- role-based navigation
- route protection
- common table and form patterns
- audit visibility for sensitive mutations when the user has the required permission

### Page Ownership

Recommended MVP ownership split:

- content editors own article and topic pages
- event operators own event pages
- event operators also own registration review for their events
- reviewers own applications
- super admins own staff, roles, and settings pages

## 7. Route Protection Rules

- Public site routes are generally open
- Admin routes require authenticated staff sessions
- Admin route visibility in the UI is helpful but not sufficient
- Real authorization must be enforced by backend permission checks

## 8. Rendering Guidance

### Static-first Public Routes

Prefer static generation for:

- topic pages
- article pages
- city pages
- legal pages

### Mixed Rendering Public Routes

Consider server rendering or rebuild triggers for:

- homepage
- event listing
- event detail pages with rapidly changing registration state

### Dynamic Admin Routes

All admin routes are dynamic application pages and should rely on API data.

## 9. Out-of-Scope Routes For MVP

These routes should not block the first implementation:

- `/search`
- `/members`
- `/profile`
- `/notifications`
- `/billing`
- `/check-in`
- `/analytics`

## 10. Recommended Next Use

This route map should directly inform:

- frontend application scaffolding
- API endpoint grouping
- data model ownership
- permission design
