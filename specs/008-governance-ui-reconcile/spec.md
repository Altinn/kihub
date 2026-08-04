# Feature Specification: Governance-UI Reconcile — Read-Only Governance in the Employee App

**Feature Branch**: `feat/new-architecture` (single-branch workflow; see `.specify/feature.json`)

**Created**: 2026-07-23

**Status**: Draft

**Input**: User description: "Governance-UI reconcile: make the employee-facing app constitution-compliant (v2.0.0 Principles VI and VIII) by converting the artifact detail page's governance view to read-only and relying on the Payload admin back-office (/cms, from Phase 6) as the only surface for governance actions. Background: Phase 3 placed governance WRITE actions (edit owners/risk/notes/featured metadata form, Submit for review, lifecycle 'Move to <state>' buttons, Approve/Reject, record-review form) on the employee artifact detail page because it was the only surface then. Constitution v2.0.0 now mandates that governance/review actions are performed primarily in the editor back-office and the employee app may surface governance state read-only only, and must not be a general-purpose admin. Scope: (1) employee artifact detail governance panel becomes display-only; (2) remove the now-dead employee-app write path; (3) no changes to collection access rules, hooks, or governance-core — the back-office capability stays exactly as-is (verify, don't rebuild). This is a small refactor/removal feature, not new functionality — no feature is lost, governance actions just live only in the back-office."

## Overview

When Phase 3 delivered governance there was only one surface, so governance **actions** — editing
owners/risk/notes/featured, submitting for review, lifecycle transitions, approve/reject, and
recording typed reviews — were placed on the employee-facing artifact detail page. Constitution
v2.0.0 then redefined the platform as a two-surface employee portal: Principle VI states that
governance and review actions are performed primarily in the editor back-office and that the
employee app MAY surface governance **state** read-only; Principle VIII states that the employee
app MUST NOT be extended into a general-purpose admin. Phase 6 gave governance actions their
proper home (the editor back-office, where catalog entries and reviews are editable by
Contributor+ users under the same server-side rules, lifecycle-transition guard, and audit
hooks). The employee app therefore now contradicts the constitution it predates.

This feature is the reconcile: the employee artifact detail page keeps showing governance
**state** (read-only, for every role), and the back-office becomes the **only** surface offering
governance **actions**. It is intentionally a removal/refactor: no server-side rule changes, no
new capability, no feature loss — the write path simply lives only where the constitution says it
belongs. Server-side enforcement is already independent of the removed UI and stays untouched.

## Clarifications

### Session 2026-07-23

- Q: Should the employee-visible read-only governance state include the internal notes and the
  featured flag? → A: **No** — both are excluded from the employee display; they remain visible
  and editable only in the editor back-office.
- Q: Delete the employee app's dead governance write path outright, or retain any of it as an
  internal API? → A: **Delete outright** — remove the form-handling actions and the write helpers
  they wrapped; the back-office writes through its own data-layer rules and does not use them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employees see governance state, and only state, on the artifact detail page (Priority: P1)

As any signed-in employee — regardless of role, including Reviewers, Approvers, and Admins — I
open an artifact's detail page and see its governance state as a read-only display: lifecycle
state, approval/review status, business and technical owner, risk level, the list of recorded
typed reviews (with decision, reviewer, expiry, and expired indicators), and the audit history.
No editing controls, buttons, or forms for governance actions appear for anyone.

**Why this priority**: This is the constitutional violation being fixed. Until the action
controls are gone, the employee app is a general-purpose admin surface in contradiction of
Principles VI and VIII. Everything else in this feature follows from this change.

**Independent Test**: Sign in as each of the five role personas in turn, open an artifact detail
page, and confirm: governance state (lifecycle, owners, risk, review/approval status, reviews
list, audit history) is displayed; no governance form fields, submit/transition/approve/reject
buttons, or review-recording controls are rendered for any role.

**Acceptance Scenarios**:

1. **Given** a signed-in employee with the lowest role (Reader), **When** they open an artifact
   detail page, **Then** they see the governance state display (lifecycle state, owners, risk
   level, review/approval status, reviews list, audit history) with no action controls.
2. **Given** a signed-in user with the highest role (Admin), **When** they open the same artifact
   detail page, **Then** they see exactly the same read-only governance display — role no longer
   changes what the employee surface offers, and no action controls are rendered.
3. **Given** an artifact that has never been governed (no governance record exists yet), **When**
   any employee opens its detail page, **Then** the read-only display renders the computed
   default state (e.g. initial lifecycle state, no owners, no reviews) without error.
4. **Given** an artifact with recorded reviews, **When** an employee views the detail page,
   **Then** each review shows its type, decision, reviewer, and expiry — including an expired
   indicator where applicable — as display only, with no review-recording form.

---

### User Story 2 - Editors perform all governance actions in the back-office (Priority: P2)

As a Contributor, Reviewer, Approver, or Admin, I perform every governance action — editing
governance metadata (owners, risk, internal notes, featured), lifecycle transitions (guarded by
the lifecycle state machine), recording typed reviews, and approval decisions — in the editor
back-office, exactly as delivered in Phase 6. Nothing about the back-office changes; this story
verifies it remains the complete, sole action surface after the employee-app removal.

**Why this priority**: The removal in Story 1 is only safe because the capability already exists
in the back-office. Verifying that no governance action is lost platform-wide is what makes this
a reconcile rather than a regression.

**Independent Test**: Sign in to the back-office as an editor persona, edit a catalog entry's
governance metadata, perform a lifecycle transition (confirming the transition guard still
rejects invalid moves), record a typed review, and record an approval decision — all succeed and
are audit-logged, with no changes made to server-side rules.

**Acceptance Scenarios**:

1. **Given** a signed-in editor with the required role, **When** they edit governance metadata
   (owners, risk, notes, featured) on a catalog entry in the back-office, **Then** the change is
   saved and the employee artifact detail page reflects the updated state read-only.
2. **Given** a signed-in editor with the required role, **When** they perform a valid lifecycle
   transition in the back-office, **Then** it succeeds, is audit-logged, and the new state
   appears on the employee artifact detail page.
3. **Given** a signed-in editor, **When** they attempt a lifecycle transition the state machine
   forbids for their role or from the current state, **Then** the back-office rejects it (the
   existing server-side guard, unchanged).
4. **Given** a signed-in user with a review-capable role, **When** they record a typed review in
   the back-office, **Then** it is saved and appears in the employee page's read-only reviews
   list.

---

### User Story 3 - The employee app carries no orphaned governance write path (Priority: P3)

As a maintainer of the platform, after the employee-facing action UI is removed I expect the
employee app to contain no unreachable governance write machinery left behind — no orphaned
server-side action endpoints or write helpers that no surface uses — so the codebase reflects
what the product actually does (simplicity principle: no speculative retention).

**Why this priority**: Code hygiene follows from Stories 1–2 but does not block them. Leaving the
dead write path in place would invite constitutional drift (an easy path to re-adding employee-app
actions) and contradicts the start-simple principle.

**Independent Test**: Inspect the employee app for the previously used governance write
entry points and confirm they are deleted; confirm automated quality gates (full test suite,
type checks, lint) pass with no governance verification weakened.

**Acceptance Scenarios**:

1. **Given** the employee-facing action UI is removed, **When** the codebase is inspected for the
   employee app's governance write entry points (the form-handling actions and the write helpers
   they wrapped), **Then** none remain reachable from any employee-facing surface.
2. **Given** the removal, **When** the full automated verification suite runs, **Then** all
   existing governance-rule verifications (role×action access matrix, review→approval flow) pass
   unchanged — they exercise the server-side rules directly, not the removed UI.

---

### Edge Cases

- **Never-governed artifact**: an artifact with no governance record must still render the
  read-only panel from computed defaults (initial lifecycle state, empty owners/reviews/audit) —
  same behavior as today, no error and no record created by viewing.
- **Highest-role visitor**: an Admin or Approver visiting the employee page gets the identical
  read-only view as a Reader — role-dependent rendering disappears from the employee governance
  panel entirely.
- **Stale links / muscle memory**: any bookmarked or in-flight employee-page governance form
  submission after deployment must fail safely (the endpoints are gone), with no partial writes;
  server-side rules were never bypassable either way.
- **Review with missing optional data**: reviews without comments, risk level, or reviewer email
  must still render in the read-only list (display "—"/omit gracefully, as today).
- **Expired review**: the expired indicator on reviews remains part of the read-only display.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The employee artifact detail page MUST present governance state as a read-only
  display for every signed-in role, comprising at minimum: lifecycle state, review status,
  approval state, business owner, technical owner, risk level, the list of recorded typed reviews
  (type, decision, reviewer, expiry date, expired indicator, comments), and the audit history.
- **FR-002**: The employee app MUST NOT render any governance action control for any role — no
  governance-metadata edit form, no submit-for-review control, no lifecycle-transition controls,
  no approve/reject controls, and no review-recording form.
- **FR-003**: The employee governance display MUST NOT vary by role, and MUST NOT include the
  internal notes or the featured flag — those are editor-facing fields that remain visible and
  editable only in the editor back-office (clarified 2026-07-23).
- **FR-004**: The employee app's now-unused governance write path (the form-handling actions and
  the write helpers they wrapped: metadata update, submit-for-review, lifecycle transition,
  review recording, approval decision) MUST be deleted outright — not retained as an internal
  API (clarified 2026-07-23, per the start-simple principle; the back-office writes through its
  own data-layer rules and does not use these helpers).
- **FR-005**: All governance actions MUST remain fully available in the editor back-office to the
  same roles as before, unchanged: governance-metadata editing, lifecycle transitions (still
  guarded by the lifecycle state machine), typed-review recording, and approval decisions, all
  audit-logged. This feature MUST NOT rebuild or alter that capability — only verify it.
- **FR-006**: Server-side enforcement MUST remain unchanged: collection access rules, the
  lifecycle-transition guard, audit hooks, and the shared role/permission and lifecycle
  state-machine model are out of scope for modification.
- **FR-007**: The read-only display MUST handle artifacts with no governance record by rendering
  computed defaults, without creating a record and without error (existing behavior, preserved).
- **FR-008**: The read-side governance data access (state lookup, reviews list, audit history)
  and the existing read-only lifecycle indicators used across the employee app (detail header
  badge, catalog card badge) MUST be preserved.

### Key Entities *(include if feature involves data)*

No data model changes. Entities involved, all pre-existing and unchanged:

- **Governance state (catalog entry)**: lifecycle state, review status, approval state, owners,
  risk level, internal notes, featured/recommended flags — displayed read-only on the employee
  surface; edited only in the back-office.
- **Typed review**: type, decision, reviewer, expiry, comments — listed read-only on the employee
  surface; recorded only in the back-office.
- **Audit entry**: actor, action, timestamp — listed read-only on the employee surface; produced
  by server-side hooks on governance writes.
- **User role**: Reader/Contributor/Reviewer/Approver/Admin — continues to gate back-office
  actions server-side; ceases to influence the employee governance panel's rendering.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Across all five role personas, the employee artifact detail page exposes zero
  governance action controls — 0 forms, 0 buttons, 0 editable fields in the governance panel.
- **SC-002**: 100% of the governance actions previously offered on the employee page (metadata
  edit, submit for review, lifecycle transition, review recording, approval decision) remain
  performable in the editor back-office by the same roles as before.
- **SC-003**: Employees retain visibility of all governance state visible to them before the
  change — lifecycle, owners, risk, review/approval status, reviews, audit history — excluding
  the internal notes and featured flag, which stay editor-back-office-only (per clarification).
- **SC-004**: The complete existing automated verification suite passes after the change, with no
  governance verification removed or weakened (the role×action access matrix and review→approval
  flow checks pass unchanged).
- **SC-005**: The change is a net removal on the employee surface: no new employee-facing
  capability, no new server-side rules, and no remaining reachable governance write entry point
  in the employee app.

## Assumptions

- **Only one employee surface renders governance actions** (verified during specification by
  code search): the artifact detail page's governance panel is the sole render site of governance
  action controls; the catalog card and detail header show only read-only lifecycle/approval
  badges, which are unaffected.
- **Server-side enforcement is already UI-independent**: role gating is enforced in the data
  layer's access rules and hooks; removing employee-facing UI cannot loosen or tighten access.
  The existing rule verifications exercise the data layer directly and therefore remain valid and
  must stay green.
- **The back-office governance capability is complete** (delivered in Phase 6): catalog-entry
  governance fields are editable there, lifecycle transitions run through the same guard, reviews
  are creatable, everything is audit-logged, and access requires Contributor+ — so removing the
  employee-app actions loses no platform capability.
- **No navigation link from the employee page to the back-office is added by default** — editors
  reach the back-office directly, and the employee surface stays read-first. Revisit only if
  editors report friction.
- **Spec-directory naming**: this feature takes the next sequential spec directory
  (008-governance-ui-reconcile). "Phase 8 = Calendar/Events" is a conceptual roadmap label, not a
  spec-directory number; Calendar will take a later sequential directory when it starts.
- **The reviews list's current employee-visible content (including reviewer email and comments)
  is acceptable to keep** — it is already shown today to all roles and no concern was raised;
  internal notes and the featured flag, by contrast, are excluded per clarification.
