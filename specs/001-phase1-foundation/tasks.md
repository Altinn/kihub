---
description: "Task list for Phase 1 Foundation implementation"
---

# Tasks: Phase 1 Foundation

**Input**: Design documents from `/specs/001-phase1-foundation/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution mandates them — manifest schema validation and
auth/employee-gating logic MUST have automated tests. Live Entra ID sign-in is validated manually
via quickstart (not automated this phase).

**Organization**: Grouped by user story (US1=P1 auth shell, US2=P2 manifest schema, US3=P3 seeded
examples) so each is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 / US3 (setup, foundational, and polish tasks carry no story label)
- All paths are relative to the `kihub` repo root unless noted as `ai-artifacts` (separate repo)

## Path Conventions

Monorepo (pnpm workspace): app in `apps/web/`, shared contract in `packages/artifact-schema/`.
Content lives only in the sibling `ai-artifacts` repository.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the monorepo and the app skeleton

- [ ] T001 Create pnpm workspace at repo root: `pnpm-workspace.yaml` (globs `apps/*`, `packages/*`) and root `package.json` (private, engines: node 22)
- [ ] T002 [P] Add shared TypeScript config `tsconfig.base.json` at repo root
- [ ] T003 [P] Configure ESLint + Prettier at repo root (`.eslintrc`, `.prettierrc`)
- [ ] T004 [P] Add root `.gitignore` (node_modules, .env*, .next, dist, coverage)
- [ ] T005 Scaffold Next.js 15 (App Router, TypeScript) app in `apps/web/`
- [ ] T006 [P] Add local PostgreSQL 16 service in `apps/web/docker-compose.yml`
- [ ] T007 [P] Add `apps/web/.env.example` with `DATABASE_URI`, `AUTH_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET`, `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
- [ ] T008 [P] Configure Vitest in `apps/web` (test + coverage scripts) and root `test` script wiring pnpm filters

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The app must boot, connect to Postgres, embed Payload, and render a Designsystemet-styled skeleton before any story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Install Payload CMS 3.x + `@payloadcms/db-postgres` in `apps/web`
- [ ] T010 Create `apps/web/src/payload.config.ts` with `postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })` and a minimal boot config (no content collections)
- [ ] T011 Wire Payload into the App Router (`apps/web/src/app/(payload)/` admin route group) and verify the app + Payload boot against local Postgres (`pnpm --filter web dev`)
- [ ] T012 [P] Install Designsystemet packages in `apps/web`: `@digdir/designsystemet-react`, `@digdir/designsystemet-css`, dev `@digdir/designsystemet`, `@digdir/designsystemet-types`
- [ ] T013 Generate/build the theme via `@digdir/designsystemet` CLI (`apps/web/designsystemet.config.json`) — Digdir default theme
- [ ] T014 Create root layout `apps/web/src/app/layout.tsx` importing `@digdir/designsystemet-css` + theme CSS and setting `data-color-scheme="light"` / `data-size="md"` on `<html>` (depends on T012, T013)

**Checkpoint**: App boots, DB connects, Payload admin reachable, styled skeleton renders

---

## Phase 3: User Story 1 - Employee signs in and reaches the catalog shell (Priority: P1) 🎯 MVP

**Goal**: Employees-only Entra ID sign-in landing on a working-but-empty, Designsystemet catalog shell with identity + sign-out; guests/foreign tenants and unauthenticated users are blocked.

**Independent Test**: Run quickstart Scenario A — unauthenticated is redirected; employee reaches the empty-state shell with identity + sign-out; guest is denied.

### Tests for User Story 1 (constitution-mandated: gating logic) ⚠️ write first, ensure they FAIL

- [ ] T015 [P] [US1] Unit tests for `employeeGate` (member→allow; guest→deny; foreign-tenant→deny; missing oid/email→deny) in `apps/web/tests/unit/employee-gate.test.ts`
- [ ] T016 [P] [US1] Integration test: protected route redirects unauthenticated and denies non-employee (mocked identities) in `apps/web/tests/integration/route-protection.test.ts`

### Implementation for User Story 1

- [ ] T017 [P] [US1] Configure Auth.js v5 Microsoft Entra ID provider (single-tenant, scopes `openid profile email`) in `apps/web/src/auth/entra.ts` + route handler `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- [ ] T018 [P] [US1] Implement `employeeGate(claims)` (home-tenant member only, guests/foreign denied) in `apps/web/src/auth/employee-gate.ts` per contracts/auth-gating.md
- [ ] T019 [US1] Create Payload `Users` collection (`entraOid` unique+indexed, `email` unique, `name`, `tenantId`, `role` default `reader`, `lastLoginAt`), disable local email/password strategy, in `apps/web/src/collections/Users.ts`; register in `apps/web/src/payload.config.ts` (depends on T010)
- [ ] T020 [US1] Implement Payload custom auth strategy bridging Auth.js session → `employeeGate` → upsert `Users` by `entraOid`, in `apps/web/src/auth/payload-strategy.ts` (depends on T017, T018, T019)
- [ ] T021 [US1] Protect application routes — redirect unauthenticated to sign-in, deny non-employees — via `apps/web/src/middleware.ts` and/or `apps/web/src/app/(app)/layout.tsx` (depends on T020)
- [ ] T022 [US1] Build catalog shell `apps/web/src/app/(app)/page.tsx` using Designsystemet components: intentional empty state, signed-in identity display, sign-out action (depends on T014, T021)
- [ ] T023 [US1] Make tests T015–T016 pass and walk quickstart Scenario A end-to-end with a real employee + a guest account

**Checkpoint**: US1 fully functional and independently testable — this is the MVP

---

## Phase 4: User Story 2 - Standard artifact manifest schema is defined (Priority: P2)

**Goal**: A versioned, machine-readable `artifact.yaml` schema (generic `type`, reverse-DNS `org.slug` ID, required/optional fields, enumerated types/lifecycle/visibility) plus human-readable docs and on-demand validation.

**Independent Test**: Run quickstart Scenario B — valid manifests pass; bad ID / unknown type / missing field fail with clear errors; JSON Schema contract + docs exist.

### Tests for User Story 2 (constitution-mandated: schema validation) ⚠️ write first, ensure they FAIL

- [ ] T024 [P] [US2] Schema validation tests — valid fixtures pass; invalid (non-reverse-DNS `id`, unknown `type`, missing required field, bad `version`) fail with identifiable errors — in `packages/artifact-schema/tests/schema.test.ts`

### Implementation for User Story 2

- [ ] T025 [US2] Initialize `packages/artifact-schema` package (`package.json` name `@kihub/artifact-schema`, `tsconfig.json`, deps `zod` + `yaml`)
- [ ] T026 [P] [US2] Author the Zod schema (id reverse-DNS regex, `type` enum, `name`, semver `version`, `description`, `owner{team,contact}`, `source{provider,repository,path}`, optional `install.apm.package`, `tags`, `visibility` enum, `lifecycle.status` enum, optional `schemaVersion`) in `packages/artifact-schema/src/schema.ts` per data-model.md
- [ ] T027 [US2] Implement `validate(fileContents)` — parse YAML then validate → `{ valid, errors }` — in `packages/artifact-schema/src/validate.ts` and re-export from `src/index.ts` (depends on T026)
- [ ] T028 [P] [US2] Export the generated JSON Schema contract to `packages/artifact-schema/schema/artifact.schema.json`, matching `specs/001-phase1-foundation/contracts/artifact.schema.json` (depends on T026)
- [ ] T029 [P] [US2] Write human-readable field documentation in `packages/artifact-schema/docs/artifact-manifest.md`
- [ ] T030 [US2] Implement on-demand validation CLI `packages/artifact-schema/scripts/validate-file.ts` and expose a package `bin`/`validate` script (depends on T027)
- [ ] T031 [US2] Make test T024 pass and walk quickstart Scenario B

**Checkpoint**: US1 and US2 both independently functional

---

## Phase 5: User Story 3 - Example artifacts seeded in the ai-artifacts repository (Priority: P3)

**Goal**: A separate `ai-artifacts` repo seeded with 2–3 schema-conforming example artifacts of ≥2 types; the `kihub` platform repo stays free of real artifact content.

**Independent Test**: Run quickstart Scenario C — clone `ai-artifacts`, validate all manifests (all pass, ≥2 types), and confirm `kihub` has zero artifact content.

### Implementation for User Story 3

- [ ] T032 [US3] Create the `ai-artifacts` repository structure (repo `README.md`, folders `skills/`, `prompts/`, `mcp/`) — separate repo (depends on T027 for the validator)
- [ ] T033 [P] [US3] Seed example artifact #1 — a **skill**: `ai-artifacts/skills/<name>/artifact.yaml` (+ `README.md`, `examples/`) conforming to the schema
- [ ] T034 [P] [US3] Seed example artifact #2 — a **prompt** pack: `ai-artifacts/prompts/<name>/artifact.yaml` (+ `README.md`)
- [ ] T035 [P] [US3] Seed example artifact #3 — an **mcp** server: `ai-artifacts/mcp/<name>/artifact.yaml` (+ `README.md`) — guarantees ≥2 distinct types
- [ ] T036 [US3] Validate all seeded manifests with `@kihub/artifact-schema` CLI; confirm 100% pass and ≥2 types represented (depends on T030, T033, T034, T035)
- [ ] T037 [US3] Verify the `kihub` repo contains zero real artifact content (no skill/prompt/workflow/MCP bodies) — FR-017 / SC-007

**Checkpoint**: All three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T038 [P] Write `kihub` root `README.md` (setup, run, test) referencing quickstart.md
- [ ] T039 [P] Add root convenience scripts (`dev`, `test`, `lint`) documenting pnpm `--filter` usage
- [ ] T040 Run the full quickstart.md validation (Scenarios A–C) and all automated tests green
- [ ] T041 [P] Constitution compliance self-check: confirm zero artifact content in platform repo and all UI built from Designsystemet

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: all depend on Foundational
  - US1 (P1) is independent of US2/US3
  - US2 (P2) is independent of US1
  - US3 (P3) depends on US2 (needs the schema/validator: T027/T030)
- **Polish (Phase 6)**: depends on the desired stories being complete

### User Story Dependencies

- **US1 (P1)**: after Foundational — no dependency on other stories (MVP)
- **US2 (P2)**: after Foundational — no dependency on other stories
- **US3 (P3)**: after Foundational — depends on US2 (schema + CLI)

### Within Each Story

- Tests (where present) written and failing before implementation
- Models/collections before services/strategies; strategies before route protection; route protection before the shell page

### Parallel Opportunities

- Setup: T002, T003, T004 in parallel; T006, T007, T008 in parallel
- Foundational: T012 parallel with T009/T010 work; T013 after T012
- US1: T015 + T016 (tests) in parallel; then T017 + T018 in parallel
- US2: T026, T028, T029 in parallel after T025
- US3: T033, T034, T035 in parallel after T032
- With capacity, US1 and US2 can be built in parallel by different developers; US3 starts once US2's schema/CLI exist

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
Task: "Unit tests for employeeGate in apps/web/tests/unit/employee-gate.test.ts"
Task: "Integration test for route protection in apps/web/tests/integration/route-protection.test.ts"

# Then independent implementation files (parallel):
Task: "Auth.js Entra provider + route handler in apps/web/src/auth/entra.ts"
Task: "employeeGate in apps/web/src/auth/employee-gate.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** quickstart Scenario A → demo the authenticated empty shell.

### Incremental Delivery

Setup + Foundational → US1 (MVP: auth + shell) → US2 (schema contract) → US3 (seeded examples). Each increment is independently testable and adds value without breaking the previous.

### Parallel Team Strategy

After Foundational: Dev A → US1, Dev B → US2; once US2's schema/CLI land, Dev C → US3.

---

## Notes

- [P] = different files, no incomplete dependencies
- Live Entra ID sign-in is validated manually (quickstart Scenario A), not automated this phase (research.md §6)
- Azure deployment is explicitly out of scope — Phase 1 "done" is local (FR-019)
- Commit after each task or logical group; stop at any checkpoint to validate a story independently
