# Feature Specification: Phase 6 — Editor Back-Office

**Feature Branch**: `feat/new-architecture` (Phase 6 work; no dedicated branch)

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Phase 6 — Editor back-office (mount the Payload CMS admin). Realise Constitution Principle VIII by standing up the second surface: the Payload admin back-office where a small set of editors and admins sign in to author and administer platform content, using Payload's own admin UI (exempt from the Designsystemet requirement). The Payload admin is currently NOT mounted (headless) — this phase mounts it, on a path that does not collide with the employee-facing app routes `/admin/roles` and `/admin/discovery` (e.g. `/cms`). Access reuses the existing Entra sign-in + five-role model, enforced server-side through Payload access control; Readers have no back-office access. The back-office exposes the existing collections for administration and is where AI-tool governance/review actions and future News/Events authoring happen. The employee app is unchanged. Content boundary preserved (no AI-artifact bodies). No new datastore. Start-simple: the simplest correct mount, deferring per-collection admin polish and the News/Events collections to later phases."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administer platform data in the back-office (Priority: P1)

An editor or admin opens the back-office, signs in with their work account, and manages the
platform's data through a proper admin interface: they can view the existing records (users,
catalog artifacts and their governance records, reviews, audit log, discovery sources and runs) and
create/update the ones their role permits — the editorial and administrative home that the
employee-facing app was never meant to be.

**Why this priority**: This is the whole point of the phase and the second surface the constitution
(Principle VIII) now requires. Until the back-office exists, there is nowhere for editors/admins to
author or administer platform content except ad-hoc database access. Standing it up — reachable,
signed-in, and showing the existing collections — is independently verifiable and unlocks every
later editorial capability (governance actions, News, Events).

**Independent Test**: As an authorized editor/admin, open the back-office URL, sign in, and confirm
the existing collections are listed and that a permitted record can be opened and edited (and saved)
through the admin UI.

**Acceptance Scenarios**:

1. **Given** an authorized editor/admin, **When** they open the back-office URL, **Then** they reach the admin interface (after sign-in) and see the platform's existing collections.
2. **Given** an authorized editor/admin in the back-office, **When** they open a record they are permitted to change and edit a field, **Then** the change is saved and reflected in the platform data.
3. **Given** an authorized editor/admin, **When** they view a collection, **Then** they see the existing records for it (e.g. the indexed artifacts and their governance records) without any separate data migration.

---

### User Story 2 - Access is role-gated and safe (Priority: P2)

Access to the back-office and the actions within it are restricted by role and enforced on the
server, not just hidden in the interface. Reader-level employees and unauthenticated visitors cannot
reach the back-office at all, and within it each role can only perform the actions its permissions
already allow across the platform.

**Why this priority**: The back-office is a powerful surface; letting the wrong person in — or
letting the interface be bypassed — would undermine the entire governance and content model. Reusing
the existing five-role model and enforcing it server-side is what makes the new surface safe. It
depends on the surface existing (US1) and is independently testable by attempting access as each
role.

**Independent Test**: Attempt to reach the back-office (and to mutate data) as an unauthenticated
visitor and as a Reader — both refused; then as an editor/admin role — allowed only for the actions
that role permits; confirm refusals hold even when the UI control is bypassed (server-side).

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor, **When** they request the back-office, **Then** they are sent to sign-in and cannot access it.
2. **Given** a Reader-level employee, **When** they attempt to open the back-office, **Then** access is refused (no editorial/admin capability).
3. **Given** a user with an editor/admin role, **When** they act in the back-office, **Then** they can perform only the actions their role permits, matching the platform's existing role rules.
4. **Given** any role, **When** a create/update/delete is attempted that the role is not permitted to do, **Then** it is refused server-side even if the interface control were bypassed.

---

### User Story 3 - Two surfaces coexist cleanly (Priority: P3)

The new back-office and the existing employee-facing app run as two surfaces of one platform without
interfering with each other: the branded employee app — its catalog, search, artifact detail, and
its existing `/admin/roles` and `/admin/discovery` pages — keeps working exactly as before, the two
surfaces share one sign-in/session and one role model, and the back-office lives at its own path with
no route collision.

**Why this priority**: The back-office must be additive. A path collision or a shared-session
regression would break the employee experience that Phases 1-5 delivered. This is the integration
guarantee; it depends on US1/US2 and is verifiable by exercising both surfaces in one session.

**Independent Test**: With the back-office mounted, confirm the employee app's catalog/search/detail
and its `/admin/roles` + `/admin/discovery` pages all still load and function; sign in once and
confirm the session/role is recognized on both surfaces; confirm the back-office path does not shadow
or conflict with any employee-app route.

**Acceptance Scenarios**:

1. **Given** the back-office is mounted, **When** an employee uses the app (catalog, search, artifact detail), **Then** it behaves exactly as before with no regression.
2. **Given** the existing `/admin/roles` and `/admin/discovery` employee-app pages, **When** they are opened, **Then** they still work and are not shadowed by the back-office path.
3. **Given** a single signed-in session, **When** the user moves between the employee app and the back-office, **Then** the same identity and role apply on both (one auth model).

---

### Edge Cases

- **Unauthenticated deep link**: Requesting a specific back-office record URL while signed out redirects to sign-in, then (if authorized) to the requested location — never exposes data to an unauthenticated request.
- **Reader who guesses the URL**: A Reader navigating directly to the back-office path is refused, not shown a partial interface.
- **Role changed mid-session**: If a user's role is changed, the back-office reflects the new permissions on the next authorization check (no stale elevated access).
- **AI-artifact content boundary**: The back-office manages artifact *metadata* and governance records; it MUST NOT become a place to paste/store an artifact's executable body (Principle I).
- **Path collision**: The back-office base path must not shadow any current or obvious near-future employee-app route (`/`, `/artifacts/*`, `/admin/roles`, `/admin/discovery`, `/signin`).
- **Simultaneous edits**: Two editors editing the same record are handled by the admin's normal save behavior (last-write or conflict handling as the admin provides) without data corruption.

## Requirements *(mandatory)*

### Functional Requirements

#### Mount & administer (User Story 1)

- **FR-001**: The system MUST provide a Payload-based editor back-office surface, reachable at a stable URL, where authorized users administer the platform's existing data.
- **FR-002**: The back-office MUST expose the platform's existing collections (users, catalog artifacts, governance records, reviews, audit log, discovery sources, discovery runs) for viewing and, per role, editing — using the existing data with no migration.
- **FR-003**: An authorized user MUST be able to sign in to the back-office with the same work-account sign-in used by the rest of the platform.
- **FR-004**: Creating or updating a record in the back-office MUST persist to the same platform data the employee-facing app reads (one data layer, no second copy).

#### Role-gated & safe (User Story 2)

- **FR-005**: Access to the back-office MUST be restricted to editor/admin-capable roles; Reader-level employees and unauthenticated visitors MUST be refused entry.
- **FR-006**: Within the back-office, each role MUST be able to perform only the actions its permissions allow, matching the platform's existing five-role model (Reader, Contributor, Reviewer, Approver, Admin).
- **FR-007**: All access and action gating MUST be enforced server-side (not only by hiding interface controls), so a bypassed control still cannot perform an unpermitted action.
- **FR-008**: Actions taken in the back-office MUST be attributed to the acting user, consistent with the platform's existing attribution/audit expectations for governance actions.

#### Coexistence & boundaries (User Story 3 + cross-cutting)

- **FR-009**: The back-office MUST live at a base path that does NOT collide with existing employee-facing app routes (at least `/`, `/artifacts/*`, `/admin/roles`, `/admin/discovery`, `/signin`), and MUST NOT shadow or break any of them.
- **FR-010**: The employee-facing app (catalog, search, artifact detail, `/admin/roles`, `/admin/discovery`) MUST continue to function unchanged, with the back-office and the app sharing one sign-in/session and one role model.
- **FR-011**: The back-office is the vendor admin interface and is EXEMPT from the Designsystemet requirement (Constitution Principle VIII); it is not required to be built with the employee-app design system.
- **FR-012**: The back-office MUST NOT become a store of AI-artifact executable bodies (Principle I); it manages enterprise metadata, governance records, and native platform content only.
- **FR-013**: This phase MUST NOT introduce a new datastore or external service, and MUST build on Phases 1-5 without changing the employee-facing app's behavior.
- **FR-014**: This phase MUST NOT add the News or Events collections, nor per-collection admin customization (custom views, field grouping) — those are deferred to later phases; this phase delivers the mounted, role-gated back-office over the existing collections.

### Key Entities *(include if feature involves data)*

- **Editor back-office (surface)**: The second surface of the one platform — a Payload-based admin interface at its own base path, sharing the platform's auth, role model, and data layer. Not a new datastore; a new *view/authoring surface* over existing collections.
- **Existing collections (reused, unchanged)**: users, catalog artifacts (technical metadata), governance records, reviews, audit log, discovery sources, discovery runs — exposed for administration. Their shapes and access rules are those established in Phases 1-4; this phase surfaces them, it does not redefine them.
- **Role (reused)**: The five-role model (Reader, Contributor, Reviewer, Approver, Admin) already mapped from work-account groups — now also governs back-office entry and per-collection actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized editor/admin can reach the back-office, open a permitted record, and save an edit that is reflected in the platform data — in 100% of attempts.
- **SC-002**: 100% of attempts by unauthenticated visitors or Reader-level employees to enter the back-office or mutate data are refused (server-side).
- **SC-003**: After the back-office is mounted, every existing employee-app route (catalog, search, artifact detail, `/admin/roles`, `/admin/discovery`, sign-in) continues to work with zero regressions or path collisions.
- **SC-004**: A single sign-in is recognized on both surfaces (one session/role) in 100% of cases.
- **SC-005**: Inspection confirms zero AI-artifact executable bodies are stored via the back-office — only metadata, governance records, and native content.
- **SC-006**: The feature runs entirely on the existing infrastructure — no new datastore or external service is deployed (verifiable by inspection).

## Assumptions

- **Builds on Phases 1-5**: Reuses Phase 1 auth (Entra + mock mode) and the five-role model, the Phase 2 catalog collection, the Phase 3 governance collections and role rules, and the Phase 4 discovery collections. The back-office is a new surface over these, not a new data model.
- **Realises Principle VIII**: This is the "editor back-office" surface the amended constitution (v2.0.0) mandates; the employee-facing app remains the branded read/browse surface. The back-office is exempt from the Designsystemet requirement.
- **Base path**: The back-office is assumed to live at `/cms` (a path with no collision against `/admin/roles`, `/admin/discovery`, or other employee-app routes). The exact path is a detail confirmable in clarification/planning; the requirement is only "no collision".
- **Who gets in**: Editor/admin-capable roles (assumed Contributor and above — Contributor, Reviewer, Approver, Admin) may enter the back-office, each scoped to their existing permissions; Reader (baseline employee) may not. The precise minimum role for entry is confirmable in clarification.
- **Governance actions relocate here over time**: The back-office is where AI-tool governance/review actions are intended to live going forward (the role model already maps to admin access); reconciling or retiring the Phase 3 custom governance UI in the employee app is a follow-up, not part of this mount.
- **Content boundary preserved**: Per Principles I & II, the back-office manages enterprise metadata, governance records, and (later) native content — never AI-artifact bodies.
- **Scope kept minimal**: This phase delivers the mounted, role-gated admin over existing collections. New collections (News, Events) and admin polish (custom views, dashboards, field grouping, branding) are explicitly out of scope and deferred to their own phases.
