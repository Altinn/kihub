# Feature Specification: Phase 3 — Governance

**Feature Branch**: `feat/new-architecture` (Phase 3 work; no dedicated branch)

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Phase 3 — Governance for KI Hub: layer enterprise governance on top of the Phase 2 catalog. Introduce governance metadata as a CatalogEntry collection separate from the technical Artifact record (keyed by the same stable artifact ID), capturing business & technical owners, risk level, review status, approval state, recommended/featured flags, internal notes, and a KI-Hub-managed lifecycle state (Draft, Experimental, In Review, Approved, Recommended, Deprecated, Archived). Add role-based access — Reader, Contributor, Reviewer, Approver, Admin — mapped from identity groups, gating governance actions. Add structured typed reviews (security, privacy/GDPR, technical, accessibility, responsible AI, operational), each with reviewer, status, decision, comments, required changes, risk level, and expiry. Governance actions (submit for review, record a review decision, approve/reject, lifecycle transitions) MUST be role-gated and auditable. Surface governance state on the catalog listing and detail (lifecycle badge, approved/recommended). Builds on Phase 1 (auth/roles) and Phase 2 (catalog + Artifact record). No automated discovery triggers (Phase 4) and no semantic search (Phase 5)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Role-based access to governance actions (Priority: P1)

Every authenticated employee has a role — Reader, Contributor, Reviewer, Approver, or Admin — determined from their identity group membership. The role determines what governance actions they may perform: a Reader can only view; a Contributor can create/edit governance metadata and submit artifacts for review; a Reviewer can record review decisions; an Approver can approve/reject and set approved/recommended lifecycle states; an Admin can do everything, including archiving and managing roles. Any attempt to perform an action above one's role is refused.

**Why this priority**: Every other governance capability is gated by roles. Without a trustworthy role model, review and approval actions can't be safely exposed. This slice is independently verifiable (each role can/can't reach each action) and unlocks the rest.

**Independent Test**: Sign in as each role and confirm the allowed governance actions are available and the disallowed ones are refused (both in the UI and if invoked directly).

**Acceptance Scenarios**:

1. **Given** a user whose identity groups map to Reader, **When** they view the catalog, **Then** they can browse and view but no governance action (submit, review, approve, transition, assign role) is available or permitted.
2. **Given** a Contributor, **When** they act, **Then** they may edit governance metadata and submit an artifact for review, but may not record review decisions or approve.
3. **Given** a Reviewer, **When** they act, **Then** they may record review decisions but may not give final approval or archive.
4. **Given** an Approver, **When** they act, **Then** they may approve/reject and set Approved/Recommended, in addition to reviewer capabilities.
5. **Given** an Admin, **When** they act, **Then** all governance actions are permitted, including archiving and assigning roles.
6. **Given** any user, **When** an action above their role is attempted directly (not just hidden in the UI), **Then** it is refused (defense in depth).

---

### User Story 2 - Governance metadata & KI-Hub-managed lifecycle (Priority: P2)

Each catalogued artifact has a governance record (separate from its technical metadata, keyed by the same stable artifact ID) holding business owner, technical owner, risk level, review status, approval state, recommended/featured flags, internal notes, and a KI-Hub-managed lifecycle state (Draft, Experimental, In Review, Approved, Recommended, Deprecated, Archived). Authorized users edit this metadata and move the artifact through valid lifecycle transitions; the current lifecycle and approved/recommended status are surfaced on the catalog listing and detail. Every change is attributed and auditable.

**Why this priority**: The governance record is the home for the enterprise context that differentiates KI Hub. It depends on roles (US1) and gives immediate value — owners, risk, and a managed lifecycle visible in the catalog — even before the full review workflow. It cleanly separates governance metadata from the Phase 2 technical record.

**Independent Test**: As an authorized user, set owners/risk/flags and perform a valid lifecycle transition; confirm the change persists, is attributed to the actor, is rejected if invalid or above the actor's role, and that the catalog listing/detail reflect the new lifecycle and recommended/approved state.

**Acceptance Scenarios**:

1. **Given** an indexed artifact, **When** its governance record is first needed, **Then** a governance record exists (or is created) keyed by the same artifact ID, defaulting lifecycle from the artifact's manifest status where available.
2. **Given** an authorized user, **When** they set business/technical owner, risk level, recommended/featured, or internal notes, **Then** the values persist and the change is attributed to them with a timestamp.
3. **Given** an artifact in a given lifecycle state, **When** an authorized user requests a valid transition (e.g., Experimental → In Review, In Review → Approved, Approved → Recommended, any → Deprecated/Archived by permitted roles), **Then** the state changes and the transition is recorded in an audit trail.
4. **Given** a lifecycle transition that is invalid or above the actor's role, **When** attempted, **Then** it is refused with a clear reason and no change is recorded.
5. **Given** governance state on an artifact, **When** it appears in the catalog listing and detail, **Then** its lifecycle state and approved/recommended status are displayed.
6. **Given** a re-index of the technical record (Phase 2), **When** indexing runs, **Then** governance metadata is preserved (governance state is not overwritten by technical re-indexing) and remains linked by artifact ID.

---

### User Story 3 - Structured typed reviews & approval workflow (Priority: P3)

Artifacts move through a review workflow: a Contributor submits an artifact for review; Reviewers record typed reviews — security, privacy/GDPR, technical, accessibility, responsible AI, operational — each capturing reviewer, status, decision (approved / changes requested / rejected), comments, required changes, risk level, and an expiry date; an Approver records the final approve/reject decision, which drives the approval state and permits the Approved/Recommended lifecycle. All review activity is auditable, and expired reviews are surfaced as needing renewal.

**Why this priority**: Structured reviews are the deepest governance capability and depend on both roles (US1) and the governance record (US2). They deliver the full "reviewed and approved for internal use" value, but the catalog is already governable (owners, lifecycle, risk) after US2, so reviews are the final slice.

**Independent Test**: Submit an artifact for review, record one or more typed review decisions as a Reviewer, then approve as an Approver; confirm each review's fields persist, the approval state and lifecycle update, everything is attributed and auditable, and an expired review is flagged.

**Acceptance Scenarios**:

1. **Given** an artifact, **When** a Contributor submits it for review, **Then** its review status reflects "in review" and the submission is recorded.
2. **Given** an artifact in review, **When** a Reviewer records a typed review with decision, comments, required changes, risk level, and expiry, **Then** the review is saved, attributed to the reviewer with a date, and visible in the artifact's review history.
3. **Given** the recorded reviews, **When** an Approver approves, **Then** the approval state becomes approved and the Approved (or Recommended) lifecycle becomes permitted; when they reject, the artifact does not become approved and the reason is recorded.
4. **Given** a review with an expiry date in the past, **When** the artifact is viewed, **Then** that review is flagged as expired / needing renewal.
5. **Given** any review or approval action, **When** it is performed, **Then** it is attributed to the actor with a timestamp and appears in an auditable history.
6. **Given** a user without the Reviewer/Approver role, **When** they attempt to record a review or approve, **Then** the action is refused.

---

### Edge Cases

- **No governance record yet**: Viewing an artifact that has never been governed shows a sensible default (e.g., lifecycle from manifest or "Draft", no reviews) rather than an error.
- **Re-indexing preserves governance**: Phase 2 re-indexing updates technical metadata only and never clobbers governance state; a deactivated (removed-from-repo) artifact retains its governance history.
- **Invalid lifecycle transition**: Skipping required states or transitioning without the required role is refused with a clear reason.
- **Approval without required reviews**: Approving when required review types are missing or rejected is either prevented or clearly flagged (per configured policy).
- **Expired review**: An approved artifact whose review has expired is surfaced as needing renewal.
- **Role change mid-flow**: If a user's role changes, their permitted actions change accordingly on the next action.
- **Conflicting concurrent edits**: Two users editing the same governance record do not silently lose each other's changes.
- **Artifact removed from repo but governed**: Governance history is retained even when the technical record is deactivated.

## Requirements *(mandatory)*

### Functional Requirements

#### Roles & access (User Story 1)

- **FR-001**: The system MUST support five roles — Reader, Contributor, Reviewer, Approver, Admin — and assign each authenticated user a role derived from their identity group membership.
- **FR-002**: The system MUST gate every governance action by role, with (at least) this mapping: Reader = view only; Contributor = edit governance metadata + submit for review; Reviewer = record review decisions; Approver = approve/reject + set Approved/Recommended; Admin = all actions incl. archive and role management.
- **FR-003**: The system MUST enforce role checks server-side (not only by hiding UI), refusing any action above the actor's role.
- **FR-004**: An Admin MUST be able to view and manage the role assigned to a user (within KI Hub), and role changes MUST take effect for subsequent actions.

#### Governance record & lifecycle (User Story 2)

- **FR-005**: The system MUST maintain a governance record per artifact, separate from the technical Artifact record but keyed by the same stable artifact ID.
- **FR-006**: The governance record MUST capture: business owner, technical owner, risk level, review status, approval state, recommended flag, featured flag, internal notes, and a KI-Hub-managed lifecycle state.
- **FR-007**: The lifecycle state MUST be one of: Draft, Experimental, In Review, Approved, Recommended, Deprecated, Archived; and the system MUST define which transitions are valid and which role may perform each.
- **FR-008**: The system MUST reject invalid lifecycle transitions and transitions attempted above the actor's role, with a clear reason and no state change.
- **FR-009**: The KI-Hub-managed lifecycle state MUST be authoritative for governance/display; it MAY be seeded from the artifact manifest's lifecycle status when a governance record is first created.
- **FR-010**: Re-indexing the technical record (Phase 2) MUST NOT overwrite governance metadata; governance state persists and stays linked by artifact ID, including for artifacts later deactivated in the repo.
- **FR-011**: The catalog listing and detail MUST display each artifact's lifecycle state and approved/recommended status.
- **FR-012**: Every change to a governance record MUST be attributed to the acting user with a timestamp.

#### Reviews & approval (User Story 3)

- **FR-013**: A Contributor MUST be able to submit an artifact for review, moving it into an "in review" status.
- **FR-014**: The system MUST support typed reviews of these types: security, privacy/GDPR, technical, accessibility, responsible AI, operational.
- **FR-015**: Each review MUST capture: reviewer, status, decision (approved / changes requested / rejected), comments, required changes, risk level, review date, and expiry date.
- **FR-016**: A Reviewer MUST be able to record a typed review; an Approver MUST be able to record a final approve/reject decision that drives the approval state.
- **FR-017**: Approval MUST permit the Approved/Recommended lifecycle states; rejection MUST prevent approval and record the reason.
- **FR-018**: The system MUST flag reviews whose expiry date has passed as expired / needing renewal.
- **FR-019**: All review and approval actions MUST be attributed to the actor with a timestamp and recorded in an auditable history.
- **FR-020**: The system MUST refuse review/approval actions by users lacking the required role.

#### Cross-cutting

- **FR-021**: All governance user interface MUST be built with the mandated design system (constitution).
- **FR-022**: This phase MUST NOT include automated discovery triggers (Phase 4) or semantic search (Phase 5); it builds on the Phase 1 auth and Phase 2 catalog.

### Key Entities *(include if feature involves data)*

- **Role**: One of Reader, Contributor, Reviewer, Approver, Admin, assigned to a user (derived from identity groups; Admin-manageable within KI Hub). Determines permitted governance actions.
- **CatalogEntry (governance record)**: The enterprise governance metadata for one artifact, keyed by the same stable artifact ID as the technical Artifact record. Attributes: businessOwner, technicalOwner, riskLevel, reviewStatus, approvalState, lifecycleState (KI-Hub-managed), recommended, featured, internalNotes, plus attribution (updatedBy, updatedAt). Distinct collection from the technical Artifact (Git owns the artifact; Payload owns the enterprise context).
- **Review**: A typed assessment of an artifact. Attributes: artifactId, type (security/gdpr/technical/accessibility/responsible-ai/operational), reviewer, status, decision, comments, requiredChanges, riskLevel, reviewDate, expiryDate.
- **Audit entry**: An attributed record of a governance action (actor, action, target artifact, timestamp, details) forming the auditable history for lifecycle transitions, reviews, and approvals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For each of the five roles, 100% of governance actions are correctly permitted or refused according to the role mapping, verified across all action×role combinations.
- **SC-002**: 100% of attempts to perform a governance action above one's role are refused server-side, even when invoked directly (not via the UI).
- **SC-003**: A governance record exists and stays linked by artifact ID for 100% of catalogued artifacts, and re-indexing preserves governance state in 100% of runs (zero governance fields lost).
- **SC-004**: 100% of invalid or unauthorized lifecycle transitions are rejected with a reason and no state change.
- **SC-005**: The catalog listing and detail display the correct lifecycle state and approved/recommended status for 100% of artifacts.
- **SC-006**: Every governance action (metadata edit, transition, review, approval) is attributed to an actor with a timestamp and appears in the auditable history in 100% of cases.
- **SC-007**: A full review-to-approval flow (submit → typed reviews → approve) can be completed, and the resulting approval state + lifecycle are correct, for a representative artifact.
- **SC-008**: 100% of reviews past their expiry date are flagged as expired when the artifact is viewed.

## Assumptions

- **Builds on Phases 1–2**: Reuses Phase 1 authentication and the `role` on the user record, and the Phase 2 `Artifact` technical record + catalog UI. The Phase 1 baseline (all employees = Reader) is extended to the full five-role model here.
- **Role source**: Roles derive from identity (Entra) group membership when using real sign-in; for local mock sign-in, personas carry a role (and/or an Admin can assign roles in-app) so the model is testable without a live tenant. Exact mechanism is a clarification candidate.
- **Data ownership**: Governance metadata lives in its own collection (CatalogEntry), separate from the technical Artifact record, honoring "Git owns the artifact, Payload owns the enterprise context." No artifact content is stored.
- **Lifecycle authority**: The KI-Hub-managed lifecycle state is authoritative for governance/display; the manifest's lifecycle status seeds the initial value only.
- **Approval policy**: By default, approval is an Approver action informed by (but not hard-blocked on) the set of typed reviews; whether specific review types are mandatory before approval is configurable and defaults to advisory. (Clarification candidate.)
- **Auditability**: A change history captures actor, action, target, and timestamp for governance actions; full immutable audit logging/retention beyond this is out of scope for the phase.
- **Scope**: No automated discovery/scanning (Phase 4) and no semantic search (Phase 5). Governance actions are performed by authenticated employees in-app (and, where noted, via role-gated operations), not by external automation.
