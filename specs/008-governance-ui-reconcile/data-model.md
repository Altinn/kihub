# Data Model: Governance-UI Reconcile

**No schema, collection, field, access-rule, or hook changes.** The Payload collections
(`catalog-entries`, `reviews`, `audit-log`, `users`) and `@kihub/governance-core` (roles, permission
matrix, lifecycle FSM) are byte-for-byte untouched; there is no migration. What changes is only which
**surface** may display or mutate the existing data. The matrix below is the feature's data contract.

## Employee-surface visibility matrix (artifact detail page)

Governance state (`catalog-entries`, via `getGovernance` — persisted record or computed default):

| Field | Employee app (all roles) | Editor back-office (`/cms`, Contributor+) |
|-------|--------------------------|-------------------------------------------|
| `lifecycleState` | read-only (panel + header badge) | editable (FSM-guarded transition) |
| `reviewStatus` | read-only | editable per access rules |
| `approvalState` | read-only (panel + "Approved" badge) | editable per access rules (approval decision) |
| `recommended` | read-only (header badge) | editable per access rules |
| `businessOwner` | read-only | editable |
| `technicalOwner` | read-only | editable |
| `riskLevel` | read-only | editable |
| `internalNotes` | **not shown** (clarified 2026-07-23) | editable |
| `featured` | **not shown** (clarified 2026-07-23) | editable |

Reviews (`reviews`, via `listReviews`, newest first):

| Field | Employee app | Back-office |
|-------|--------------|-------------|
| `type`, `decision`, `reviewer` (email), `expiryDate` (+ expired indicator), `comments` | read-only list | full create/edit per access rules |
| `requiredChanges`, `status`, `riskLevel` | not shown (unchanged — never displayed on the employee page) | editable |

Audit history (`audit-log`, via `listAuditLog`, newest first):

| Field | Employee app | Back-office |
|-------|--------------|-------------|
| `createdAt`, `actor` (email), `action` | read-only list | produced by server hooks only (never hand-edited) |

## State transitions

Unchanged. The lifecycle FSM (Draft → Experimental → In Review → Approved → Recommended →
Deprecated → Archived, with role-gated edges) lives in `@kihub/governance-core` and is enforced by
the `catalog-entries` collection hook. The only change: no employee-surface control invokes
transitions anymore — the back-office is the sole trigger surface.

## Derived/default behavior (preserved)

An artifact with no `catalog-entries` row renders a computed default governance state
(`lifecycleState` from the artifact's indexed `lifecycleStatus` or `draft`; empty owners/reviews/
audit). Viewing never creates a record — record creation now happens only via back-office writes.
