---
description: "Task list for Phase 6 — Editor Back-Office implementation"
---

# Tasks: Phase 6 — Editor Back-Office

**Input**: Design documents from `/specs/006-editor-backoffice/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution's testing gate applies — the admin-panel entry gate has a
unit test, and the read-only matrix has a Payload integration test. The Payload admin UI itself is a
vendor React SPA and is validated via quickstart, not unit tests.

**Organization**: By user story — US1=P1 administer platform data, US2=P2 role-gated & read-only,
US3=P3 two surfaces coexist. Builds on Phases 1-5. **No new collection, field, datastore, or
dependency.** The Auth.js→Payload session bridge (`auth/payload-strategy.ts`) and every collection's
existing `access` rules are reused **unchanged**; the only net-new code is the `(payload)` route
group (boilerplate), the `routes` config, and one `Users.access.admin` gate.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: all Phase 6 code lives in `apps/web/`. Employee app stays under `app/(app)/`; the new
back-office lives under a new `app/(payload)/` route group. `packages/*` unchanged.

---

## Phase 1: Setup

- [ ] T001 [P] In `apps/web/src/payload.config.ts` add `routes: { admin: '/cms', api: '/payload-api' }` (keep `admin.user: Users.slug`), per contracts/admin-mount.md — the non-colliding base paths for the back-office UI and Payload API; confirm no new dependency is required (`@payloadcms/next` + `withPayload` are already wired)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Mount the Payload admin as a working, gated surface. Nothing in the user stories can be
exercised until the `(payload)` route group exists and entry is gated.

**⚠️ CRITICAL**: Blocks all user stories

- [ ] T002 Scaffold the `apps/web/src/app/(payload)/` route group per contracts/admin-mount.md, aligned to the `/cms` + `/payload-api` routes: `layout.tsx` (re-export `RootLayout` from `@payloadcms/next/layouts` + config + importMap), `cms/[[...segments]]/page.tsx` + `not-found.tsx` (`RootPage`/`NotFoundPage` from `@payloadcms/next/views`), `payload-api/[...slug]/route.ts`, `payload-api/graphql/route.ts`, `payload-api/graphql-playground/route.ts` (handlers from `@payloadcms/next/routes`), optional `custom.scss` — thin re-exports, no bespoke React (depends on T001)
- [ ] T003 Generate the admin import map (`pnpm --filter web generate:importmap`) and ensure `apps/web/src/app/(payload)/importMap.js` is wired into `(payload)/layout.tsx` so the admin bundle builds (depends on T002)
- [ ] T004 Add `access.admin` to `apps/web/src/collections/Users.ts` per contracts/admin-access.md: `({ req }) => Boolean(req.user) && (req.user.role as Role) !== 'reader'` — the server-side Contributor+ admin-panel entry gate (import `Role` from `@kihub/governance-core`); no other Users change

**Checkpoint**: Payload admin loads at `/cms`, gated to Contributor+; triggers/stories can be exercised

---

## Phase 3: User Story 1 - Administer platform data in the back-office (Priority: P1) 🎯 MVP

**Goal**: An authorized editor/admin signs in, sees the existing collections, and edits the ones
their role permits — over the existing data, no migration.

**Independent Test**: As a Contributor+ persona, open `/cms`, confirm the collections list, open a
`catalog-entries` record, edit a field, save, and see the change reflected in the employee app.

### Implementation for User Story 1

- [ ] T005 [US1] Verify the mounted admin lists all seven collections and that the editable ones (`catalog-entries`, `reviews`, `discovery-sources`, `users`) open and save per role; only where a collection lacks sensible admin presentation, set `admin.useAsTitle`/`admin.defaultColumns` in that collection file (no `access` changes) — most already have these from Phases 2-4
- [ ] T006 [US1] Run quickstart.md Scenario 1 end-to-end: a Contributor+ persona edits a `catalog-entries` record in `/cms` and the change appears on the employee-app artifact detail page (one data layer, FR-004)

**Checkpoint**: US1 functional — authorized editors administer platform data; deployable MVP

---

## Phase 4: User Story 2 - Access is role-gated and safe (Priority: P2)

**Goal**: Only Contributor+ may enter; Reader/anonymous are refused; each role does only what it may;
Git-derived/system collections are read-only — all enforced server-side.

**Independent Test**: Attempt `/cms` as anonymous and as Reader (both refused); as an editor/admin
confirm only permitted actions; confirm `artifacts`/`discovery-runs`/`audit-log` are read-only.

### Tests for User Story 2 ⚠️

- [ ] T007 [P] [US2] Unit test `apps/web/tests/unit/admin-access.test.ts` (write first, must fail): the `Users.access.admin` predicate returns true for `contributor|reviewer|approver|admin` and false for `reader` and for no user (FR-005)
- [ ] T008 [P] [US2] Integration test `apps/web/tests/integration/admin-readonly.test.ts` (write first, must fail): with an Admin `req.user`, create/update on `artifacts`, `discovery-runs`, and `audit-log` are rejected (read-only), while a permitted write to `catalog-entries`/`reviews`/`discovery-sources` succeeds — proving the read-only matrix holds via existing `access` (FR-006a, Principle I)

### Implementation / Verification for User Story 2

- [ ] T009 [US2] Confirm the gate + read-only behavior in the running admin via quickstart.md Scenarios 2 & 3: Reader/anonymous refused at `/cms`; `artifacts`/`discovery-runs`/`audit-log` render read-only; `discovery-sources` secret/token material not shown (no code beyond T004 expected — this validates server-side enforcement, FR-007)

**Checkpoint**: US1 + US2 — the back-office is safe: right people in, right actions only, no drift of Git-derived data

---

## Phase 5: User Story 3 - Two surfaces coexist cleanly (Priority: P3)

**Goal**: The employee app and its routes are unaffected; both surfaces share one session/role; the
back-office lives at its own path with no collision.

**Independent Test**: With `/cms` mounted, exercise the employee app (catalog, search, detail,
`/admin/roles`, `/admin/discovery`) and the app APIs; sign in once and confirm the identity/role on
both surfaces.

### Tests for User Story 3 ⚠️

- [ ] T010 [US3] Confirm no regression: run the existing suites (`route-protection`, `governance-access`, `discovery-*`, `search`) — all green — proving the `(payload)` mount did not break the employee app or the `/api/auth`,`/api/discovery` handlers (Payload API is at `/payload-api`)

### Verification for User Story 3

- [ ] T011 [P] [US3] Run quickstart.md Scenario 4: `/`, `/artifacts/*`, `/admin/roles`, `/admin/discovery`, `/signin` all load unchanged; `/api/auth/*` and `/api/discovery/*` still respond; a single sign-in is recognized on both the employee app and `/cms` (one session/role, FR-010)

**Checkpoint**: Both surfaces live and non-interfering — Principle VIII realised

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T012 [P] Update `README.md`: document the editor back-office at `/cms` (Payload admin, Contributor+, Design System exemption per Principle VIII, Git-derived collections read-only) and that News/Events collections + admin customization are deferred to later phases
- [ ] T013 Workspace typecheck + lint (`tsc --noEmit` + linter across `apps/web`) and the full `pnpm --filter web test` suite green, confirming the mount + gate added no type/lint errors and no regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 (routes config) — start immediately.
- **Foundational (Phase 2)**: T002→T003 (mount + import map) and T004 (gate) depend on T001; **BLOCKS all user stories**.
- **User Stories (Phase 3-5)**: depend on Foundational (the mounted, gated admin).
  - US1 is largely delivered by the mount + gate (verification + presentation polish).
  - US2 proves the gate + read-only (tests + verification); its gate code is in Foundational (T004).
  - US3 proves coexistence (regression suite + quickstart).
- **Polish (Phase 6)**: after the stories.

### User Story Dependencies

- **US1 (P1)**: mounted admin (T002/T003) + gate (T004) → authorized editing. MVP.
- **US2 (P2)**: builds on the same gate/access; adds the failing-first tests and denial/read-only verification.
- **US3 (P3)**: builds on the mount; verifies the employee app is unaffected.

### Within Each User Story

- Tests (US2) written first and failing before relying on them.
- The gate (T004) and mount (T002/T003) are the shared prerequisites.

### Parallel Opportunities

- Setup: T001 alone.
- Foundational: T002→T003 sequential (import map needs the group); T004 ∥ T002 (different file: `Users.ts`).
- US2 tests: T007 ∥ T008 (different files).
- US3: T011 ∥ after T010.
- Polish: T012 ∥ T013 (T013 last, once code is final).

---

## Parallel Example: Foundational

```bash
# After T001 (routes config):
Task: "Scaffold (payload) route group in apps/web/src/app/(payload)/"      # T002 → T003
Task: "Add Users.access.admin gate in apps/web/src/collections/Users.ts"    # T004 (parallel, different file)
```

## Parallel Example: User Story 2 tests

```bash
Task: "Unit test the access.admin gate in apps/web/tests/unit/admin-access.test.ts"          # T007
Task: "Integration test the read-only matrix in apps/web/tests/integration/admin-readonly.test.ts"  # T008
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup (T001) → 2. Phase 2 Foundational (T002-T004: mount + import map + gate) → 3. Phase 3
   US1 (verify + Scenario 1) → 4. **STOP & VALIDATE**: a Contributor+ can administer platform data at
   `/cms` and Readers can't reach it. Deploy/demo (MVP).

### Incremental Delivery

1. Setup + Foundational → admin mounted at `/cms`, gated to Contributor+.
2. US1 → editors administer existing data (MVP).
3. US2 → gate + read-only proven safe (tests + verification).
4. US3 → coexistence with the employee app verified (no regression).
5. Polish → docs, typecheck/lint, full suite.

---

## Notes

- [P] = different files, no incomplete dependencies.
- Reuse is deliberate: the Auth.js→Payload bridge (`auth/payload-strategy.ts`) and all collection
  `access` rules are **unchanged**; net-new code is the `(payload)` boilerplate, the `routes` config,
  and one `Users.access.admin` gate.
- Read-only for Git-derived collections (`artifacts`, `discovery-runs`, `audit-log`) is already true
  via existing `access` — T008 verifies it, it is not reimplemented (Principle I).
- No new collection/field/migration/datastore/dependency; News/Events + admin customization deferred.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
