# Phase 0 Research: Phase 3 — Governance

All items below were resolved via the 2026-07-14 `/speckit-clarify` session plus inspection of the
existing Phase 1/2 codebase (no unresolved NEEDS CLARIFICATION remain).

## 1. Role storage & Admin override (FR-001–FR-004)

- **Decision**: No schema change. The Phase 1 `Users` collection already has a `role` field
  (`select`, options `reader/contributor/reviewer/approver/admin`, default `reader`) and
  `upsertUserFromClaims` (`apps/web/src/auth/upsert-user.ts`) already sets it only on **create**
  (never overwrites on subsequent sign-ins) — i.e. Entra seeds the role once, and it is thereafter
  a persisted, Admin-editable KI Hub value. Phase 3 adds `access` control to `Users` so only an
  Admin may change another user's `role` (a user may not self-elevate), satisfying FR-004.
- **Rationale**: Matches the clarified hybrid model exactly; avoids a redundant governance-owned
  role table (Principle VII).
- **Alternatives considered**: A separate `Role` collection/junction table — rejected as
  unnecessary indirection for a single-tenant, five-value enum already on `Users`.

## 2. Where role checks read from (server-side enforcement, FR-003)

- **Decision**: All governance `access` control functions (Payload collection `access.*`) read
  `req.user.role` as resolved by the existing `authStrategy` (`apps/web/src/auth/payload-strategy.ts`),
  which does a **live `payload.find` against the `users` collection on every request** — i.e. it is
  never a stale JWT claim. Governance actions performed through Payload (Local API or REST) always
  see the current DB role, so an Admin's role change to another user takes effect on that user's
  very next action, with no re-login required.
- **Rationale**: Directly satisfies FR-004 ("role changes MUST take effect for subsequent actions")
  using an existing mechanism — no new session/refresh logic needed.
- **Note**: The NextAuth `session.user.role` (JWT-cached) is still fine for optimistic UI
  (hide/show controls) but MUST NOT be the source of truth for any access decision — Payload
  `access` functions are (defense in depth, FR-003/SC-002).

## 3. Lifecycle transition enforcement (FR-007, FR-008)

- **Decision**: A new pure, Payload-agnostic module `packages/governance-core` (mirrors
  `discovery-core`'s shape) exports `canTransition(from, to, role)` encoding the clarified matrix
  (strict linear Draft→Experimental→In Review→Approved→Recommended; Deprecated/Archived from any
  state; role gates per transition — see data-model.md). A Payload `beforeChange` hook on
  `catalog-entries` calls it and throws a Payload `APIError` with a clear message on an invalid or
  unauthorized transition, so no state change is persisted (FR-008) and the reason surfaces to the
  caller (UI shows it).
- **Rationale**: Keeping the FSM as pure functions makes it unit-testable without a database
  (mirrors Phase 2's `discovery-core` pattern) and reusable if a future admin tool or automation
  (Phase 4+) needs the same rules.
- **Alternatives considered**: Inline validation in route handlers — rejected, harder to test in
  isolation and easy to bypass from a second call site.

## 4. Audit trail (FR-012, FR-019, SC-006)

- **Decision**: A new flat `audit-log` collection (`actor`, `action`, `artifact` relationship,
  `details` JSON, `createdAt`). Payload `afterChange` hooks on `catalog-entries` and `reviews`
  write one audit entry per mutation (metadata edit, lifecycle transition, review recorded,
  approval decision), capturing the actor from `req.user`, the action type, and a details blob
  (changed fields / decision). `audit-log` has no `update`/`delete` access — entries are
  append-only from hook code (`overrideAccess`), never player-editable.
- **Rationale**: Centralizing writes in `afterChange` hooks means every mutation path is audited
  automatically — a developer adding a new governance mutation cannot forget to log it, since the
  hook is on the collection, not the call site.
- **Alternatives considered**: Event-sourcing the whole governance state from the audit log —
  rejected as over-engineering for this phase (Principle VII); current-state collections +
  an audit-log side table is simpler and sufficient for FR-012/FR-019.

## 5. Concurrent edits (edge case, clarified)

- **Decision**: No optimistic-concurrency/version field. Last-write-wins on `catalog-entries` /
  `reviews` (Payload's default `update` behavior), relying on the audit-log (§4) to retain every
  prior value so nothing is *silently* lost — it is simply not merged.
- **Rationale**: Matches the clarified answer and Principle VII (Start Simple); revisit only if a
  real conflict incident occurs.

## 6. Governance record creation timing (FR-005, edge case "no governance record yet")

- **Decision**: Lazy creation. `lib/governance.ts` exposes `getGovernance(artifactId)` that reads
  `catalog-entries` and, if absent, returns an **in-memory default** (`lifecycleState` seeded from
  the Artifact's `lifecycleStatus` manifest field or `Draft` if absent; no reviews; not
  recommended/featured) without writing to the database. A `catalog-entries` row is created lazily
  the first time an authorized user performs a real governance action (edit metadata, submit for
  review, transition, review, approve).
- **Rationale**: Keeps the catalog listing/detail fast for the common case (most artifacts may
  never be governed) and avoids coupling the Phase 2 indexer to Phase 3 collections — indexing
  stays untouched, directly satisfying FR-010 (re-indexing never touches governance state, because
  it never writes to `catalog-entries` at all).
- **Alternatives considered**: Eager-create a `catalog-entries` row for every `Artifact` during
  indexing — rejected: couples Phase 2's indexer to Phase 3 schema, contradicts the phase
  separation already established in the Phase 2 plan.

## 7. Identity/key shape for `catalog-entries` and `reviews`

- **Decision**: Both collections reference the artifact via a Payload `relationship` field to
  `artifacts` (not a denormalized copy of `artifactId` text), since `Artifact` docs are never hard
  -deleted (only deactivated — Phase 2 §reconcile), so the relationship is always resolvable and
  keeps the "same stable artifact ID" invariant (Principle IV) via the Artifact's own unique
  `artifactId`. One `catalog-entries` doc per artifact (enforced by a unique index on the
  relationship field); many `reviews` docs per artifact.
- **Rationale**: A real relationship gives cheap joins for the catalog listing/detail (populate)
  without re-deriving lookups by string id everywhere.

## 8. UI/action surface

- **Decision**: Governance mutations (submit for review, record review, approve/reject, lifecycle
  transition, edit governance metadata, role override) are Next.js **Server Actions** in
  `apps/web/src/lib/governance.ts`, calling the Payload Local API (never a hand-rolled REST layer),
  consistent with how Phase 2 reads the catalog. Access control lives in the Payload collection
  `access` functions (§2), so Server Actions are a thin, revalidating wrapper — not a second place
  enforcing role logic.
- **Rationale**: Avoids duplicating authorization logic between an API layer and Payload; matches
  the existing Local-API-first pattern.
