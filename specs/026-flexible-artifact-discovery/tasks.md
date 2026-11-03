# Tasks: Flexible Artifact Discovery & Revision-Bound Governance

**Input**: Design documents from `/specs/026-flexible-artifact-discovery/`

**Prerequisites**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Mandatory. Discovery, validation, governance hooks, migration shape, and employee trust
indicators are contract/security behavior and require automated coverage.

**Organization**: Tasks are grouped by user story. IDs also define the intended single-developer
execution order; `[P]` marks files that can be prepared independently after their phase dependency.

## Phase 1: Setup & Contract Baseline

**Purpose**: Pin public shapes and test fixtures before behavior changes.

- [x] T001 Update the active feature summary in `CLAUDE.md` and the Spec Kit repository-layout/status references in `README.md` for feature 026
- [x] T002 [P] Add shared config fixtures/helpers for root, nested-root, malformed, and digest cases in `packages/discovery-core/tests/`
- [x] T003 [P] Add Git-tree fixtures with blob SHAs, nested roots, missing roots, and truncation in `packages/github-client/tests/client.test.ts`
- [x] T004 Define additive public types/exports (`ResolvedDiscoveryConfig`, `DetailedScanResult`, `ScanOptions`, `RawArtifact.contentDigest`, `IndexReport.revisionChanged`, `ReconcileOptions.allowEmptySource`) in `packages/discovery-core/src/`

---

## Phase 2: User Story 1 — Repository-Owned Discovery Roots (Priority: P1) 🎯 MVP

**Goal**: Strict `kihub.yaml` roots with exact typed layout and backward-compatible default root.

**Independent Test**: Local and fake/GitHub readers discover configured nested roots, ignore arbitrary
depth, preserve no-config behavior, and report actual repository-relative paths.

### Tests for User Story 1

- [x] T005 [P] [US1] Add strict config parser tests (valid canonical order/digest, absent fallback, YAML errors/warnings/aliases/tags, unknown keys, root grammar, duplicate/limit cases) in `packages/discovery-core/tests/config.test.ts`
- [x] T006 [P] [US1] Extend local scan tests for multiple nested roots, no-config compatibility, exact depth, missing roots, type-directory checks, and actual `source.path` in `packages/discovery-core/tests/scan.test.ts`
- [x] T007 [P] [US1] Extend source-agnostic scan tests for detailed config provenance, deterministic paths, and expected-repository validation in `packages/discovery-core/tests/scanrepo.test.ts`
- [x] T008 [P] [US1] Extend GitHub reader tests for root-aware enumeration, missing-root rejection, one cached recursive tree, and truncated-tree rejection in `packages/github-client/tests/client.test.ts`

### Implementation for User Story 1

- [x] T009 [US1] Implement strict `kihub.yaml` v1 parsing, root normalization, repository normalization, and canonical config digest in `packages/discovery-core/src/config.ts`
- [x] T010 [US1] Refactor `packages/discovery-core/src/scan.ts` to resolve roots, match physical type directories, validate actual source path/repository, and expose `scanRepoDetailed` while preserving `scan`/`scanRepo` wrappers
- [x] T011 [US1] Update the local reader/scanner in `packages/discovery-core/src/scan.ts` to enforce root existence/containment and exact `<root>/<type>/<slug>` enumeration
- [x] T012 [US1] Update `packages/github-client/src/client.ts` to cache the complete recursive tree, enumerate configured roots exactly, validate roots, and fail closed on truncated trees
- [x] T013 [US1] Export the new config/scanning contract from `packages/discovery-core/src/index.ts` and update package API comments

**Checkpoint**: P1 package tests green; existing repositories need no config migration.

---

## Phase 3: User Story 2 — Fail-Safe, Traceable Reconciliation (Priority: P2)

**Goal**: Wrong config/source metadata and unexpected empty observations cannot silently mutate the
catalog; successful runs record exactly what configuration was used.

**Independent Test**: A source with an owned artifact remains unchanged after invalid/missing/empty
scans; an explicitly armed run deactivates it once and resets the override.

### Tests for User Story 2

- [x] T014 [P] [US2] Add pre-write empty-source guard tests proving zero create/update/deactivate calls, break-glass exemption, allowed empty deactivation, and unchanged duplicate behavior in `packages/discovery-core/tests/reconcile.test.ts`
- [x] T015 [P] [US2] Extend `apps/web/tests/integration/discovery-run.test.ts` for config provenance fields, protected empty failure, one-shot allowed empty success/reset, and no reset on failure
- [x] T016 [P] [US2] Extend discovery source access/create tests for the Admin-only/default-false destructive override in `apps/web/tests/integration/discovery-access.test.ts` and `discovery-source-create.test.ts`

### Implementation for User Story 2

- [x] T017 [US2] Implement `UnsafeEmptyScanError` and the pre-write valid-ID/owned-active gate in `packages/discovery-core/src/reconcile.ts`
- [x] T018 [P] [US2] Add `allowDestructiveReconcile` with a one-shot warning to `apps/web/src/collections/DiscoverySource.ts`
- [x] T019 [P] [US2] Add `configPath`, `configDigest`, `artifactRoots`, `summary.revisionChanged`, and `revisionChangedIds` fields to `apps/web/src/collections/DiscoveryRun.ts`
- [x] T020 [US2] Update `apps/web/src/lib/discovery.ts` to use `scanRepoDetailed`, pass expected repository and empty override, persist config provenance, record failures before reconcile, and reset a consumed override only after success

**Checkpoint**: P1+P2 tests green; unsafe empty scans are demonstrably atomic/no-op.

---

## Phase 4: User Story 3 — Reviews and Approvals Follow the Artifact Revision (Priority: P3)

**Goal**: Content changes stale old decisions without deleting history; reviews/approvals snapshot the
revision and the employee surface never presents stale governance as current success.

**Independent Test**: Approve a skill, change only `SKILL.md`, rescan, observe changed-revision report
and stale UI/enforcement, then re-approve and observe current state.

### Tests for User Story 3

- [x] T021 [P] [US3] Add Git blob/directory digest determinism, order independence, path-move stability, add/remove/rename/content-change, and symlink-byte tests in `packages/discovery-core/tests/digest.test.ts`
- [x] T022 [P] [US3] Extend local/GitHub scan tests to prove full-directory digest parity and `SKILL.md`-only change detection in `packages/discovery-core/tests/scan.test.ts` and `packages/github-client/tests/client.test.ts`
- [x] T023 [P] [US3] Extend reconcile tests for `contentDigest` persistence and `revisionChanged` semantics (change, equality, null backfill, create) in `packages/discovery-core/tests/reconcile.test.ts`
- [x] T024 [P] [US3] Add pure current/stale approval projection tests for version/digest/null combinations in `apps/web/tests/unit/governance-revision.test.ts`
- [x] T025 [P] [US3] Extend `apps/web/tests/integration/review-approval-flow.test.ts` for server-stamped review/decision revisions, missing-digest refusal, client snapshot overwrite, audit revision details, and stale promotion/recommendation rejection
- [x] T026 [P] [US3] Revise `apps/web/tests/integration/reindex-preserves.test.ts` to prove governance history is byte-preserved while the approval projection becomes stale after content/version change and current after re-approval
- [x] T027 [P] [US3] Add employee component assertions for current vs stale badge/panel behavior without green stale approval/recommendation in `apps/web/tests/unit/governance-revision.test.ts`

### Implementation for User Story 3

- [x] T028 [US3] Implement Git blob OID and canonical artifact-directory digest primitives in `packages/discovery-core/src/digest.ts`
- [x] T029 [US3] Integrate complete local and GitHub directory digest implementations plus known-file fallback into `packages/discovery-core/src/scan.ts` and `packages/github-client/src/client.ts`
- [x] T030 [US3] Add `contentDigest` to `ArtifactRecord`/`buildRecord`, `RawArtifact`, reconcile upserts/comparisons, and `apps/web/src/collections/Artifact.ts`
- [x] T031 [US3] Add server-controlled review revision snapshots and revision-bearing audit detail in `apps/web/src/collections/Review.ts`
- [x] T032 [US3] Add approval revision snapshots, clearing/preservation rules, explicit role-gated one-shot reapproval, and current-approval lifecycle/recommendation enforcement in `apps/web/src/collections/CatalogEntry.ts`
- [x] T033 [US3] Add pure revision comparison/projection and current revision fields to `apps/web/src/lib/governance.ts`; keep stored history separate from effective employee recommendation
- [x] T034 [P] [US3] Update `apps/web/src/components/LifecycleBadge.tsx` to render stale approved/recommended lifecycle as warning/recorded state with no green current indicators
- [x] T035 [P] [US3] Update `apps/web/src/components/GovernancePanel.tsx` to show current vs decided revisions and mark older/legacy reviews independently of expiry

**Checkpoint**: All user stories pass targeted package/unit/integration tests.

---

## Phase 5: Persistence, Generated Artifacts & Cross-Cutting Verification

**Purpose**: Ship the additive database contract, generated types, docs, and complete gates.

- [x] T036 Regenerate `apps/web/src/payload-types.ts` after all Payload field changes
- [x] T037 Generate one additive `20261103_*_artifact_revision_governance` migration (`.ts` + `.json`), inspect/repair reversible down SQL if needed, and register it in `apps/web/src/migrations/index.ts`
- [x] T038 [P] Update `README.md`, artifact/discovery documentation, and relevant code comments with `kihub.yaml`, path validation, revision digest, empty-source override, and stale governance semantics
- [x] T039 Run package suites (`artifact-schema`, `discovery-core`, `github-client`, `governance-core`) and fix regressions
- [x] T040 Run targeted then full web unit/integration suites against a branch-safe database and fix regressions
- [x] T041 Run ESLint and TypeScript no-emit checks; fix all feature-caused findings
- [x] T042 Verify migration up/down/up on a scratch PostgreSQL database through all prior migrations
- [x] T043 Run the production build against a migrated scratch database with non-mock auth settings
- [x] T044 Perform the quickstart manual employee UI check for current→stale→current governance and the Admin one-shot override
- [x] T045 Perform the real-repository nested-root canary from `quickstart.md`, recording any agentctl/APM interoperability finding without expanding installer scope
- [x] T046 Run Spec Kit analyze against spec/plan/contracts/tasks/implementation, mark every completed task `[x]`, and update `CLAUDE.md` with final test counts, migration name, and operational notes

---

## Completion record (2026-11-03)

- Package gates: artifact-schema 17/17, discovery-core 74/74, GitHub client 9/9, governance-core
  17/17 (117 total).
- Web gates: 251/251 unit tests across 22 files and 178/178 integration tests across 29 files.
  Integration files were run independently because the pre-existing combined Payload/Vitest process
  exits after a few files with status 0 and no final summary; the independent sweep is authoritative.
- ESLint and `tsc --noEmit` are clean. Production `next build` is green with `AUTH_MODE=entra`
  against freshly migrated scratch DB `kihub_026_final_build`.
- Migration `20261103_080248_artifact_revision_governance` applied from empty, rolled the complete
  chain down, and reapplied cleanly on `kihub_026_flexible_discovery`.
- Manual employee UI check on port 3026 verified current Approved/Recommended → stale warning with
  no green current indicators → current again after explicit reapproval.
- Real-artifact canary copied `/Users/adi/ai-artifacts/skills/security-review` into a temporary
  `src/skills/security-review` repository fixture with `kihub.yaml`; local discovery returned exactly
  that actual path, valid manifest, and full-directory digest. `agentctl` is not installed on this
  machine, so no installer command was run; the manifest's existing `install.apm.package` remained
  unchanged, consistent with distribution staying out of scope.
- Spec Kit prerequisite and consistency audit passed after aligning spec, research, data model,
  contracts, quickstart, tasks, implementation, migration, and operator documentation. No
  constitution amendment is required.

---

## Dependencies & Execution Order

### Phase dependencies

- **Phase 1** establishes additive types and fixtures.
- **US1 (P1)** depends on Phase 1 and enables config-aware scans.
- **US2 (P2)** depends on US1's detailed scan result/config failures.
- **US3 (P3)** depends on the scan path for content digests and on reconcile reporting, but its
  Payload hook/UI work can proceed after T030.
- **Phase 5** depends on final Payload field shapes from US2/US3.

### Critical path

```text
T004 → T009 → T010/T011/T012 → T017 → T020
                       └──────→ T028 → T029 → T030 → T031/T032 → T033 → T034/T035
T018/T019/T030/T031/T032 → T036 → T037 → full gates
```

### Parallel opportunities

- Tests T005–T008 can be authored independently after T004.
- Payload collection field shells T018/T019 can proceed while core guard T017 is implemented.
- Digest tests T021–T023 and pure governance tests T024 can be prepared independently.
- Review and catalog hook implementations T031/T032 touch separate collections after T030.
- Badge and panel changes T034/T035 touch separate components after T033.

## Implementation Strategy

1. Preserve compatibility first: no-config scan remains the baseline green test.
2. Deliver configured roots and source truth validation.
3. Add the pre-write destructive guard before wiring it to Payload.
4. Add portable content digest and revision-change reporting.
5. Add governance snapshots/enforcement, then employee projection/UI.
6. Generate the database migration only after field shapes stabilize.
7. Validate targeted behavior, then full suites, migration, build, manual UI, and real repo canary.

## Notes

- Do not change `artifact.yaml` schema version; `kihub.yaml` is a separate v1 contract.
- Do not update governance rows from discovery. Currency is computed from snapshots.
- Do not include repository-relative root/path in the content digest; pure moves remain governance-neutral.
- Do not consume the destructive override on failed scans.
- Do not use the shared push-mode development database for migration verification.
