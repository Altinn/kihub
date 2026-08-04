# Contract: Removed Employee-App Governance Write Surface

This contract is an **inventory of removal** — after implementation, none of the following exists
anywhere in `apps/web/src`, and the invariant below holds.

## Deleted files

| File | Contents removed |
|------|------------------|
| `apps/web/src/lib/governance-actions.ts` | `submitForReviewAction`, `transitionLifecycleAction`, `updateGovernanceMetadataAction`, `recordReviewAction`, `decideApprovalAction` (all five Next server actions) |
| `apps/web/src/components/ReviewForm.tsx` | The typed-review recording form |

## Deleted exports from `apps/web/src/lib/governance.ts`

`updateGovernanceMetadata`, `submitForReview`, `transitionLifecycle`, `recordReview`,
`decideApproval`, the `ReviewInput` interface, and the private helpers `getOrCreateCatalogEntry`
and `requireArtifactDoc` (dead once the write functions go).

## Explicitly retained (read side)

`getGovernance`, `listReviews`, `listAuditLog`, `getCurrentActor` (consumers: admin discovery/roles
pages, `discovery-actions.ts`), `findCatalogEntry` (private), `Governance` and `AuditEntry` types,
`components/LifecycleBadge.tsx`, and the rewritten read-only `components/GovernancePanel.tsx`.

## Invariant

The employee app exposes **zero** governance write entry points: no server action, route handler, or
library function in `apps/web/src` (outside Payload's own `/cms` surface) mutates `catalog-entries`,
`reviews`, or `audit-log`. Governance writes happen exclusively through the Payload admin
back-office, governed by the collections' unchanged access rules, lifecycle-transition guard, and
audit hooks.

## Unchanged contracts (pointers, not duplicated here)

- Collections & rules: `specs/003-governance/contracts/` (`catalog-entry-collection.md`,
  `review-and-audit-collections.md`, `governance-core.md`) — still accurate; nothing in them changes.
- Back-office surface & gating: `specs/006-editor-backoffice/` (Payload admin at `/cms`,
  Contributor+ entry gate) — still accurate; this feature only makes it the *sole* action surface.
