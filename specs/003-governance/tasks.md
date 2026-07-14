---
description: "Task list for Phase 3 — Governance implementation"
---

# Tasks: Phase 3 — Governance

**Input**: Design documents from `/specs/003-governance/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution mandates them — governance-core's permission matrix,
lifecycle transitions, and review-expiry logic have unit tests; role-gated access, audit-log
writes, and the review→approval flow have Payload integration tests. UI is verified via
quickstart.

**Organization**: By user story — US1=P1 role-based access, US2=P2 governance metadata &
lifecycle, US3=P3 typed reviews & approval. Builds on Phase 1 (auth/roles) and Phase 2 (catalog,
`Artifact` collection, indexer) — neither is modified except `Users` access control.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: app in `apps/web/`, new pure logic in `packages/governance-core/`, reused indexing core
in `packages/discovery-core/` (untouched), reused schema in `packages/artifact-schema/`.

---

## Phase 1: Setup

- [ ] T001 Initialize `packages/governance-core` (`package.json` name `@kihub/governance-core`, `type: module`, `tsconfig.json`, dep-free, dev `vitest`; `test` script)
- [ ] T002 [P] Extend dev-only mock personas in `apps/web/src/auth/claims.ts`: add `contributor`/`reviewer`/`approver`/`admin` personas (each its own `oid`/`email`) alongside the existing `member`/`guest`/`foreign-tenant`, each carrying a dev-only `roleHint`
- [ ] T003 [P] Add an optional `roleHint` to `IdentityClaims` (`apps/web/src/auth/claims.ts`), consumed only in `upsertUserFromClaims`'s create path (`apps/web/src/auth/upsert-user.ts`) — real Entra claim mapping (`toClaims` in `apps/web/src/auth/config.ts`) never sets it, so production sign-in is unaffected and every new real user still defaults to `reader`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure permission/lifecycle logic and the three new Payload collections (with
access control + audit hooks already wired) must exist before any role-gated action or UI is built

**⚠️ CRITICAL**: Blocks all user stories

- [ ] T004 [P] Implement `packages/governance-core/src/roles.ts`: `hasPermission(role, action)` per contracts/governance-core.md (Reader=none; Contributor=`edit-metadata`+`submit-for-review`; Reviewer=+`record-review`; Approver=+`decide-approval`+`transition-lifecycle`+`archive`; Admin=all incl. `manage-roles`)
- [ ] T005 [P] Implement `packages/governance-core/src/lifecycle.ts`: `canTransition(from, to, role)` per the matrix in data-model.md (linear Draft→Experimental→In Review→Approved→Recommended; Deprecated/Archived reachable from any state for Approver/Admin; anything else rejected with a reason)
- [ ] T006 [P] Implement `packages/governance-core/src/review.ts`: `REVIEW_TYPES` (security/privacy-gdpr/technical/accessibility/responsible-ai/operational) + `isExpired(expiryDate, now)`; re-export all three modules from `packages/governance-core/src/index.ts`
- [ ] T007 Create the `catalog-entries` Payload collection in `apps/web/src/collections/CatalogEntry.ts` per data-model.md (`artifact` relationship unique, `businessOwner`, `technicalOwner`, `riskLevel`, `reviewStatus`, `approvalState`, `lifecycleState`, `recommended`, `featured`, `internalNotes`, `updatedBy`, `updatedAt`; access: read=authenticated, create/update=`hasPermission(role, 'edit-metadata')`; `beforeChange` hook stamps `updatedBy`/`updatedAt` and calls `canTransition` whenever `lifecycleState` changes, rejecting with a clear reason and no partial write; delete=false)
- [ ] T008 [P] Create the `reviews` Payload collection in `apps/web/src/collections/Review.ts` per data-model.md (`artifact` relationship, `type`, `reviewer`, `status`, `decision`, `comments`, `requiredChanges`, `riskLevel`, `reviewDate`, `expiryDate`; access: read=authenticated, create/update=`hasPermission(role, 'record-review')`; `beforeChange` hook stamps `reviewer`+`reviewDate`; delete=false)
- [ ] T009 [P] Create the `audit-log` Payload collection in `apps/web/src/collections/AuditLog.ts` per data-model.md (`actor`, `action`, `artifact`, `targetUser`, `details` json, `createdAt`; access: read=authenticated, create=server-side only via hooks with `overrideAccess`, update/delete=false)
- [ ] T010 Wire `afterChange` hooks on `CatalogEntry` and `Review` (`apps/web/src/collections/CatalogEntry.ts`, `Review.ts`) to write one `audit-log` entry per mutation (`metadata-edit`/`lifecycle-transition` for CatalogEntry depending on which fields changed; `review-recorded` for Review) (depends on T007, T008, T009)
- [ ] T011 Register `CatalogEntry`, `Review`, `AuditLog` in `apps/web/src/payload.config.ts` (depends on T007, T008, T009)
- [ ] T012 [P] Update `apps/web/src/collections/Users.ts` access: `update` restricted so only Admin may change another user's `role` (a user may still update their own non-`role` fields); add an `afterChange` hook writing an `audit-log` entry (`action='role-change'`, `targetUser` set) whenever `role` changes (depends on T009)

**Checkpoint**: Collections + pure logic exist and are access-controlled; user stories can build on them

---

## Phase 3: User Story 1 - Role-based access to governance actions (Priority: P1) 🎯 MVP

**Goal**: Five roles (Reader/Contributor/Reviewer/Approver/Admin) derived from the Phase 1 `Users.role` field; every governance action correctly permitted/refused per role, server-side, and an Admin can view/override a user's role.

**Independent Test**: Sign in as each role and confirm allowed/disallowed governance actions, both via the app and by calling the Payload layer directly. (quickstart Scenario A)

### Tests for User Story 1 (constitution-mandated) ⚠️ write first, ensure they FAIL

- [ ] T013 [US1] Integration test `apps/web/tests/integration/governance-access.test.ts`: for each of the 5 roles × each gated action (catalog-entries create/update incl. a lifecycle transition, reviews create, users role-change), assert allow/deny matches the contracts/governance-core.md matrix (SC-001, SC-002) by calling Payload directly — not through the UI

### Implementation for User Story 1

- [ ] T014 [US1] Build the Admin-only role management route `apps/web/src/app/(app)/admin/roles/page.tsx`: list users (email, name, role), a role selector whose change calls a server action updating `users.role`, gated server-side via `hasPermission(role, 'manage-roles')` — non-Admins get `notFound()`, not just a hidden nav link (FR-004) (depends on T012)
- [ ] T015 [US1] Make test T013 pass; walk quickstart Scenario A (all 5 personas' allowed/disallowed actions, a direct-call refusal above role, and an Admin role-override taking effect on the target user's next action without re-login)

**Checkpoint**: Role model fully enforced and Admin-manageable — MVP

---

## Phase 4: User Story 2 - Governance metadata & KI-Hub-managed lifecycle (Priority: P2)

**Goal**: A governance record (owners, risk, notes, recommended/featured, KI-Hub-managed lifecycle) persists per artifact; only valid role-permitted lifecycle transitions succeed; the catalog listing/detail show lifecycle + approved/recommended state; re-indexing never touches governance data.

**Independent Test**: quickstart Scenario B.

### Tests for User Story 2 (constitution-mandated) ⚠️ write first, ensure they FAIL

- [ ] T016 [US2] `packages/governance-core/tests/lifecycle.test.ts`: the full transition matrix — valid linear steps, Deprecated/Archived from any state, correct role gating per transition, invalid transitions rejected with a reason
- [ ] T017 [US2] Integration test `apps/web/tests/integration/reindex-preserves.test.ts`: create a `catalog-entries` doc for an already-indexed artifact, re-run the Phase 2 indexer (`@kihub/discovery-core` reconcile), assert the governance doc is unchanged (FR-010, SC-003)

### Implementation for User Story 2

- [ ] T018 [US2] Implement `getGovernance(artifactId)` and `updateGovernanceMetadata(artifactId, patch, actor)` in `apps/web/src/lib/governance.ts` (lazy in-memory default per research.md §6 when no `catalog-entries` doc exists yet; Payload Local API calls otherwise) (depends on T007, T011)
- [ ] T019 [US2] Implement `submitForReview(artifactId, actor)` and `transitionLifecycle(artifactId, to, actor)` in `apps/web/src/lib/governance.ts` (depends on T018)
- [ ] T020 [P] [US2] Build `LifecycleBadge` in `apps/web/src/components/LifecycleBadge.tsx` (Designsystemet tag: lifecycle state + a recommended/approved indicator)
- [ ] T021 [P] [US2] Build the metadata + transition-actions portion of `GovernancePanel` in `apps/web/src/components/GovernancePanel.tsx` (owner/risk/notes editing for Contributor+; submit/transition buttons rendered per `hasPermission` and calling the T018/T019 server actions)
- [ ] T022 [US2] Wire `LifecycleBadge` into the listing (`apps/web/src/app/(app)/page.tsx` / `apps/web/src/components/ArtifactCard.tsx`) and into the detail page alongside `GovernancePanel` (`apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx`) (depends on T020, T021)
- [ ] T023 [US2] Make tests T016–T017 pass; walk quickstart Scenario B (ungoverned-artifact default with no error, metadata edit + attribution, a full valid transition path, an invalid/unauthorized transition refusal, re-index preservation)

**Checkpoint**: Governance metadata + lifecycle fully functional and visible in the catalog — US1 + US2 independently functional

---

## Phase 5: User Story 3 - Structured typed reviews & approval workflow (Priority: P3)

**Goal**: Submit for review → Reviewers record typed reviews → an Approver approves/rejects (advisory with respect to review completeness) → expired reviews are flagged; every step is attributed and auditable.

**Independent Test**: quickstart Scenario C.

### Tests for User Story 3 (constitution-mandated) ⚠️ write first, ensure they FAIL

- [ ] T024 [P] [US3] `packages/governance-core/tests/review.test.ts`: `isExpired` against past/future/boundary expiry dates
- [ ] T025 [US3] Integration test `apps/web/tests/integration/review-approval-flow.test.ts`: submit for review → record a typed review → approve, asserting `approvalState`, attribution, and one `audit-log` entry per step; also cover a reject path, an approval *despite* a changes-requested/rejected typed review (proves the advisory, non-blocking policy — FR-017), and a Reader attempting record/approve (refused) (FR-013–FR-020, SC-006–SC-008)

### Implementation for User Story 3

- [ ] T026 [US3] Implement `recordReview(artifactId, input, actor)` and `decideApproval(artifactId, decision, actor)` in `apps/web/src/lib/governance.ts` (approval is advisory re: typed reviews, per Clarifications) (depends on T018)
- [ ] T027 [P] [US3] Build `ReviewForm` in `apps/web/src/components/ReviewForm.tsx` (Designsystemet form: type, decision, comments, required changes, risk level, expiry date)
- [ ] T028 [US3] Extend `GovernancePanel` (`apps/web/src/components/GovernancePanel.tsx`) with the review history (type/reviewer/decision/expiry — expired ones flagged via `isExpired`), the audit history (queries `audit-log` by artifact, newest first), and approve/reject controls for Approver+ (depends on T026, T027)
- [ ] T029 [US3] Make tests T024–T025 pass; walk quickstart Scenario C (submit, typed review, approve, reject, expired-review flag, Reader refusal)

**Checkpoint**: All three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Update root `README.md` (and Phase 3 quickstart refs) with the role-admin route and the extended mock personas
- [ ] T031 [P] Constitution self-check: inspect the `catalog_entries`/`reviews`/`audit_log` tables to confirm only enterprise-context fields are stored (no artifact content); confirm all new UI imports only Designsystemet
- [ ] T032 Run full quickstart Scenarios A–C and the complete test suite (web + governance-core + discovery-core + artifact-schema) green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps
- **Foundational (Phase 2)**: after Setup — BLOCKS all stories (collections + governance-core)
- **US1 (P1)**: after Foundational — proves the access-control layer + role admin (MVP)
- **US2 (P2)**: after Foundational; independent of US1's UI but relies on the same access-controlled `catalog-entries` collection
- **US3 (P3)**: after Foundational and after US2 lands `lib/governance.ts`'s shared helpers (T018); independent of US1's UI
- **Polish (Phase 6)**: after the desired stories

### User Story Dependencies

- **US1** proves the permission/role foundation is correctly enforced everywhere; **US2** and **US3**
  both build on the same collections and `lib/governance.ts`, but US3's implementation tasks depend
  on `getGovernance` (T018, landed in US2) rather than on any US1 UI.

### Within Each Story

- Tests (where present) before implementation
- Pure logic (`governance-core`) before collection hooks; collections before `lib/governance.ts`; server actions before the UI components that call them

### Parallel Opportunities

- Setup: T002, T003 in parallel
- Foundational: T004, T005, T006 in parallel; then T007, T008, T009 in parallel; T012 in parallel with those
- US1: only T013 then T014 (small story, little parallelism)
- US2: T020, T021 in parallel (after T018/T019 land)
- US3: T024, T027 in parallel
- With capacity, once Foundational lands, US1 and the test-writing halves of US2/US3 can proceed in parallel by different developers

---

## Parallel Example: Foundational

```bash
# Pure logic first (parallel):
Task: "hasPermission in packages/governance-core/src/roles.ts"
Task: "canTransition in packages/governance-core/src/lifecycle.ts"
Task: "REVIEW_TYPES + isExpired in packages/governance-core/src/review.ts"

# Then collections (parallel):
Task: "catalog-entries collection in apps/web/src/collections/CatalogEntry.ts"
Task: "reviews collection in apps/web/src/collections/Review.ts"
Task: "audit-log collection in apps/web/src/collections/AuditLog.ts"
```

---

## Implementation Strategy

### MVP First (US1)

Setup → Foundational → US1 → **STOP & VALIDATE** quickstart Scenario A (role-gated access proven
server-side, Admin can manage roles). This is the governance foundation every later action relies on.

### Incremental Delivery

Setup + Foundational → US1 (roles) → US2 (metadata + lifecycle) → US3 (reviews + approval). Each
is independently testable and adds value without breaking the previous.

### Parallel Team Strategy

After Foundational lands the collections + governance-core, Dev A → US1 (role admin + access
tests), Dev B → US2 (metadata/lifecycle UI), Dev C → US3 (reviews/approval UI, once T018 from US2
is available); they share only `lib/governance.ts` and the three new collections.

---

## Notes

- [P] = different files, no incomplete deps
- Reuses the Phase 1 `Users.role` field — no schema change to `Users` beyond access control
- `catalog-entries`/`reviews`/`audit-log` are separate collections from Phase 2's `Artifact`; the
  indexer (`@kihub/discovery-core`) is never modified, so re-indexing cannot regress governance
  state by construction
- No automated discovery triggers (Phase 4) and no semantic search (Phase 5) this phase
- Postgres is available locally from Phase 1 (Docker, host port 55432)
- Commit after each task or logical group; stop at any checkpoint to validate a story
