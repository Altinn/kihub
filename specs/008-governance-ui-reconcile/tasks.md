---
description: "Task list for Governance-UI Reconcile implementation"
---

# Tasks: Governance-UI Reconcile — Read-Only Governance in the Employee App

**Input**: Design documents from `/specs/008-governance-ui-reconcile/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: **No new automated tests** (plan/research §6): the change removes UI; the server-side rules
it relied on already have their regression net (`governance-access` role×action matrix,
`review-approval-flow`), which exercises the Payload local API — not the removed UI — and MUST stay
green **unchanged**. UI absence and `/cms` capability are validated via quickstart.

**Organization**: By user story — US1=P1 read-only employee governance view (MVP), US2=P2 back-office
remains the sole working action surface (verification only), US3=P3 dead write-path deletion. This is
a **removal feature**: no new file, route, collection, dependency, or migration; `packages/*`,
`apps/web/src/collections/`, and `apps/web/tests/` are untouched.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: every change lives in `apps/web/src` (one component rewritten, one component + one lib file
deleted, one lib file pruned, one page simplified). The back-office (`/cms`), collections, hooks, and
`@kihub/governance-core` are read-verified only — any diff under them is a defect.

---

## Phase 1: Setup (baseline)

**Purpose**: Pin the pre-change baseline so every post-change signal is attributable.

- [ ] T001 Baseline: with docker `kihub-postgres` (port 55432) up, run the full suite from `apps/web` (`set -a; . ./.env; set +a; NODE_OPTIONS=--no-deprecation npx vitest run`) and confirm 82/82 green across 20 files **before touching code**; note that the suite wipes artifacts, so plan to re-seed (`pnpm --filter web index`) before any browser verification

---

## Phase 2: Foundational (Blocking Prerequisites)

**No foundational tasks.** The prerequisites for this feature are already live: the Phase 6
back-office (`/cms`, Contributor+ gate) and the Phase 3 server-side rules (collection access,
transition guard, audit hooks). Nothing new must be built before the stories.

**Checkpoint**: baseline green — story work can begin

---

## Phase 3: User Story 1 - Employees see governance state, and only state, on the artifact detail page (Priority: P1) 🎯 MVP

**Goal**: The artifact detail governance panel becomes a read-only display, identical for every role —
lifecycle state, review status, approval state, owners, risk level, reviews list, audit history; no
action controls; no internal notes or featured flag.

**Independent Test**: Sign in as each of the five personas, open an artifact detail page, confirm the
identical read-only governance display and the absence of any form/button (quickstart Scenarios 1 & 3).

### Implementation for User Story 1

- [ ] T002 [US1] Rewrite `apps/web/src/components/GovernancePanel.tsx` as a read-only server component per `contracts/governance-employee-readonly.md` + research §1: props become `{ artifactId, governance }` (drop `actorRole`); delete the metadata `<form>`, Submit-for-review / "Move to …" / Approve / Reject buttons, and the `ReviewForm` render + import; add the governance-state block — lifecycle state (reuse `STATE_LABELS`), review status (`not-submitted → "Not submitted"`, `in-review → "In review"`), approval state (`not-approved → "Not approved"`, `approved → "Approved"`, `rejected → "Rejected"`), business owner, technical owner, risk level (— when unset); do NOT render `internalNotes` or `featured`; keep the reviews list (type, decision tag, reviewer email, expiry + `isExpired` indicator, comments) and audit history blocks unchanged; imports shrink to `isExpired` (`@kihub/governance-core`), `Card`/`Heading`/`Paragraph`/`Tag` (designsystemet), `listReviews`/`listAuditLog`/`Governance` (`@/lib/governance`)
- [ ] T003 [US1] Simplify `apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx` per research §4: remove the `getCurrentActor` call/import, the `actor` gate, and the `Role` import; render `{governance ? <GovernancePanel artifactId={artifactId} governance={governance} /> : null}` — `(app)/layout.tsx` `requireSession()` already guarantees a signed-in viewer (depends on T002)
- [ ] T004 [US1] Browser-verify quickstart Scenario 1 (all five personas — Ada/Cara/Rita/Aksel/Aria — see the identical read-only panel: state block + reviews + audit; zero forms/buttons; no notes/featured) and Scenario 3 (a never-governed artifact renders computed defaults, creates no record): `preview_start` name `kihub-web`, re-seed the catalog first if empty (depends on T003)

**Checkpoint**: US1 functional — the employee app is constitution-compliant (Principles VI & VIII);
the write path is now provably unreachable (dead), enabling US3

---

## Phase 4: User Story 2 - Editors perform all governance actions in the back-office (Priority: P2)

**Goal**: Confirm `/cms` remains the complete, sole action surface — unchanged from Phase 6. Pure
verification: **no code change expected**; a failure here means a defect elsewhere, not new work here.

**Independent Test**: As Aria Admin in `/cms`: metadata edit, valid + invalid lifecycle transition,
review creation — all behave per the unchanged server-side rules and reflect on the employee page.

### Verification for User Story 2

- [ ] T005 [US2] Run quickstart Scenario 2 end-to-end in `/cms` as Aria Admin: edit a catalog entry's business owner/risk (saves); perform a valid lifecycle transition (saves + audit-logged); attempt an invalid transition (rejected by the unchanged guard hook); create a typed review (saves); reload the employee artifact detail page and confirm every change appears read-only, including new audit entries — if ANY step fails, STOP and investigate (server side must not have changed) (independent of US1 for the `/cms` half; the employee-reflection check depends on T003)

**Checkpoint**: US1 + US2 — actions live only in `/cms` and demonstrably work there; zero platform
capability lost

---

## Phase 5: User Story 3 - The employee app carries no orphaned governance write path (Priority: P3)

**Goal**: Delete the dead write machinery outright (clarified 2026-07-23) so the codebase matches the
product: no employee-app governance write entry points remain.

**Independent Test**: Grep proves the write path gone (quickstart Scenario 4); suite/typecheck/lint
prove nothing dangles.

### Implementation for User Story 3

- [ ] T006 [P] [US3] Delete `apps/web/src/components/ReviewForm.tsx` (sole consumer was GovernancePanel's removed `canRecordReview` branch) (depends on T002)
- [ ] T007 [P] [US3] Delete `apps/web/src/lib/governance-actions.ts` — all five server actions (`submitForReviewAction`, `transitionLifecycleAction`, `updateGovernanceMetadataAction`, `recordReviewAction`, `decideApprovalAction`); sole consumers were GovernancePanel + ReviewForm (depends on T002)
- [ ] T008 [US3] Prune `apps/web/src/lib/governance.ts` per `contracts/removed-write-path.md` + research §2: delete `updateGovernanceMetadata`, `submitForReview`, `transitionLifecycle`, `recordReview`, `decideApproval`, the `ReviewInput` interface, and the private helpers `getOrCreateCatalogEntry` + `requireArtifactDoc`; drop the now-unused `ReviewType` import; KEEP `getGovernance`, `listReviews`, `listAuditLog`, `getCurrentActor` (admin discovery/roles pages + `discovery-actions.ts` still use it), `findCatalogEntry`, `toGovernance`/`defaultGovernance`, and the `Governance`/`AuditEntry` types — note `Review`, `Artifact`, `CatalogEntry`, `User`, `LifecycleState` imports all remain in use by the read side (depends on T007)
- [ ] T009 [US3] Grep-verify the invariant (quickstart Scenario 4): `grep -rn "governance-actions\|ReviewForm" apps/web/src` → no matches; `grep -rnE "updateGovernanceMetadata|submitForReview|transitionLifecycle|recordReview|decideApproval|ReviewInput" apps/web/src` → no matches; `git diff --stat packages/ apps/web/src/collections/ apps/web/tests/` → empty (depends on T006, T007, T008)

**Checkpoint**: all three stories done — read-only employee surface, working back-office, zero dead code

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T010 [P] Update `README.md` "Governance (Phase 3)" section (lines ~87–102): the role-by-role employee-page action walkthrough (Contributor+ edit/submit, Reviewer+ record review, Approver+ approve/move) now describes `/cms` — rewrite it to say the employee artifact page shows governance state **read-only** for everyone (lifecycle, owners, risk, review/approval status, reviews, audit trail) and that all governance actions are performed in the `/cms` editor back-office (Contributor+), per constitution v2.0.0 Principles VI/VIII
- [ ] T011 Final gates from `apps/web`: full suite (`set -a; . ./.env; set +a; NODE_OPTIONS=--no-deprecation npx vitest run`) green at 82/82 across 20 files — same counts as T001, with `governance-access` + `review-approval-flow` passing unchanged; `npx tsc --noEmit` clean; `pnpm -r lint` clean (proves the deletion left no dangling imports/references) (depends on T008; run after T010 so docs are included)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 — run first, before any code change.
- **Foundational (Phase 2)**: none — prerequisites already live (Phase 3 rules + Phase 6 back-office).
- **US1 (Phase 3)**: T002 → T003 → T004. The rewrite MUST precede the deletions (T002 removes the last
  imports of `governance-actions.ts` and `ReviewForm.tsx`, making US3 safe).
- **US2 (Phase 4)**: T005 — the `/cms` half is independent; the employee-reflection half needs T003.
- **US3 (Phase 5)**: T006 ∥ T007 (after T002) → T008 (after T007) → T009.
- **Polish (Phase 6)**: T010 anytime; T011 last.

### User Story Dependencies

- **US1 (P1)**: independent — deliverable on its own (MVP: compliance achieved even before deletion).
- **US2 (P2)**: verification-only; no code; depends on US1 only for the employee-reflection check.
- **US3 (P3)**: depends on US1 (T002) having removed the last references — priority order and
  dependency order coincide.

### Parallel Opportunities

- T006 ∥ T007 (different files, both unblocked by T002).
- T010 (README) ∥ any code task (different file).
- T004 (US1 browser check) ∥ T005 (`/cms` check) — same running dev server, different surfaces.

---

## Parallel Example: User Story 3

```bash
# After T002 (panel no longer imports the write path):
Task: "Delete apps/web/src/components/ReviewForm.tsx"        # T006
Task: "Delete apps/web/src/lib/governance-actions.ts"        # T007 (parallel)
# then T008 (prune lib/governance.ts) → T009 (grep-verify)
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. T001 baseline → 2. T002 panel rewrite → 3. T003 page simplification → 4. T004 persona check →
   **STOP & VALIDATE**: the employee app is constitution-compliant with `/cms` untouched. The write
   path is dead but still present — deletable next.

### Incremental Delivery

1. US1 → compliance (MVP).
2. US2 → proof of no capability loss (verification only).
3. US3 → dead code gone; grep-proven invariant.
4. Polish → README reflects the two-surface reality; suite/typecheck/lint gates.

---

## Notes

- Removal feature: net-negative diff (~350 lines out, a small state block in). Any diff under
  `packages/`, `apps/web/src/collections/`, or `apps/web/tests/` is a defect (T009 checks).
- Deletion order matters only in one place: T002 before T006/T007/T008 (imports must go first).
- The suite wipes artifacts — re-seed (`pnpm --filter web index`) before T004/T005 browser checks if
  the catalog is empty.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
