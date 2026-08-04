# Research: Governance-UI Reconcile

No open NEEDS CLARIFICATION items remain (both were resolved in the 2026-07-23 clarification
session). This document records the design decisions and the verified removal inventory.

## §1 Read-only panel design

**Decision**: Rewrite `GovernancePanel` as a role-independent, read-only server component with three
blocks: (a) a governance-state list — lifecycle state, review status, approval state, business owner,
technical owner, risk level; (b) the reviews list exactly as today (type, decision tag, reviewer
email, expiry, expired indicator via `isExpired`, comments); (c) the audit history exactly as today.
The panel takes `{ artifactId, governance }` only — the `actorRole` prop is removed. Labels reuse the
existing `STATE_LABELS` map for lifecycle, plus small literal maps for review status
(`not-submitted → "Not submitted"`, `in-review → "In review"`) and approval state
(`not-approved → "Not approved"`, `approved → "Approved"`, `rejected → "Rejected"`).

**Rationale**: FR-001 requires lifecycle/review/approval status in the read-only display; today those
appear only in the header badge or inside the editors' form, so the state block makes them explicit
for everyone. Reviews/audit blocks are already read-only — they carry over unchanged. Dropping the
role prop enforces FR-003 (display MUST NOT vary by role) structurally: there is nothing left to vary.

**Alternatives considered**: (a) Keep the role prop to show a "manage in back-office" hint to
Contributor+ — rejected: reintroduces role-dependent rendering, adds an admin affordance to the
employee surface (Principle VIII), and the spec assumption explicitly defers it. (b) Delete the panel
and rely on the header `LifecycleBadge` alone — rejected: loses owners/risk/reviews/audit visibility,
violating FR-001/SC-003 (employee state visibility is preserved, not reduced).

## §2 Deletion inventory (write path)

**Decision**: Delete outright (clarified):

| Item | Why it is dead |
|------|----------------|
| `apps/web/src/lib/governance-actions.ts` (whole file: `submitForReviewAction`, `transitionLifecycleAction`, `updateGovernanceMetadataAction`, `recordReviewAction`, `decideApprovalAction`) | Grep-verified: imported only by `GovernancePanel.tsx` and `ReviewForm.tsx`, whose action UIs are removed. |
| `apps/web/src/components/ReviewForm.tsx` | Rendered only by `GovernancePanel`'s removed `canRecordReview` branch. |
| `lib/governance.ts` → `updateGovernanceMetadata`, `submitForReview`, `transitionLifecycle`, `recordReview`, `decideApproval` | Called only from `governance-actions.ts` (grep-verified; integration tests call the Payload local API directly, not these). |
| `lib/governance.ts` → `getOrCreateCatalogEntry`, `requireArtifactDoc` | Helpers used only by the five write functions. `findCatalogEntry` stays (used by `getGovernance`). |
| `lib/governance.ts` → `ReviewInput` interface + `ReviewType` import | Only consumer is `recordReview`. Note: the feature brief's initial keep-list mentioned `ReviewInput`, but with `recordReview` deleted it has zero consumers — retaining it would be exactly the speculative retention the clarification rejected. |
| Unused imports left behind (`Review` type in governance.ts if unreferenced, form components in the panel, `canTransition`/`hasPermission`/`LIFECYCLE_STATES`/`Role` in the panel, `Role`/`getCurrentActor` in the artifact page) | Swept in the same edit; lint (`eslint`) confirms none remain. |

**Rationale**: Clarified decision (delete, not retain) + Principle VII. The back-office does not use
any of these — Payload admin writes go through the collections' own access rules and hooks.

**Alternatives considered**: Retain the write functions as an "internal API" behind the admin —
rejected in clarification: no consumer exists or is planned; the admin already has its write path.

## §3 Keep inventory (read side) — consumers verified by grep

- `getGovernance` — artifact detail page (and via it the panel + header badge).
- `listReviews`, `listAuditLog` — `GovernancePanel` (read-only blocks).
- `getCurrentActor` — **stays despite the write-path deletion**: used by
  `app/(app)/admin/discovery/page.tsx`, `app/(app)/admin/roles/page.tsx`, and
  `lib/discovery-actions.ts` (all outside this feature's scope).
- `Governance` type — panel, page, `ArtifactCard`, `LifecycleBadge`; `AuditEntry` type — `listAuditLog`
  return shape consumed by the panel.
- `findCatalogEntry` helper — `getGovernance`.
- `LifecycleBadge` — unchanged; detail header + catalog card.
- `@kihub/governance-core` — package untouched; admin collection hooks (`CatalogEntry` transition
  guard via `canTransition`, `Review`/`CatalogEntry` access via `hasPermission`) still depend on it.

## §4 Artifact detail page simplification

**Decision**: The page stops calling `getCurrentActor` and renders
`{governance ? <GovernancePanel artifactId={…} governance={governance} /> : null}`.

**Rationale**: The panel no longer varies by actor, and `(app)/layout.tsx` already enforces
`requireSession()` — every viewer is a signed-in employee, so gating panel rendering on a resolved
actor doc adds a DB lookup for nothing. Governance state visibility for signed-in employees is the
spec's intent (FR-001).

**Alternatives considered**: Keep the `actor` gate — rejected: it existed to compute role-gated
action rendering, which no longer exists; keeping it is dead weight and implies the display might
vary by viewer.

## §5 Why removal is safe (enforcement & failure modes)

- Server-side enforcement never lived in the removed code: Payload collection `access` rules, the
  lifecycle-transition guard hook, and audit hooks run on every write regardless of caller. Removing
  UI/actions cannot loosen or tighten access (spec assumption, FR-006).
- The integration suites (`governance-access`, `review-approval-flow`) exercise those rules through
  the Payload local API — grep-verified that no test imports the deleted actions/functions — so the
  suite remains valid, unchanged, and is the regression net for `/cms`.
- Stale/bookmarked form submissions against the removed server actions fail safely: Next.js rejects
  POSTs referencing unknown server-action IDs with an error response before any application code
  runs; no partial write is possible (spec edge case).

## §6 Verification approach (no new automated tests)

**Decision**: Validate via (a) the untouched, fully green existing suite (82 tests / 20 files) plus
typecheck + lint, and (b) quickstart browser scenarios: all-persona read-only check on the employee
page, and an end-to-end `/cms` action check (metadata edit, guarded lifecycle transition incl. a
rejected invalid move, review creation, approval decision) reflected read-only in the employee app.

**Rationale**: The server behavior this feature relies on is already under test; the change itself is
UI removal, and the repo has no component-test infra to assert "no controls render" — introducing one
for a removal feature is speculative complexity (Principle VII). The Dev-Workflow testing gate
(governance transition rules must have automated tests) remains satisfied by the existing suites.

**Alternatives considered**: Add React component tests (testing-library) asserting the absence of
forms/buttons — rejected: new dev-dependency + infra for a negative assertion on a surface that will
keep evolving; quickstart covers it with the five personas directly.
