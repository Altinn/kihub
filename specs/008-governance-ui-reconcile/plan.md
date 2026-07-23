# Implementation Plan: Governance-UI Reconcile — Read-Only Governance in the Employee App

**Branch**: `feat/new-architecture` (single-branch workflow) | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-governance-ui-reconcile/spec.md`

## Summary

Constitution v2.0.0 moved governance **actions** to the editor back-office (Principle VI) and barred
the employee app from being a general-purpose admin (Principle VIII), but the employee artifact detail
page still renders Phase 3's action UI. This feature is the reconcile — a pure subtraction:

- `GovernancePanel` is rewritten as a read-only display, identical for every role: lifecycle state,
  review status, approval state, owners, risk level, the reviews list, and the audit history. The
  internal notes and featured flag are excluded (clarified), and no action control renders for anyone.
- The now-dead employee write path is **deleted outright** (clarified): the server actions file, the
  `ReviewForm` component, the five write functions in `lib/governance.ts`, and the helpers/types that
  die with them.
- **Nothing server-side changes**: Payload collections, access rules, the lifecycle-transition guard,
  audit hooks, and `@kihub/governance-core` are untouched. `/cms` (Phase 6) remains the sole action
  surface — verified via quickstart, not rebuilt.

Net effect: the employee app loses ~350 lines of write machinery and gains constitution compliance;
no platform capability is lost.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (unchanged).

**Primary Dependencies** (all already present; none added, none removed from package.json):
- Next.js 16 (App Router) + Payload CMS 3.85 — the deleted files are Next server actions and server
  components; Payload usage in the remaining read functions is unchanged.
- `@digdir/designsystemet-react` — the read-only panel keeps using it (`Card`, `Heading`, `Paragraph`,
  `Tag`); the form components (`Button`, `Checkbox`, `Select`, `Textfield`, `Label`, `Field`) drop out
  of the governance UI.
- `@kihub/governance-core` — **package unchanged** (the admin's collection hooks still consume
  `canTransition` / `hasPermission`). In the employee app only `isExpired` remains imported (expired
  review indicator); `canTransition`, `hasPermission`, `LIFECYCLE_STATES`, and `Role` imports disappear
  with the action UI.

**Storage**: PostgreSQL — unchanged. No schema change, no migration.

**Testing**: Vitest. The governance rule suites (`governance-access.test.ts` role×action matrix,
`review-approval-flow.test.ts`) exercise the Payload local API directly — they never touched the
removed UI/actions and MUST stay green unchanged, since the back-office relies on exactly those rules.
**No new automated tests**: the change removes UI; the server-side rules it relied on keep their
existing coverage, and there is no component-test infrastructure to assert UI absence (adding one for
a removal would violate Principle VII). UI absence + `/cms` capability are validated via quickstart.

**Target Platform**: unchanged — local dev (`AUTH_MODE=mock`, personas via `/signin`) and Azure (Entra).

**Project Type**: Web app monorepo — `apps/web` only; `packages/*` untouched.

**Performance Goals**: N/A — a removal; the read-only panel does strictly less work than before
(no permission computation, no transition enumeration).

**Constraints**:
- Employee governance display is read-only and role-independent (FR-001–FR-003); internal notes and
  featured are excluded (clarified 2026-07-23).
- Delete the dead write path outright — no speculative retention (FR-004, clarified 2026-07-23).
- Zero changes to collections, access rules, hooks, or `@kihub/governance-core` (FR-005/FR-006).
- Read side preserved: `getGovernance`, `listReviews`, `listAuditLog`, `getCurrentActor` (still used by
  the admin discovery/roles pages and `discovery-actions.ts` — verified), the `Governance`/`AuditEntry`
  types, and `LifecycleBadge` (FR-008).

**Scale/Scope**: One component rewritten (`GovernancePanel`), one component and one lib file deleted
(`ReviewForm.tsx`, `governance-actions.ts`), ~130 lines of write functions pruned from
`lib/governance.ts`, one page simplified. No route, collection, or package changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Compliance | Status |
|------------------------|------------|--------|
| I. Git is source of truth (AI artifacts) | Untouched — no artifact content involved. | ✅ PASS |
| II. Payload owns context & native content | Untouched — no data-layer change; governance metadata stays in `catalog-entries`/`reviews`/`audit-log`. | ✅ PASS |
| III. Every AI asset is an Artifact | Untouched. | ✅ PASS |
| IV. Stable artifact identity | Untouched — reads keep keying off `artifactId`. | ✅ PASS |
| V. Git-centric, APM distribution | Untouched. | ✅ PASS |
| VI. Governance is the core value (Registry) | **This feature exists to restore compliance**: actions live only in the back-office; the employee app surfaces governance state read-only; server-side role gating unchanged. | ✅ PASS |
| VII. Start simple, design for growth | Net removal; dead code deleted per clarification (no speculative retention); no new dependency/infra/tests-for-absence. | ✅ PASS |
| VIII. Two surfaces | The employee app stops offering admin actions — the two-surface split becomes real. Back-office capability verified, not rebuilt. | ✅ PASS |
| Design System (employee app) | The read-only panel remains pure Designsystemet. | ✅ PASS |
| Auth (employees only, roles) | Unchanged; role gating still enforced server-side in the data layer. | ✅ PASS |
| Testing gate | Governance state-transition and access rules keep their existing automated tests, unchanged and green. | ✅ PASS |
| Contract-first | The employee read-only display contract and the removed-write-surface inventory are documented in `contracts/`. | ✅ PASS |

**Result**: No violations. Complexity Tracking intentionally empty.

## Project Structure

### Documentation (this feature)

```text
specs/008-governance-ui-reconcile/
├── plan.md              # This file
├── research.md          # Phase 0 output (decisions & removal inventory)
├── data-model.md        # Phase 1 output (no schema change; employee-visibility matrix)
├── quickstart.md        # Phase 1 output (persona + /cms + suite validation)
├── contracts/
│   ├── governance-employee-readonly.md   # what the employee surface MUST/MUST NOT show
│   └── removed-write-path.md             # exact inventory of deleted employee write surface
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      components/
        GovernancePanel.tsx    # REWRITTEN: pure read-only display (state block + reviews + audit);
                               #   drops role prop, forms, buttons, and governance-core permission calls
        ReviewForm.tsx         # DELETED (only consumer was GovernancePanel's action UI)
        LifecycleBadge.tsx     # unchanged (read-only; header + catalog card)
      lib/
        governance-actions.ts  # DELETED (all five server actions; only consumers were the removed UIs)
        governance.ts          # PRUNED: write fns removed (updateGovernanceMetadata, submitForReview,
                               #   transitionLifecycle, recordReview, decideApproval) + dead helpers
                               #   (getOrCreateCatalogEntry, requireArtifactDoc) + ReviewInput type;
                               #   read side kept (getGovernance, listReviews, listAuditLog,
                               #   getCurrentActor, findCatalogEntry, Governance/AuditEntry types)
      app/(app)/artifacts/[artifactId]/
        page.tsx               # SIMPLIFIED: no getCurrentActor call / actorRole prop; renders the
                               #   panel whenever governance state exists (session already required)
    tests/                     # UNCHANGED — all 82 tests must stay green as-is
packages/
  governance-core/             # UNCHANGED (admin collection hooks still use it)
apps/web/src/collections/      # UNCHANGED (access rules, transition guard, audit hooks)
```

**Structure Decision**: Pure subtraction inside the existing layout — no new files besides spec
artifacts, no moved modules, no route changes. The only rewritten file keeps its name and location
(`GovernancePanel.tsx`) since its read-only remit is a subset of what it already did for
non-privileged roles.

## Complexity Tracking

> No constitution violations — section intentionally empty.
