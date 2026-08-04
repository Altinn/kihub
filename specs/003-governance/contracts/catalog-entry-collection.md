# Contract: `catalog-entries` Payload collection + governance UI surface

## Collection: `catalog-entries`

Governance record (see [data-model.md](../data-model.md) for fields). One per `artifact`, created
lazily (research.md §6).

- **slug**: `catalog-entries`
- **key**: `artifact` relationship (unique) → `artifacts.artifactId` is the ultimate stable
  identity (Principle IV); never re-keyed by repo path.
- **access**:
  - `read`: any authenticated employee.
  - `create`/`update` (non-lifecycle fields): Contributor+ (`hasPermission(role, 'edit-metadata')`).
  - `update` (lifecycle field only): additionally gated by `canTransition` in a `beforeChange`
    hook — rejects with a clear reason and no partial write on failure (FR-008).
  - `delete`: always `false` (governed history is retained even if the artifact is later
    deactivated).
- **hooks**:
  - `beforeChange`: stamp `updatedBy`/`updatedAt`; validate lifecycle transitions.
  - `afterChange`: write one `audit-log` entry (action = `metadata-edit` or
    `lifecycle-transition` depending on what changed).

## `lib/governance.ts` — server-side surface consumed by the app

| Function | Behavior |
|----------|----------|
| `getGovernance(artifactId)` | Read `catalog-entries` by artifact; if absent, return the in-memory default (data-model.md "Derived values"). Never throws for a missing entry. |
| `updateGovernanceMetadata(artifactId, patch, actor)` | Create-or-update the entry's owner/risk/notes/featured fields. Requires `edit-metadata`. |
| `submitForReview(artifactId, actor)` | Transition `experimental → in-review` (or `draft → experimental → in-review` if starting from draft — two calls, or the UI nudges Draft→Experimental first) and set `reviewStatus = in-review`. Requires `submit-for-review`. |
| `transitionLifecycle(artifactId, to, actor)` | Generic transition entry point used for Approved/Recommended/Deprecated/Archived. Requires the transition to be allowed for `actor.role`. |

## Catalog listing — `(app)/page.tsx` (changed)

- Each `ArtifactCard` additionally renders a `LifecycleBadge` (lifecycle state) and a
  recommended/approved indicator when applicable (FR-011). An artifact with no governance record
  shows the computed default badge (`Draft` unless the manifest set a different
  `lifecycleStatus`) — never an error or blank state.

## Artifact detail — `(app)/artifacts/[artifactId]/page.tsx` (changed)

- Renders the `LifecycleBadge` + approved/recommended state alongside the Phase 2 technical
  metadata (FR-011).
- Renders a `GovernancePanel` showing: owners, risk level, internal notes (Contributor+ can edit),
  and the actions the signed-in user's role permits (submit for review / record review /
  approve-reject / transition / archive) — actions the role does not permit are not rendered
  (UX nicety); the server action re-checks permission regardless (FR-003).
- Renders the review history (type, reviewer, decision, expiry — flagged if past `expiryDate`,
  FR-018) and the audit history for the artifact (FR-019).

## UI mandate

All of the above is built exclusively from Designsystemet components/tokens, consistent with
Phase 1/2.
