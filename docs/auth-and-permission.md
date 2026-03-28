# TGO Network Auth And Permission Design

## 1. Purpose

This document defines:

- how users authenticate
- how staff gain admin access
- how authorization works across admin APIs
- how future phone login fits without changing the system shape

## 2. Design Principles

- Authentication and authorization are separate concerns
- `Better Auth` owns sessions and identity verification
- The application owns staff access and permissions
- Frontend route guards improve UX but do not replace backend checks
- Future phone login must extend the existing identity model, not replace it

## 3. Actor Types

### Public Visitor

- not authenticated
- can read public content
- can submit public applications
- can submit event registrations if the event is open

### Public Authenticated User

Not required for MVP, but supported by the long-term identity model.

Potential later capabilities:

- profile management
- saved registrations
- member-only content

### Staff User

- authenticated user with an active `staff_account`
- can access the admin console based on role permissions

### Super Admin

- highest-trust internal operator
- can manage staff, roles, permissions, and system settings

## 4. Authentication Scope

### Managed By Better Auth

Use Better Auth for:

- email and password sign-in
- password reset
- session issuance and validation
- future phone OTP login
- optional future social login

### Managed By Application Logic

Use our own application schema and middleware for:

- staff eligibility
- role assignments
- permission checks
- resource-level authorization
- audit logging for admin actions

## 5. MVP Authentication Flows

### Staff Login

Initial MVP flow:

1. super admin creates or enables a staff account
2. staff user signs in with email and password
3. Better Auth creates a session
4. backend loads the related `staff_account`
5. backend loads role and permission bindings
6. admin frontend renders only allowed navigation

### Staff Logout

- invalidate session via Better Auth
- clear session cookie
- redirect to admin login

### Password Reset

- Better Auth handles token issuance and reset flow
- admin frontend consumes the auth flow as a standard client

### Public Forms

For MVP:

- no public login is required
- applications and event registration can be submitted without account creation

## 6. Session Model

Recommended session strategy:

- cookie-based session auth
- `HttpOnly` cookies
- `Secure` enabled in production
- `SameSite=Lax` by default unless a stricter or cross-site requirement appears
- configure shared cookie domain if site and admin need shared auth state later

Recommended domains:

- `www.example.com`
- `admin.example.com`
- `api.example.com`

If cross-subdomain session sharing is needed later, use a parent cookie domain such as `.example.com`.

## 7. Staff Access Model

Authentication alone must not grant admin access.

A user may be authenticated but still be unable to access the admin if:

- no `staff_account` exists
- `staff_account.status` is not active
- required role bindings are missing

Recommended staff statuses:

- `invited`
- `active`
- `suspended`
- `disabled`

## 8. Permission Model

### Permission Format

Use simple resource-action codes:

- `article.read`
- `article.write`
- `article.publish`
- `topic.manage`
- `event.manage`
- `application.review`
- `asset.manage`
- `settings.manage`
- `staff.manage`
- `role.manage`

### Role Strategy

Use roles as bundles of permissions.

MVP system roles:

- `super_admin`
- `content_editor`
- `event_manager`
- `reviewer`
- `media_manager`

### MVP Role Matrix

| Permission | super_admin | content_editor | event_manager | reviewer | media_manager |
| --- | --- | --- | --- | --- | --- |
| `article.read` | yes | yes | no | yes | no |
| `article.write` | yes | yes | no | no | no |
| `article.publish` | yes | yes | no | no | no |
| `topic.manage` | yes | yes | no | no | no |
| `event.manage` | yes | no | yes | no | no |
| `registration.read` | yes | no | yes | no | no |
| `application.review` | yes | no | no | yes | no |
| `asset.manage` | yes | yes | yes | no | yes |
| `featured_block.manage` | yes | yes | no | no | no |
| `settings.manage` | yes | no | no | no | no |
| `audit_log.read` | yes | no | no | no | no |
| `staff.manage` | yes | no | no | no | no |
| `role.manage` | yes | no | no | no | no |

Current MVP note:

- `registration.read` currently covers the event registration queue, registration detail access, and registration status updates in the admin console
- `audit_log.read` currently gates the audit trail page and the audit log API list endpoint

## 9. Authorization Enforcement Flow

For every protected admin request:

1. validate session
2. load current user
3. load linked `staff_account`
4. ensure staff account is active
5. load effective permissions
6. check required permission for route or action
7. execute business logic
8. write audit log for important mutations

Important rule:

- the admin UI may hide unauthorized actions
- the API must still reject unauthorized requests even if the UI is bypassed

## 10. Resource-Level Authorization

For MVP, authorization can remain role-based.

Later, add resource-level constraints if needed, such as:

- editor can only modify owned drafts
- reviewer can only handle assigned applications
- event operator can only manage events in assigned cities

Do not over-design these rules before they are needed.

## 11. Invitation And Staff Provisioning

Recommended MVP approach:

- bootstrap one initial super admin manually
- let super admin invite or activate other staff users later
- store invitation metadata on `staff_accounts`

This is simpler than building a full invitation product flow on day one.

## 12. Public Identity Roadmap

Public account features are not required for MVP.

However, the model should remain compatible with:

- user profile pages later
- registration history later
- member-only content later
- phone-first login later

This is why the platform should still keep a real user table from the start.

## 13. Future Phone Login

Phone login should be implemented as an additional auth method, not a second identity system.

Rules:

- keep `user.id` stable
- attach `phone_number` to the existing user
- mark verification through `phone_verified_at`
- treat phone OTP as another sign-in method handled by Better Auth
- keep business relations linked by internal user ID

Recommended future flow:

1. user enters phone number
2. system sends OTP through a provider abstraction
3. Better Auth verifies OTP
4. existing user is found or new user is created by policy
5. session is issued

## 14. SMS Provider Strategy

Do not bind phone login logic directly to a single SMS vendor.

Recommended abstraction:

- `sendOtp(phoneNumber, code, template)`

Benefits:

- easier provider replacement
- cleaner test stubs
- no auth-layer rewrite when SMS vendor changes

## 15. Audit Requirements

At minimum, audit these staff actions:

- login events if feasible
- article publish and unpublish
- event publish and major edits
- application status changes
- staff role changes
- settings updates

## 16. Out Of Scope For MVP

- member subscriptions
- organization hierarchy
- fine-grained policy builder
- delegated admin domains
- SSO

## 17. Recommended Next Use

This document should directly drive:

- Better Auth integration
- staff middleware in Hono
- admin route guards
- role and permission seed data
