---
description: "Task list for Phase 2 — Catalog implementation"
---

# Tasks: Phase 2 — Catalog

**Input**: Design documents from `/specs/002-catalog/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution mandates them — discovery/validation/reconcile logic,
install-command derivation, and the Payload write path have automated tests. Catalog UI is verified
via quickstart.

**Organization**: By user story — US1=P1 indexing, US2=P2 browse/filter, US3=P3 detail. Builds on
the Phase 1 foundation (auth shell, `@kihub/artifact-schema`, Payload/Postgres).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: app in `apps/web/`, new indexing core in `packages/discovery-core/`, reused schema in
`packages/artifact-schema/`. Content is read from a local `ai-artifacts` checkout (`AI_ARTIFACTS_PATH`).

---

## Phase 1: Setup

- [ ] T001 Initialize `packages/discovery-core` (`package.json` name `@kihub/discovery-core`, `type: module`, `tsconfig.json`, dep `@kihub/artifact-schema` (workspace), dev `vitest`; `test` script)
- [ ] T002 [P] Add `react-markdown` + `remark-gfm` to `apps/web` dependencies
- [ ] T003 [P] Add `AI_ARTIFACTS_PATH` (e.g. `../ai-artifacts`) to `apps/web/.env.example` with a comment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The `Artifact` collection and catalog query helpers must exist before indexing writes or UI reads

**⚠️ CRITICAL**: Blocks all user stories

- [ ] T004 Create the `Artifact` Payload collection in `apps/web/src/collections/Artifact.ts` per data-model.md (fields: `artifactId` unique+indexed, `type`, `name`, `description`, `version`, `source` group, `installCommand`, `readme`, `tags`, `visibility`, `lifecycleStatus`, `active` default true, `lastIndexedAt`; read=authenticated, write=server-side only)
- [ ] T005 Register `Artifact` in `apps/web/src/payload.config.ts` collections
- [ ] T006 [P] Implement catalog query helpers in `apps/web/src/lib/catalog.ts`: `listArtifacts(filters)` (always `active=true`; optional type/tag/category) and `getArtifact(artifactId)` via the Payload Local API

**Checkpoint**: Collection exists and is queryable; indexing and UI can build on it

---

## Phase 3: User Story 1 - Index artifacts from the content repository (Priority: P1) 🎯 MVP

**Goal**: A maintainer-run CLI indexes the local `ai-artifacts` checkout into the `Artifact` collection, reconciling add/update/deactivate with duplicate + invalid reporting.

**Independent Test**: Run the indexer against the seeded repo → one record per artifact with correct metadata; re-run after edit/add/remove → updates in place, no duplicates, removed one deactivated; invalid manifest skipped+reported. (quickstart Scenario A)

### Tests for User Story 1 (constitution-mandated) ⚠️ write first, ensure they FAIL

- [ ] T007 [P] [US1] `scan()` tests in `packages/discovery-core/tests/scan.test.ts`: valid artifact, invalid/unparseable manifest (→ `valid:false`+errors), missing README (still valid), non-artifact folder ignored
- [ ] T008 [P] [US1] `buildRecord()` tests in `packages/discovery-core/tests/record.test.ts`: install-command derivation (`apm install <pkg>`; empty when no `install.apm`), full field mapping
- [ ] T009 [P] [US1] `reconcile()` unit tests in `packages/discovery-core/tests/reconcile.test.ts` with a fake payload: create, update-in-place, deactivate-missing, duplicate-id detection, invalid pass-through
- [ ] T010 [US1] Integration test in `apps/web/tests/integration/reconcile.test.ts` against live Payload+Postgres: first run creates N; re-run updates in place (no duplicate); removing an input deactivates it; stored record holds only metadata (no body)

### Implementation for User Story 1

- [ ] T011 [P] [US1] Implement `scan(rootPath)` in `packages/discovery-core/src/scan.ts` — walk type dirs, read `artifact.yaml`+`README.md`, validate via `@kihub/artifact-schema` → `RawArtifact[]` per contracts/indexer.md
- [ ] T012 [P] [US1] Implement `buildRecord(manifest, readme?)` in `packages/discovery-core/src/record.ts` — map to the `Artifact` shape + derive install command
- [ ] T013 [US1] Implement `reconcile(payload, records)` in `packages/discovery-core/src/reconcile.ts` (upsert by `artifactId`, soft-deactivate missing, duplicate detection, `IndexReport`) and re-export from `src/index.ts` (depends on T011, T012)
- [ ] T014 [US1] Implement the CLI `apps/web/scripts/index-artifacts.ts` (resolve `AI_ARTIFACTS_PATH`, `scan` → `getPayload({ config })` → `reconcile`, print report, exit codes 0/1/2) and add an `index` script to `apps/web/package.json` (depends on T013, T004, T005)
- [ ] T015 [US1] Run the indexer against the seeded `ai-artifacts`; make tests T007–T010 pass; walk quickstart Scenario A (create → edit/add/remove re-run)

**Checkpoint**: Catalog is populated and reconciles correctly — MVP data layer

---

## Phase 4: User Story 2 - Browse and filter the catalog (Priority: P2)

**Goal**: Authenticated employees see a listing of active artifacts and filter by type, tag, and category (type-derived), combinable, with an empty state.

**Independent Test**: With data indexed, load the listing (all active shown); apply type/tag/category filters individually and combined; no-match shows empty state; unauthenticated redirected. (quickstart Scenario B)

### Tests for User Story 2 (filter correctness — SC-007) ⚠️ write first

- [ ] T015b [US2] Integration test for `listArtifacts` in `apps/web/tests/integration/catalog-filters.test.ts` against live Payload: seed a small set, then assert type / tag / category / combined (AND) filters return exactly the matching artifacts, and that inactive (`active=false`) records are excluded (SC-007, FR-010–014)

### Implementation for User Story 2

- [ ] T016 [P] [US2] Build `ArtifactCard` in `apps/web/src/components/ArtifactCard.tsx` (Designsystemet Card: name, type, description, key tags; links to detail)
- [ ] T017 [P] [US2] Build `CatalogFilters` in `apps/web/src/components/CatalogFilters.tsx` (Designsystemet controls for type/tag/category; URL-param driven)
- [ ] T018 [US2] Replace the Phase 1 shell with the catalog listing in `apps/web/src/app/(app)/page.tsx`: read `?type/tag/category`, call `listArtifacts` (active only, AND-combined), render cards (depends on T006, T016, T017)
- [ ] T019 [US2] Add the intentional empty state (no artifacts / no matches) to the listing and confirm the Phase 1 auth guard still applies (depends on T018)
- [ ] T020 [US2] Make test T015b pass and walk quickstart Scenario B (filters individually + combined, empty state, unauthenticated redirect)

**Checkpoint**: Discovery works — US1 + US2 independently functional

---

## Phase 5: User Story 3 - View an artifact's detail page (Priority: P3)

**Goal**: An employee opens an artifact to see full metadata, a rendered README, the current version, and a copyable install command; unknown ids show not-found.

**Independent Test**: Open a known artifact's detail → metadata + README + version + copyable install command; open an unknown id → not-found state. (quickstart Scenario C)

### Implementation for User Story 3

- [ ] T021 [P] [US3] Build `Markdown` renderer in `apps/web/src/components/Markdown.tsx` (react-markdown + remark-gfm, no raw HTML, styled with Designsystemet typography)
- [ ] T022 [P] [US3] Build `CopyButton` client component in `apps/web/src/components/CopyButton.tsx` (copies the install command)
- [ ] T023 [US3] Build the detail page `apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx`: fetch via `getArtifact`, show identity/type/owner/tags/visibility/lifecycle + version + install command (CopyButton) + README (Markdown); `notFound()` for unknown/inactive id (depends on T006, T021, T022)
- [ ] T024 [US3] Walk quickstart Scenario C (detail render + copy + not-found)

**Checkpoint**: All three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T025 [P] Update root `README.md` (and Phase 2 quickstart refs) with the indexing step and `AI_ARTIFACTS_PATH`
- [ ] T026 [P] Constitution self-check: inspect the `artifacts` table to confirm only metadata + README snapshot are stored (no bodies); confirm catalog UI imports only Designsystemet (+ react-markdown renderer)
- [ ] T027 Run full quickstart Scenarios A–C and the complete test suite (web + discovery-core + artifact-schema) green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no deps
- **Foundational (Phase 2)**: after Setup — BLOCKS all stories (collection + query helpers)
- **US1 (P1)**: after Foundational — populates the catalog (data layer; MVP)
- **US2 (P2)**: after Foundational; needs indexed data (US1) to be meaningful, but the listing code is independent of US3
- **US3 (P3)**: after Foundational; needs indexed data (US1); independent of US2
- **Polish (Phase 6)**: after the desired stories

### User Story Dependencies

- **US1** is the data foundation; **US2** and **US3** both consume the indexed `Artifact` data and the `catalog.ts` helpers, but do not depend on each other.

### Within Each Story

- Tests (where present) before implementation
- Collection/query helpers before UI; components before the page that composes them

### Parallel Opportunities

- Setup: T002, T003 in parallel
- US1 tests: T007, T008, T009 in parallel; then impl T011, T012 in parallel before T013
- US2: T016, T017 in parallel before T018
- US3: T021, T022 in parallel before T023
- With capacity, once US1 lands, US2 and US3 can be built in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Tests first (parallel):
Task: "scan() tests in packages/discovery-core/tests/scan.test.ts"
Task: "buildRecord() tests in packages/discovery-core/tests/record.test.ts"
Task: "reconcile() unit tests in packages/discovery-core/tests/reconcile.test.ts"

# Then core implementation (parallel):
Task: "Implement scan() in packages/discovery-core/src/scan.ts"
Task: "Implement buildRecord() in packages/discovery-core/src/record.ts"
```

---

## Implementation Strategy

### MVP First (US1)

Setup → Foundational → US1 → **STOP & VALIDATE** quickstart Scenario A (indexed catalog data). This
is the MVP data layer; the catalog is populated and rebuildable from Git.

### Incremental Delivery

Setup + Foundational → US1 (indexing) → US2 (browse/filter) → US3 (detail). Each is independently
testable and adds value without breaking the previous.

### Parallel Team Strategy

After US1 lands the data + collection, Dev A → US2 (listing/filters), Dev B → US3 (detail); they
share only `catalog.ts` and the `Artifact` collection.

---

## Notes

- [P] = different files, no incomplete deps
- Reuses `@kihub/artifact-schema` for validation — no schema change this phase
- Local-first: indexing reads `AI_ARTIFACTS_PATH`; no GitHub API/automation (Phase 4), no governance
  workflows (Phase 3), no semantic search (Phase 5)
- Postgres is available locally from Phase 1 (Docker, host port 55432)
- Commit after each task or logical group; stop at any checkpoint to validate a story
