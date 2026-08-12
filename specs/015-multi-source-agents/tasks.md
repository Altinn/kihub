# Tasks: Multi-Source Discovery & Agent Artifacts

**Input**: Design documents from `/specs/015-multi-source-agents/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R12),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: INCLUDED — the constitution's testing gate mandates automated tests for
discovery/validation logic, manifest schema validation, and state rules. Test tasks precede
implementation within each story (write → watch fail → implement → green).

**Organization**: Phase 2 ships the shared schema/collection/migration substrate (one additive
migration covers all three stories); each story is then an independently testable increment.

**Conventions**: integration tests need the env exported first (`set -a; source apps/web/.env;
set +a`); never run `payload migrate` against the push-mode dev DB (scratch DB only); paths are
repo-relative.

**Revision note (post-/speckit-analyze)**: C1 → new T018 (type↔directory consistency check,
renumbering T018+ by one); C2 → T029 splices `agentCard` on *every* upsert; C3 → T015 gains the
source-deletion case.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1 (multi-source safety), US2 (agent type), US3 (agent card)

---

## Phase 1: Setup

**Purpose**: Confirm the baseline is green so every later failure is ours.

- [x] T001 Export env (`set -a; source apps/web/.env; set +a`) and run `pnpm -r test` — confirm the pre-feature baseline (packages 43, web 328/328 across 37 files) before touching anything

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contract bump + collection fields + the single additive migration. All three
stories depend on these columns/types existing.

**⚠️ CRITICAL**: T002 → T005/T006 → T007 → T008 → T009 is a strict chain (Payload derives
migration DDL from the collection configs; the enum option spread needs the new type first).

- [x] T002 Add `'agent'` to `ARTIFACT_TYPES` and bump the `schemaVersion` default to `'1.1.0'` in packages/artifact-schema/src/schema.ts (contract: [manifest-v1.1.md](contracts/manifest-v1.1.md))
- [x] T003 [P] Update `$id` to `…/artifact-1.1.0.json` in packages/artifact-schema/scripts/generate-json-schema.ts and regenerate the committed packages/artifact-schema/schema/artifact.schema.json (after T002)
- [x] T004 [P] Add `'agents'` to `TYPE_DIRS` in packages/discovery-core/src/scan.ts (github-client needs zero changes — its `TYPE_DIR_SET` derives from this)
- [x] T005 Add `discoverySource` (relationship → `discovery-sources`, `hasMany: false`, nullable, `index: true`) and `agentCard` (`type: 'json'`, nullable) fields to apps/web/src/collections/Artifact.ts (do NOT rename the existing manifest `source` group — R1 naming note)
- [x] T006 [P] Add `summary.adopted`/`summary.reassigned`/`summary.cardIssues` (number), `adoptedIds`/`reassignedIds` (text `hasMany`), and `cardIssues` array (`{path, errors: text hasMany}`, same shape as `skippedInvalid`) to apps/web/src/collections/DiscoveryRun.ts
- [x] T007 Generate the migration with `pnpm --filter web migrate:create agents_multisource` (local DB up), review the DDL against the checklist in [data-model.md](data-model.md) §Migration (enum ADD VALUE, `discovery_source_id` FK `ON DELETE SET NULL` + index, `agent_card` jsonb, discovery_runs additions), hand-patch the `down` with `IF EXISTS` on constraint/index drops (the 014 pattern — see apps/web/src/migrations/20260810_093128_media_uploads.ts), and register it in apps/web/src/migrations/index.ts
- [x] T008 Verify the migration chain on a scratch DB per [quickstart.md](quickstart.md) §2: create `kihub_migtest`, `migrate` → `migrate:down` → `migrate` all clean, enum shows 8 values ending `agent`, new columns exist and are all-NULL (invariant I4). Keep the scratch DB for T037
- [x] T009 Regenerate apps/web/src/payload-types.ts (`pnpm --filter web payload generate:types`) and confirm the workspace still compiles and the full suite is still green

**Checkpoint**: Schema v1.1.0 live, columns exist, migration verified — story work can begin.

---

## Phase 3: User Story 1 — Scan many repositories without cross-damage (Priority: P1) 🎯 MVP

**Goal**: A scan touches only its own source's artifacts. Ownership stamped on every upsert
(adoption of legacy rows, reassignment on moves), deactivation scoped to the scanned source,
all of it visible in run reports. Contract: [reconcile.md](contracts/reconcile.md).

**Independent Test**: Two fake-reader sources with disjoint artifacts; scans in any order never
deactivate the other source's rows; deleting one artifact deactivates exactly it (SC-001/002);
a pre-seeded unowned row is adopted; a moved id is reassigned with governance intact.

### Tests for User Story 1

- [ ] T010 [US1] Extend `fakePayload()` in packages/discovery-core/tests/reconcile.test.ts to understand the `and:[…]` where-shape, `depth`, and a `discoverySource` row field; add failing cases: (a) deactivation scoped to sourceId, (b) null-source rows never deactivated, (c) other-source rows never deactivated, (d) every upsert stamps `discoverySource`, (e) null→owner reported in `adopted`, (f) other→owner reported in `reassigned`

### Implementation for User Story 1

- [ ] T011 [US1] Implement source-scoped reconcile in packages/discovery-core/src/reconcile.ts: required `opts: { sourceId }` third parameter; stamp `discoverySource` on every create/update; read existing rows at `depth: 0`; `adopted`/`reassigned` in `IndexReport`; deactivation query `and:[{active:{equals:true}},{discoverySource:{equals:sourceId}}]`; update `ArtifactDoc`/`PayloadLike` types and src/index.ts exports — T010 cases green
- [ ] T012 [US1] Pass `{ sourceId: source.id }` at the reconcile call site in apps/web/src/lib/discovery.ts and persist the new report fields on run creation (`summary.adopted`, `summary.reassigned`, `adoptedIds`, `reassignedIds`)
- [ ] T013 [P] [US1] Adapt the break-glass indexer apps/web/scripts/index-artifacts.ts per R12: upserts remain unowned (`discoverySource: null`) and it deactivates nothing (it owns no source)
- [ ] T014 [P] [US1] Render `duplicates` (recorded since 004 but never shown), `adopted`, and `reassigned` counts in apps/web/src/components/DiscoveryRunSummary.tsx (neutral label for reassignments, e.g. «Overtatt fra annen kilde» — a reassignment may be a move *or* a cross-source duplicate)
- [ ] T015 [P] [US1] New integration test apps/web/tests/integration/discovery-multi-source.test.ts using the `fakeReader` pattern from discovery-run.test.ts: two sources, disjoint artifacts — acceptance scenarios US1-1..5 (cross-source no-damage, exact single deactivation, legacy adoption, move with governance row intact, alternating duplicate reported as `reassigned` and never deactivated) **plus the source-deletion edge case**: delete one source's doc, its artifacts stay active with `discoverySource` null (FK `ON DELETE SET NULL`), and a later scan of the other source adopts a matching id
- [ ] T016 [P] [US1] Extend apps/web/tests/integration/discovery-run.test.ts: run documents carry the new summary counts and id arrays

**Checkpoint**: Multi-repo scanning is safe — deployable on its own as the production fix.

---

## Phase 4: User Story 2 — Agents are first-class registry artifacts (Priority: P2)

**Goal**: `type: agent` under `agents/` registers, appears in catalog/search with a Norwegian
«Agent» label (via the new all-types label map — none exists today), and gets full governance
parity. Contract: [manifest-v1.1.md](contracts/manifest-v1.1.md).

**Independent Test**: Add `agents/<slug>/artifact.yaml` to a registered source and scan: agent
visible in catalog + search, filterable by type, full governance cycle identical to a skill.

### Tests for User Story 2

- [ ] T017 [P] [US2] Add schema cases to packages/artifact-schema/tests/schema.test.ts (valid `type: agent` manifest accepted; the contract's example manifest validates) and scan cases to packages/discovery-core/tests/scan.test.ts + scanrepo.test.ts: `agents/<slug>/artifact.yaml` discovered; **type↔directory mismatch reported as invalid for that path in both directions** (`type: agent` under `skills/`, `type: skill` under `agents/`) — acceptance US2-3; these mismatch cases fail until T018
- [ ] T018 [US2] Implement the type↔directory consistency check in packages/discovery-core/src/scan.ts (`toRawArtifact` gains the manifest's type directory; after schema validation, compare the path's type dir against the plural form of `manifest.type` and report a mismatch as a validation error, e.g. `type: type 'agent' does not match directory 'skills/'`) — applied in both `scan()` and `scanRepo`; T017 mismatch cases green
- [ ] T019 [P] [US2] New unit test apps/web/tests/unit/registry-view.test.ts: `ARTIFACT_TYPE_LABELS` is exhaustive over `ARTIFACT_TYPES` (compile-time `Record` + runtime coverage), labels are the agreed Norwegian strings, option-builder emits `{value,label}` pairs
- [ ] T020 [P] [US2] New pure module apps/web/src/lib/registry-view.ts: `ARTIFACT_TYPE_LABELS: Record<ArtifactType, string>` (skill «Ferdighet», prompt «Prompt», workflow «Arbeidsflyt», mcp «MCP-server», template «Mal», policy «Retningslinje», playbook «Dreiebok», agent «Agent») + `artifactTypeOptions()` helper, following the lib/events-view.ts pattern (R10)
- [ ] T021 [US2] Wire the label map into apps/web/src/components/CatalogFilters.tsx (filter chips), apps/web/src/components/ArtifactCard.tsx (type tag), and apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx (detail tag) — no raw enum values rendered anywhere
- [ ] T022 [US2] Switch the `type` select options in apps/web/src/collections/Artifact.ts to `{value, label}` pairs from registry-view (Norwegian labels in `/cms` too, events-collection pattern)
- [ ] T023 [P] [US2] New integration test apps/web/tests/integration/agent-discovery.test.ts: fakeReader source with `agents/<slug>/artifact.yaml` → registered active with `type: 'agent'`, `listArtifacts({type:'agent'})` finds it, `searchArtifacts` matches its name/description (use English-stemmable fixture terms — the ts-config is `english`; widen the `'skill' | 'prompt'` seed literal at apps/web/tests/integration/search.test.ts:17 only if that file gains an agent seed)
- [ ] T024 [P] [US2] Extend the existing governance integration pattern (apps/web/tests/integration/ governance/lifecycle tests) with an agent-typed artifact running a full cycle — submit, typed review, approve, lifecycle transition, audit entries — proving type-blindness (SC-004)

**Checkpoint**: Agents are governable registry citizens; UI shows Norwegian type labels.

---

## Phase 5: User Story 3 — Agent card enrichment on the detail page (Priority: P3)

**Goal**: Optional sibling `agent-card.json` (A2A v1.0) fetched per agent, validated tolerantly,
stored verbatim, rendered in a server-only panel; invalid/missing cards never block
registration and surface per path in run reports. Contract: [agent-card.md](contracts/agent-card.md).

**Independent Test**: Valid card → detail page renders skills/capabilities/interfaces/auth;
malformed card on re-scan → artifact still active, card cleared, run lists errors; card file
removed → section disappears.

### Tests for User Story 3

- [ ] T025 [P] [US3] New test packages/artifact-schema/tests/agent-card.test.ts: full example card valid; name-only object valid; missing/empty `name` invalid; per-field type errors in `"<path>: <message>"` format; skill item without `name` invalid; >256 KB source invalid; unknown fields preserved on the parsed result
- [ ] T026 [P] [US3] Add cases to packages/discovery-core/tests/scanrepo.test.ts: card fetched only for valid `type: agent` manifests (never for other types — FR-014); 404/absent → no card, no errors; malformed card → `agentCardErrors` set, artifact still `valid`

### Implementation for User Story 3

- [ ] T027 [P] [US3] New module packages/artifact-schema/src/agent-card.ts: tolerant `agentCardSchema` (only `name` required; known fields type-checked when present; unknown keys pass through) + `validateAgentCard(source: string | unknown)` with the 256 KB pre-parse cap, mirroring validate.ts error formatting; export from packages/artifact-schema/src/index.ts — T025 green
- [ ] T028 [US3] Card fetch in packages/discovery-core/src/scan.ts: `RawArtifact` gains `agentCard`/`agentCardErrors`; `scanRepo` (and the local `scan()` walker for parity) reads `${relPath}/agent-card.json` only when the manifest is valid and `type === 'agent'` — T026 green
- [ ] T029 [US3] Splice card storage into packages/discovery-core/src/reconcile.ts: **every** upsert sets `agentCard: s.agentCard ?? null` — non-agents always null, so a type change away from `agent` clears any stale card (analyze finding C2); card failures → `cardIssues: [{path, errors}]` on `IndexReport`; unit cases in reconcile.test.ts (stored, cleared on invalid, cleared on removed, cleared on type change agent→skill)
- [ ] T030 [US3] Persist `cardIssues` (summary count + array field) on run creation in apps/web/src/lib/discovery.ts, and render card issues in apps/web/src/components/DiscoveryRunSummary.tsx
- [ ] T031 [P] [US3] New server component apps/web/src/components/AgentCardPanel.tsx per the rendering contract: Norwegian group headings («Agentkort», «Ferdigheter», «Egenskaper», «Grensesnitt», «Inn-/utdataformater», «Autentisering»), card content verbatim, empty groups omitted, styled exclusively via `--kihub-*`/`--ds-*` tokens (+ a `015 /registry agent-card` section in apps/web/src/styles/kihub/portal.css only if the panel needs new rules)
- [ ] T032 [US3] Render `<AgentCardPanel>` between the Install card and the README section in apps/web/src/app/(app)/artifacts/[artifactId]/page.tsx, omitted entirely when `agentCard` is null
- [ ] T033 [P] [US3] New integration test apps/web/tests/integration/agent-card.test.ts — the card lifecycle: valid card stored on scan → malformed card next scan (artifact still active, `agentCard` null, run has `cardIssues`) → card file removed (stays null, no issues); plus non-agent sibling card ignored

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T034 [P] Update packages/artifact-schema/docs/artifact-manifest.md: schema version 1.1.0, `agent` in the type row, the type↔directory consistency rule, and a new "Agent card (`agent-card.json`)" section documenting the sibling-file convention and tolerant validation (per [contracts/manifest-v1.1.md](contracts/manifest-v1.1.md) + [contracts/agent-card.md](contracts/agent-card.md))
- [ ] T035 Full suites green: `pnpm -r test` with env exported — expect the package suites plus web suite (baseline 328 + new tests), zero regressions
- [ ] T036 `pnpm --filter web lint` clean
- [ ] T037 Production build gate against the migrated scratch DB from T008 with non-mock auth: verify the accepted non-mock `AUTH_MODE` value in the auth config first (analyze finding A2), then `DATABASE_URI=<kihub_migtest> AUTH_MODE=<non-mock> pnpm --filter web build` — compiles, typechecks, generates all routes (recorded gotcha: this is the only gate that has caught implicit-`any` errors)
- [ ] T038 Manual end-to-end per [quickstart.md](quickstart.md) §4: real second repo with an agent + card, register source in `/cms`, "Run now" on `/admin/discovery`, verify no cross-damage to the first source, Norwegian type chips in `/registry`, card panel on the detail page, card errors in the run view after breaking the card

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1** → **Phase 2** (strict internal chain: T002 → {T003, T004, T005} → T006 alongside T005 → T007 → T008 → T009)
- **Phase 2** blocks all stories (columns/enum/types must exist)
- **US1 (Phase 3)**, **US2 (Phase 4)**, **US3 (Phase 5)** are independently *testable*, but US2's T018 and US3's T028/T029 edit the same files as US1's T011 — run the phases sequentially (P1 → P2 → P3) as a single implementer; parallel only across different files within a phase
- **Phase 6** last; T037 reuses T008's scratch DB

### Story Dependencies

- **US1**: only Phase 2. The standalone production fix — deployable alone.
- **US2**: only Phase 2 (enum + dirs land there). Does not need US1.
- **US3**: needs US2's discovery path for agents (an agent must register before its card matters); touches reconcile after US1's rewrite — sequence US1 → US2 → US3.

### Parallel Opportunities

- Phase 2: T003 + T004 together (after T002); T005 + T006 together
- US1: T013 + T014 + T015 + T016 after T012
- US2: T017 + T019 + T020 first in parallel; T018 after T017; T023 + T024 after T021/T022
- US3: T025 + T026 in parallel; T031 alongside T027–T030; T033 last
- Phase 6: T034 anytime; T035 → T036 → T037 → T038 in order

---

## Implementation Strategy

**MVP = Phase 1 + Phase 2 + US1.** That alone fixes the destructive multi-repo behavior and is
worth shipping: production currently cannot safely take a second source, which blocks the
planned multi-repo rollout. Stop, validate with T015/T016 + quickstart §4 steps 3–4+7, demo.

Then increments: US2 (agents governable, Norwegian labels) → validate with the agent fixture →
US3 (cards rendered) → validate with the card lifecycle → Polish gates.

Estimated: 38 tasks — Setup 1, Foundational 8, US1 7, US2 8, US3 9, Polish 5.
