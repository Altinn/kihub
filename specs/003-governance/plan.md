# Implementation Plan: Phase 3 — Governance

**Branch**: `feat/new-architecture` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-governance/spec.md`

## Summary

Layer enterprise governance on the Phase 2 catalog: a `catalog-entries` collection (owners, risk,
lifecycle state, recommended/featured, notes) keyed by the same stable `artifactId` as the
technical `Artifact` record but living in its own Payload collection; a five-role model
(Reader/Contributor/Reviewer/Approver/Admin) reusing the `role` field Phase 1 already put on
`Users`, enforced server-side via Payload `access` functions and a pure `@kihub/governance-core`
package (lifecycle-transition matrix + permission matrix); typed `reviews` (security, GDPR,
technical, accessibility, responsible AI, operational) with an advisory approval decision; and an
append-only `audit-log` written by collection hooks for every governance mutation. No automated
discovery (Phase 4) or semantic search (Phase 5); the Phase 2 indexer is untouched.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (Phase 1/2 toolchain, unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 (`@payloadcms/db-postgres`) — carried over.
- Digdir Designsystemet (`@digdir/designsystemet-react` + `-css`) — all governance UI.
- New workspace package `@kihub/governance-core` (pure, Payload-agnostic — mirrors
  `@kihub/discovery-core`'s shape) for the lifecycle FSM and role-permission matrix; no new
  external runtime dependency.
- Reuses `@kihub/artifact-schema` types (lifecycle/visibility enums) where they already overlap.

**Storage**: PostgreSQL (unchanged). Three new Payload collections — `catalog-entries`, `reviews`,
`audit-log` — hold governance/enterprise-context data only (Principle II); zero artifact content
(Principle I). The Phase 2 `Artifact` collection is unmodified.

**Testing**: Vitest. Unit: `@kihub/governance-core` (lifecycle-transition matrix, permission
matrix, review-expiry check) — pure, no DB. Integration: Payload `access` control per role×action,
audit-log entries written for each mutation type, and re-index-preserves-governance (Phase 2
indexer run against an artifact with an existing `catalog-entries` doc).

**Target Platform**: Local dev (Phase 1/2 baseline), same `AUTH_MODE=mock` personas extended to
cover all five roles.

**Project Type**: Web app monorepo — `apps/web` (Next.js + Payload) + `packages/` (adds
`governance-core`; reuses `artifact-schema`; `discovery-core` untouched).

**Performance Goals**: No new throughput target — governance actions and the resulting
listing/detail updates complete within the same interactive page-load budget as Phase 2's catalog
(small internal catalog, tens of artifacts).

**Constraints**:
- All role checks server-side, reading the live `users.role` value per request via the existing
  `authStrategy` (never a cached JWT claim) — FR-003/FR-004 (research.md §2).
- `catalog-entries`/`reviews`/`audit-log` are separate collections from `Artifact`; the Phase 2
  indexer has no dependency on them, so re-indexing cannot touch governance state by construction
  (FR-010).
- Lifecycle transitions and role permissions are enforced exactly once, in
  `@kihub/governance-core` + a `beforeChange` hook — not duplicated across route handlers (FR-008).
- All UI from Designsystemet (constitution, unchanged).

**Scale/Scope**: Same small internal catalog. Three new collections, a 7-state lifecycle × 5-role
permission matrix, 6 typed review categories, one append-only audit collection.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Phase 3 compliance | Status |
|------------------------|--------------------|--------|
| I. Git is source of truth | No artifact content added; governance collections hold enterprise metadata only. | ✅ PASS |
| II. Payload owns context not content | `catalog-entries`/`reviews`/`audit-log` are exactly the enterprise-context collections the constitution names (owners, risk, approvals, lifecycle) — kept separate from the Phase 2 technical `Artifact`. | ✅ PASS |
| III. Everything is an Artifact | Governance keys off `artifactId` regardless of `type`; no per-type governance subsystem. | ✅ PASS |
| IV. Stable artifact identity | `catalog-entries`/`reviews` relate to `artifacts` (never hard-deleted, only deactivated), preserving identity continuity; no keying by repo path. | ✅ PASS |
| V. Git-centric, APM-compatible distribution | Unaffected — no change to install/distribution mechanics this phase. | ✅ PASS |
| VI. Governance is the core value | This phase directly implements it: lifecycle states, typed reviews, owners, risk, roles. | ✅ PASS |
| VII. Start simple, design for growth | Lazy `catalog-entries` creation (no eager coupling to indexing); last-write-wins concurrency with audit trail instead of optimistic locking; flat audit-log instead of full event sourcing. | ✅ PASS |
| Design System (MANDATORY) | All new governance UI (badges, panels, review form, role admin) built from Designsystemet only. | ✅ PASS |
| Auth (employees only, roles) | Extends Phase 1's `Users.role` and live-DB role resolution; no change to the employee gate itself. | ✅ PASS |
| Testing gate | `governance-core` unit tests (FSM, permission matrix, expiry) + Payload integration tests (access control per role, audit hooks, re-index preservation). | ✅ PASS |
| Contract-first | `catalog-entries`/`reviews`/`audit-log` shapes and `governance-core`'s function contracts documented in `contracts/`, versioned like Phase 2. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-governance/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── governance-core.md               # lifecycle FSM + permission-matrix function contract
│   ├── catalog-entry-collection.md       # Payload catalog-entries shape + listing/detail surface
│   └── review-and-audit-collections.md   # Payload reviews + audit-log shape + role admin route
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      collections/
        Users.ts                  # CHANGED: access control — only Admin may change another user's `role`
        Artifact.ts                # unchanged (Phase 2)
        CatalogEntry.ts            # NEW: governance record, keyed by relationship to `artifacts`
        Review.ts                  # NEW: typed reviews
        AuditLog.ts                # NEW: append-only audit trail
      payload.config.ts            # CHANGED: register CatalogEntry, Review, AuditLog
      app/
        (app)/
          page.tsx                 # CHANGED: listing cards show LifecycleBadge
          artifacts/
            [artifactId]/
              page.tsx             # CHANGED: lifecycle/approved badges + GovernancePanel + review/audit history
          admin/
            roles/
              page.tsx             # NEW: Admin-only role management (FR-004)
      components/
        LifecycleBadge.tsx         # NEW
        GovernancePanel.tsx        # NEW: owners/risk/notes + role-gated action controls
        ReviewForm.tsx             # NEW
      lib/
        governance.ts              # NEW: getGovernance/updateGovernanceMetadata/submitForReview/
                                    #      transitionLifecycle/recordReview/decideApproval (Server Actions)
    tests/
      integration/
        governance-access.test.ts  # NEW: Payload access control per role × action
        audit-log.test.ts          # NEW: hooks write one audit entry per mutation type
        reindex-preserves.test.ts  # NEW: Phase 2 indexer run leaves catalog-entries untouched

packages/
  governance-core/                 # NEW: pure, Payload-agnostic (mirrors discovery-core)
    src/
      lifecycle.ts                 # canTransition(from, to, role)
      roles.ts                     # hasPermission(role, action)
      review.ts                    # REVIEW_TYPES, isExpired(expiryDate, now)
      index.ts
    tests/
      lifecycle.test.ts
      roles.test.ts
      review.test.ts
    package.json                   # @kihub/governance-core
```

**Structure Decision**: Add `packages/governance-core` as a reusable, Payload-agnostic core
(lifecycle FSM + permission matrix + review-expiry check), consumed by three new `apps/web`
collections and their hooks, plus by `lib/governance.ts`'s Server Actions. This mirrors Phase 2's
`discovery-core` pattern (pure core + thin Payload-aware layer) and keeps the authorization/FSM
rules unit-testable without a database. The Phase 2 `(app)/page.tsx` listing and
`artifacts/[artifactId]` detail pages are extended in place (not replaced) to surface governance
state; a new `(app)/admin/roles` route covers FR-004.

## Complexity Tracking

> No constitution violations — section intentionally empty.
