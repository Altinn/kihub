# Phase 3 Data Model

Three new Payload collections — `catalog-entries` (governance record), `reviews` (typed reviews),
`audit-log` (append-only audit trail). `Users` gains an access-control change (no field change);
`Artifact` (Phase 2) is untouched (Principle II boundary — technical vs enterprise metadata).

## `Users` collection (changed: access only)

No new fields — `role` (`reader|contributor|reviewer|approver|admin`) already exists (Phase 1).

- **Access change**: `update` access restricted so a user may only update their own non-`role`
  fields; only `admin` may change any user's `role` (FR-004). `create`/`delete` remain
  server-side-only (auth upsert path), unchanged from Phase 1.

## `catalog-entries` collection (governance record)

Keyed by a relationship to `artifacts` (one entry per artifact — research.md §7). Created lazily
(research.md §6); a missing entry is treated as sensible defaults by app code, not an error.

| Field | Type | Rules / source |
|-------|------|----------------|
| `artifact` | relationship → `artifacts` | Required, unique (one governance record per artifact). Principle IV key. |
| `businessOwner` | text | Free text (name/team); optional. |
| `technicalOwner` | text | Free text (name/team); optional. |
| `riskLevel` | select | `low \| medium \| high`. |
| `reviewStatus` | select | `not-submitted \| in-review`. Set to `in-review` on submit-for-review (FR-013). Intentionally has no terminal value — it stays `in-review` after an approval/rejection decision, since `approvalState` (not `reviewStatus`) is the authoritative decision field. Reviews (below) carry their own per-type status. |
| `approvalState` | select | `not-approved \| approved \| rejected`. Set only by an Approver decision (FR-016/FR-017). |
| `lifecycleState` | select | `draft \| experimental \| in-review \| approved \| recommended \| deprecated \| archived`. KI-Hub-managed and authoritative (FR-009). Defaults from the Artifact's manifest `lifecycleStatus` when the entry is first created, else `draft`. |
| `recommended` | checkbox | Default `false`. Settable by Approver/Admin only (implied by lifecycle gate — `recommended` only meaningful once `lifecycleState = recommended`). |
| `featured` | checkbox | Default `false`. Contributor+ may toggle (curation flag, independent of lifecycle). |
| `internalNotes` | textarea | Free text, any Contributor+. |
| `updatedBy` | relationship → `users` | Set automatically (hook) to `req.user` on every write. |
| `updatedAt` | date | Payload's built-in timestamp (auto). |

**Lifecycle transition matrix** (research.md §3; enforced in a `beforeChange` hook via
`@kihub/governance-core`):

| From | To | Allowed roles |
|------|----|----|
| Draft | Experimental | Contributor+ |
| Experimental | In Review | Contributor+ (the "submit for review" action, FR-013) |
| In Review | Approved | Approver+ |
| Approved | Recommended | Approver+ |
| any state | Deprecated | Approver, Admin |
| any state | Archived | Approver, Admin |
| anything else | — | Rejected: "invalid transition" or "role not permitted" (FR-008) |

**Access**: `read` = any authenticated employee (governance state is visible catalog-wide, FR-011).
`create`/`update` = Contributor+ for non-lifecycle fields; lifecycle-state changes additionally
gated by the transition matrix above (role + valid-from-state, checked in the hook, not only in
`access`, for defense in depth per FR-003). `delete` = false (governance history is retained even
for a deactivated artifact — edge case "artifact removed from repo but governed").

## `reviews` collection (typed reviews)

| Field | Type | Rules / source |
|-------|------|----------------|
| `artifact` | relationship → `artifacts` | Required. Many reviews per artifact (one per submission/type/cycle). |
| `type` | select | `security \| privacy-gdpr \| technical \| accessibility \| responsible-ai \| operational` (FR-014). |
| `reviewer` | relationship → `users` | Set automatically to `req.user` on create. |
| `status` | select | `pending \| completed`. |
| `decision` | select | `approved \| changes-requested \| rejected`. Required when `status = completed`. |
| `comments` | textarea | Optional free text. |
| `requiredChanges` | textarea | Optional; populated when `decision = changes-requested`. |
| `riskLevel` | select | `low \| medium \| high` — the reviewer's own risk assessment for this review (distinct from the entry-level `riskLevel`, which is the governance owner's overall call). |
| `reviewDate` | date | Set automatically on create/completion. |
| `expiryDate` | date | Required; reviewer-set. Past `expiryDate` ⇒ UI flags the review as expired (FR-018, computed at read time — not a stored boolean). |

**Access**: `read` = any authenticated employee (visible in the artifact's review history, FR-016).
`create`/`update` = Reviewer+ (a Reviewer records their own review; an Approver/Admin may also
record one). `delete` = false (immutable history).

## `audit-log` collection (append-only)

| Field | Type | Rules / source |
|-------|------|----------------|
| `actor` | relationship → `users` | Who performed the action. |
| `action` | select | `metadata-edit \| lifecycle-transition \| review-recorded \| approval-decision \| role-change`. |
| `artifact` | relationship → `artifacts` | The governed artifact (optional for `role-change`, which targets a user instead). |
| `targetUser` | relationship → `users` | Set only for `role-change` actions. |
| `details` | json | Small structured payload: changed field(s) + before/after values, or the review/approval decision. |
| `createdAt` | date | Payload's built-in timestamp (auto) — the attributed moment (FR-012/FR-019). |

**Access**: `read` = any authenticated employee (auditable history is visible, not admin-only, per
FR-019 "appears in an auditable history"). `create` = server-side only, written exclusively by
`afterChange` hooks on `catalog-entries`/`reviews`/`users` (role changes) using `overrideAccess` —
no direct client write path. `update`/`delete` = false (immutable).

## Derived values (not stored)

- **Review expiry flag**: `expired = review.expiryDate < now`, computed when rendering (FR-018) —
  not persisted, so it's always correct without a background job.
- **Governance defaults for an ungoverned artifact**: `{ lifecycleState: artifact.lifecycleStatus ?? 'draft', reviewStatus: 'not-submitted', approvalState: 'not-approved', recommended: false, featured: false, reviews: [] }` — returned by `getGovernance()` (research.md §6) without persisting a row.

## Rebuildability / boundary check (Principle I & II, FR-010)

Re-running the Phase 2 indexer only creates/updates/deactivates `artifacts` docs; it never reads or
writes `catalog-entries`, `reviews`, or `audit-log`. This is structural (the indexer package,
`@kihub/discovery-core`, has no dependency on the new collections), not just a convention — so
FR-010 holds by construction, verified by an integration test that re-indexes and asserts an
existing `catalog-entries` doc is unchanged.
