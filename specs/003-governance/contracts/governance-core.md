# Contract: `@kihub/governance-core` (pure logic package)

Payload-agnostic, framework-free package (mirrors `@kihub/discovery-core`'s shape) — no Payload or
Next.js imports. Consumed by Payload collection hooks and `lib/governance.ts`.

## `lifecycle.ts`

```ts
export type LifecycleState =
  | 'draft' | 'experimental' | 'in-review' | 'approved' | 'recommended' | 'deprecated' | 'archived';

export type Role = 'reader' | 'contributor' | 'reviewer' | 'approver' | 'admin';

export interface TransitionResult {
  allowed: boolean;
  reason?: string; // present when allowed = false, e.g. "invalid-transition" | "role-not-permitted"
}

/** Pure check against the clarified transition matrix (data-model.md). No I/O. */
export function canTransition(from: LifecycleState, to: LifecycleState, role: Role): TransitionResult;
```

- **Contract**: `canTransition` is a pure function of its three inputs — same inputs always give
  the same result; it never queries a database or reads `Date.now()`.
- **Invariants**: `deprecated` and `archived` are reachable from every `from` state for roles
  `approver`/`admin`; all other transitions must follow the linear order
  draft→experimental→in-review→approved→recommended with no skipped stages.

## `roles.ts`

```ts
export type GovernanceAction =
  | 'edit-metadata' | 'submit-for-review' | 'record-review' | 'decide-approval'
  | 'transition-lifecycle' | 'manage-roles' | 'archive';

/** Pure permission-matrix lookup (FR-002). No I/O. */
export function hasPermission(role: Role, action: GovernanceAction): boolean;
```

- **Contract**: encodes the FR-002 mapping exactly (Reader = none of these; Contributor =
  `edit-metadata`, `submit-for-review`; Reviewer = + `record-review`; Approver = +
  `decide-approval`, `transition-lifecycle` (for its allowed transitions), `archive`; Admin = all,
  including `manage-roles`).

## `review.ts`

```ts
export type ReviewType =
  | 'security' | 'privacy-gdpr' | 'technical' | 'accessibility' | 'responsible-ai' | 'operational';

export const REVIEW_TYPES: readonly ReviewType[];

/** Pure — caller supplies `now` so the function stays deterministic/testable. */
export function isExpired(expiryDate: string | Date, now: Date): boolean;
```

## Usage contract

- Payload `access` functions and `beforeChange` hooks on `catalog-entries`/`reviews` call
  `hasPermission`/`canTransition` and MUST reject (throw a Payload `APIError` with the `reason`) on
  a falsy result — this is the only place these rules are enforced (research.md §3), so there is
  exactly one source of truth for "can this role do this."
- UI components MAY also call `hasPermission` client-side to hide/disable controls, but this is a
  UX nicety only — the server-side check is what makes FR-003/SC-002 true.
