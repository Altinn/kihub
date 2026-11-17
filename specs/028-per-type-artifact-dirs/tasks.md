# Tasks: Per-Type Artifact Directories in `kihub.yaml`

**Input**: Design documents from `/specs/028-per-type-artifact-dirs/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md` (R1–R10), `data-model.md`, `contracts/` (3), `quickstart.md`

**Tests**: Mandatory. Configuration grammar, fail-closed discovery, reader parity, the config digest
and the guide's examples are contract/security behaviour. Within each story, tests are written first
and must fail before the implementation.

**Organization**: Grouped by user story. IDs are the intended single-developer execution order;
`[P]` marks tasks on different files with no dependency on an unfinished task.

**Working copy**: all paths are relative to the worktree `/Users/adi/kihub-028` (branch
`028-per-type-artifact-dirs`, stacked on 026 / PR #176). Do not commit or push; do not touch
`/Users/adi/kihub`. Generate migrations and types with `MEDIA_STORAGE_MODE=azure`.

## Phase 1: Setup & Baseline

**Purpose**: Prove the stacked 026 base is green and give integration tests an isolated database.

- [x] T001 Verify the baseline on the 026 base: `pnpm install --frozen-lockfile`, then `pnpm --filter @kihub/discovery-core test`, `pnpm --filter @kihub/github-client test`, `pnpm --filter @kihub/artifact-schema test` and `pnpm --filter web exec vitest run tests/unit`. Record the passing counts at the top of the Notes section of this file
- [x] T002 Create the per-branch scratch database `kihub_028` in the colima `kihub-postgres` container (port 55432), point `DATABASE_URI` at it for the shell (`set -a; source apps/web/.env; set +a` then override `DATABASE_URI`), run `pnpm --filter web migrate` against it, and confirm `pnpm --filter web exec vitest run tests/integration/discovery-run.test.ts` is green. Never run integration tests against the shared `kihub` DB while another branch's schema is in it
- [x] T003 [P] Grep every `listArtifactDirs`, `artifactRoots`, `TYPE_DIRS` and `typeDir` use outside `specs/` and list them in Notes as the change surface (expected: `packages/discovery-core/src/{scan,config,index}.ts`, `packages/github-client/src/client.ts`, ten test fakes, `apps/web/src/lib/discovery.ts`, `apps/web/src/collections/DiscoveryRun.ts`, the guide files)

---

## Phase 2: Foundational (blocks every story)

**Purpose**: Config grammar, the shared layout module and the reader contract. No behaviour change for
roots-only configs.

### Tests first

- [x] T004 [P] Extend `packages/discovery-core/tests/config.test.ts`: `artifactDirs` happy paths (single type, several types, mixed with `artifactRoots`, dirs-only has no implicit `.`), resolved shape (types in `ARTIFACT_TYPES` order, each list sorted by UTF-8 bytes), `discovery: {}` fails, and a **golden digest test** asserting the roots-only digest equals the sha256 of the exact 026 canonical string for `['.','src']`, `['src']` and a nested root (compute the expected hex from the literal 026 JSON in the test, not from the code under test)
- [x] T005 [P] Create `packages/discovery-core/tests/layout.test.ts`: `buildLayout` derives eight containers per root and one per typed dir, collapses identical `{dir,type}`, sorts by `dir`, puts roots (except `.`) and typed dirs in `requiredDirs`; same dir under two types throws; typed dir equal to a root-layout container with a different type throws, with the same type collapses; `layoutForRoots()` defaults to `['.']`; `matchArtifactDirs` returns only `<container>/<slug>` with exactly one level, ignores deeper/shallower manifests, dedupes; `locateArtifact` returns `{path, expectedType}` and throws for a folder outside every container; `assertNoNestedArtifacts` fails for `a` + `a/b`, passes for `a`, `a-b`, `a.b`, and names both paths

### Implementation

- [x] T006 Add `packages/discovery-core/src/messages.ts` exporting the fixed failure-message fragments (`MARKERS`, `DISCOVERY_FAILURE_MARKERS`) and builders from `contracts/scan-and-conflicts.md` (e.g. `DISCOVERY_FAILURE_PREFIXES` as a readonly list, plus `unknownTypeMessage`, `twoTypesMessage`, `rootLayoutClashMessage`, `missingDirMessage`, `nestedMessage`, `emptyDiscoveryMessage`) so scan code and the guide test share one source of truth (R10)
- [x] T007 Implement `artifactDirs` in `packages/discovery-core/src/config.ts` per `contracts/discovery-config-v1-artifactdirs.md`: allowed `discovery` keys become `artifactRoots` and `artifactDirs`; `artifactRoots` optional but 1–32 when present; validate type keys against `ARTIFACT_TYPES` (plural-name hint), non-empty unique lists, `normalizeArtifactRoot` plus a `.` rejection, ≤ 32 entries in total, at least one of the two keys; add `MAX_ARTIFACT_DIRS = 32` and `artifactDirs` to `ResolvedDiscoveryConfig` (absent file → `{}`); extend `digestConfig` so roots-only output is byte-identical to 026 and `artifactDirs` is appended only when non-empty. Make T004 pass
- [x] T008 Create `packages/discovery-core/src/layout.ts` with `ArtifactContainer`, `DiscoveryLayout`, `buildLayout`, `layoutForRoots`, `matchArtifactDirs`, `locateArtifact` and `assertNoNestedArtifacts` per `contracts/scan-and-conflicts.md` and `data-model.md` §3–4; invert `TYPE_DIRS`/`DIR_FOR_TYPE` for root-layout containers (export a single shared `TYPE_FOR_DIR` map from `scan.ts` or move both maps into `layout.ts`); use `comparePaths` for ordering. Make T005 pass
- [x] T009 Change the reader contract in `packages/discovery-core/src/scan.ts` and `packages/discovery-core/src/index.ts`: `RepoReader.listArtifactDirs(layout?: DiscoveryLayout)`, replace `ArtifactLocation {path, root, typeDir}` with `{path, expectedType}` produced by `locateArtifact`, make `sourceErrors` compare `manifest.type` with `expectedType` using the new message (`type '<t>' does not match the type '<c>' configured for '<dir>'`), call `assertNoNestedArtifacts` after listing in both `scanLocalDetailed` and `scanRepoDetailed`, and export the new API (`buildLayout`, `layoutForRoots`, `matchArtifactDirs`, `locateArtifact`, `assertNoNestedArtifacts`, `ArtifactContainer`, `DiscoveryLayout`, `MAX_ARTIFACT_DIRS`, messages). Keep `TYPE_DIRS` exported
- [x] T010 Update the local lister in `packages/discovery-core/src/scan.ts` (`listLocalArtifactDirs` / `createLocalReader`) to take a layout: validate every `requiredDirs` entry with the existing symlink-containment check (`validateLocalRoot`), then list immediate subfolders containing `artifact.yaml` for each existing container
- [x] T011 Update `packages/github-client/src/client.ts`: `listArtifactDirs(layout = layoutForRoots())` checks every `requiredDirs` entry exists in the cached tree (message `Configured artifact directory does not exist in <repo>@<ref>: <dir>`), then returns `matchArtifactDirs(layout, <manifest blob paths>)`; keep `knownArtifactDirs` / digest grouping and the single recursive tree call unchanged; drop the now-unused local `TYPE_DIR_SET`
- [x] T012 [P] Update existing tests for the new contract without changing their intent: `packages/github-client/tests/client.test.ts` (pass `layoutForRoots([...])` where `['src']`, `['missing']`, `['.', 'skills/outer']` were passed; keep the `'does not exist'` and `'truncated'` assertions) and `packages/discovery-core/tests/scanrepo.test.ts` line ~154 (fake that read `artifactRoots`). Confirm the other nine fakes (`apps/web/tests/integration/{discovery-scan,discovery-multi-source,discovery-run,discovery-serialize,agent-discovery,discovery-access,agent-card,discovery-preserves-governance}.test.ts`) take no parameters and compile unchanged
- [x] T013 Run `pnpm --filter @kihub/discovery-core test` and `pnpm --filter @kihub/github-client test`; the whole 026 suite must be green with only the type-mismatch message differing

**Checkpoint**: roots-only behaviour and digests are provably unchanged (T004 golden test); the layout module exists and both readers use it. Stories can start.

---

## Phase 3: User Story 1 — Register a Repository Without Moving Folders (Priority: P1) 🎯 MVP

**Goal**: A `kihub.yaml` with `artifactDirs` makes both readers discover `<dir>/<slug>/artifact.yaml`
folders with the configured type, and discovery runs record the resolved mapping.

**Independent Test**: Scan a fixture with `artifactDirs: { skill: [agents/_skills] }` and valid
manifests under `agents/_skills/alpha` and `beta`; both are found with real paths and identical digests
by the local and GitHub readers; `agents/_skills/gamma` (no manifest) and deeper manifests are ignored.

### Tests first

- [x] T014 [P] [US1] Create the shared parity fixtures in `packages/discovery-core/tests/fixtures/artifact-dirs-fixtures.ts`: a table of `{name, files: Record<path, content>, kihubYaml, expectedDirs, expectedTypes}` covering dirs-only, roots + dirs mixed, two types, deeper/shallower manifests ignored, decoy sibling folders, same `{dir,type}` reachable twice
- [x] T015 [P] [US1] Extend `packages/discovery-core/tests/scan.test.ts`: for each fixture, write the files to a temp git checkout (`git init`, `git add`, no commit needed) and assert `scan()` returns the expected dirs, `valid`/`manifest.type`, `source.path` equal to the real folder, and `contentDigest`; add manifest-type-mismatch (`type: agent` under a `skill` dir) and wrong-`source.path` cases (error text names both values) and the roots-only regression
- [x] T016 [P] [US1] Extend `packages/discovery-core/tests/scanrepo.test.ts` and `packages/github-client/tests/client.test.ts`: build a fake GitHub tree from the same fixture table (blob SHAs from `gitBlobOid`), assert `scanRepoDetailed` via `createGithubRepoReader` returns the **same dirs in the same order, same types and same digests** as the local reader for every fixture (parity, FR-017)
- [x] T017 [P] [US1] Add `apps/web/tests/integration/discovery-artifact-dirs.test.ts`: run `runDiscoveryForSource` (see `apps/web/src/lib/discovery.ts`) with a fake reader whose `readFile('kihub.yaml')` returns a dirs-only config; assert the artifact rows are created with `source.path` = real folder and the `discovery-runs` row stores `artifactDirs` (`{"skill":["agents/_skills"]}`), `artifactRoots` `[]`, `configPath`, `configDigest`; and that a roots-only run stores `artifactDirs: null`

### Implementation

- [x] T018 [US1] Make T015 and T016 pass: fix any gaps in `scan.ts` / `layout.ts` / `client.ts` (type from `expectedType`, `source.path` check against the full folder, dedupe of identical `{dir,type}`)
- [x] T019 [P] [US1] Add the read-only `artifactDirs` `json` field next to `artifactRoots` in `apps/web/src/collections/DiscoveryRun.ts` (`admin.readOnly`, description "Resolved per-type directories, when kihub.yaml uses artifactDirs")
- [x] T020 [US1] Persist it in `apps/web/src/lib/discovery.ts` (next to `artifactRoots: scanned.config.artifactRoots`): write `scanned.config.artifactDirs` when non-empty, otherwise `null`
- [x] T021 [US1] Generate the migration with `MEDIA_STORAGE_MODE=azure` against the migrated `kihub_028` DB: `pnpm --filter web migrate:create discovery_run_artifact_dirs`; confirm it contains only `ALTER TABLE "discovery_runs" ADD COLUMN "artifact_dirs" jsonb`, hand-patch `down` with `DROP COLUMN IF EXISTS`, confirm `index.ts` registers it and that the `.json` snapshot sits on top of `20261103_080248_artifact_revision_governance` and does **not** drop `media._objectkey`
- [x] T022 [US1] Regenerate `apps/web/src/payload-types.ts` with `MEDIA_STORAGE_MODE=azure` (`pnpm --filter web exec payload generate:types`) and confirm the diff only adds `artifactDirs`
- [x] T023 [US1] Verify the migration chain on a fresh scratch DB `kihub_028_mig`: `migrate` up → `migrate:down` → `migrate` up (the new column appears, disappears, reappears); make T017 pass; drop `kihub_028_mig`
- [x] T024 [US1] Local dry run of the worked example from `quickstart.md` §2: create a temp checkout with `agents/_skills/tekstforfatter-docs/{SKILL.md,artifact.yaml}`, a decoy sibling without manifest and `kihub.yaml`, run the `scan()` one-liner, and confirm one valid `skill` at the real path; paste the output in Notes

**Checkpoint**: US1 works end to end for dirs-only and mixed configs, both readers agree, runs record provenance, migration verified. This alone unblocks Altinn Studio (docs/guide still pending).

---

## Phase 4: User Story 2 — Wrong or Ambiguous Configuration Fails Safely (Priority: P2)

**Goal**: Every bad or contradictory configuration fails the whole scan with a fixed, helpful message and
zero catalog mutation; per-manifest problems stay per-artifact.

**Independent Test**: Against a source that already owns an active artifact, each fault below yields a
failed run and an unchanged catalog.

### Tests first

- [x] T025 [P] [US2] Extend `packages/discovery-core/tests/config.test.ts` with table-driven failures asserting the exact message prefixes from `src/messages.ts`: unknown type (`skills`, `Skill`, `evaluation`) incl. the plural hint, non-list value, empty list, non-string entry, unsafe entries (`/abs`, `a//b`, `a\\b`, `../x`, `./x`, `x/`, `a:b`, whitespace), `.` entry, duplicate within a type, 33 entries across two types, `discovery: {}`, `artifactDirs: {}`, `artifactRoots: []` with no dirs, unknown extra key under `discovery`, aliases/anchors inside `artifactDirs`
- [x] T026 [P] [US2] Extend `packages/discovery-core/tests/layout.test.ts` and `scan.test.ts` / `scanrepo.test.ts`: same dir under two types; `artifactRoots: ['.']` + `artifactDirs.agent: ['skills']` (root-layout clash) and the same-type variant (collapses, no error); missing listed dir in the local reader (typo and "is a file, not a directory") and in the GitHub reader; nested artifact folders (`agents/_skills/a` contains `agents/_skills/a/sub` found through a second container) failing with both paths; manifest-level type mismatch and `source.path` mismatch remain per-artifact (sibling valid artifacts still discovered)
- [x] T027 [P] [US2] Add `apps/web/tests/integration/discovery-artifact-dirs-failsafe.test.ts` (use the pattern of `discovery-run.test.ts` and `discovery-preserves-governance.test.ts`): seed a source owning one active artifact; for each of: plural key, missing dir, same dir two types, root-layout clash, nested artifacts, `discovery: {}` — assert the run is recorded `failure`, the artifact and its governance are unchanged, and nothing is deactivated; plus a dirs-only config that yields zero valid artifacts for a source owning active ones is refused by the empty-source guard (`UnsafeEmptyScanError`) and succeeds with `allowDestructiveReconcile` armed, which then resets

### Implementation

- [x] T028 [US2] Make T025 pass: complete the validation branches and messages in `packages/discovery-core/src/config.ts`, always built from the builders in `messages.ts` (no inline duplicate strings)
- [x] T029 [US2] Make T026 pass: finish `buildLayout` conflict detection, required-dir checks in both readers (`scan.ts` local lister, `client.ts`), and `assertNoNestedArtifacts` wiring; ensure all failures are `DiscoveryConfigError` (or `GithubClientError` for the GitHub existence check) so `lib/discovery.ts` records a failed run before reconcile
- [x] T030 [US2] Make T027 pass; if a failure path reaches `reconcile`, fix it in `apps/web/src/lib/discovery.ts` so config/tree/layout errors never do
- [x] T031 [US2] Confirm messages never echo file contents beyond the offending key/path (review `messages.ts` output in the failing-case tests) and that the admin run view (`apps/web/src/collections/DiscoveryRun.ts`) shows the error text readably

**Checkpoint**: US1 + US2 — every configuration fault fails closed with a fixed message; the empty-source guard is verified for dirs-only configs.

---

## Phase 5: User Story 3 — One Consistent Explanation Everywhere (Priority: P3)

**Goal**: Every document and the Norwegian `/bidra` guide describe the same contract; the guide's
examples are tested against the real parser and matcher.

**Independent Test**: Read `/bidra` as a team with a custom layout and find the answer, the example, the
checklist and the troubleshooting entry for every new scan failure; `contribute-guide.test.ts` parses
every example with the real code.

### Tests first

- [x] T032 [US3] Extend `apps/web/tests/unit/contribute-guide.test.ts` per `contracts/guide-content.md` test hooks: (1) `EXAMPLE_KIHUB_DIRS_CONFIG` parses with `resolveDiscoveryConfig` and resolves to the documented mapping; (2) paths from `EXAMPLE_CUSTOM_LAYOUT_TREE` through real `buildLayout` + `matchArtifactDirs` return exactly the annotated artifact folders and none of the decoys; (3) `EXAMPLE_CUSTOM_LAYOUT_MANIFEST` passes `validateManifest`, its `source.path` equals the matched folder and its `type` equals the configured type; (4) every troubleshooting entry for a new failure contains a prefix from `DISCOVERY_FAILURE_PREFIXES`, and every such prefix is covered by at least one entry; (5) a plural-key `skills:` config is rejected with the hint. Replace the old regex-only nested-tree check with the real matcher for the nested example too. Tests must fail first

### Implementation — documentation

- [x] T033 [P] [US3] Update `documentation/artifact-discovery.md`: repository layout section with `artifactDirs` and the Altinn-Studio-style example, "only listed locations are scanned", limits, fail-safe additions (new failure list), operator steps to register a repository with a custom layout (source, token env var, Run now), run provenance now showing `artifactDirs`
- [x] T034 [P] [US3] Update `packages/artifact-schema/docs/artifact-manifest.md`: "Type directories" and "Artifact roots" sections gain `artifactDirs`; `type` and `source.path` rows mention configured directories; add a combined example. Do not regenerate the JSON Schema (manifest fields are unchanged)
- [x] T035 [P] [US3] Update `README.md` (discovery paragraph and `kihub.yaml` example near lines 209–230, the layout/spec index near line 113 for 028, and the manifest `source.path` note near line 417)
- [x] T036 [P] [US3] Update `CLAUDE.md`: keep the 028 active-feature block added during planning, mark specify + plan + tasks + implement status when done, and note the durable facts (container model, digest backward compatibility, `.` rejected, typed-dir conflicts fail the whole scan, error-prefix list shared with the guide test)
- [x] T037 [P] [US3] Add one-line "Extended by 028" pointers at the top of `specs/026-flexible-artifact-discovery/contracts/discovery-config-v1.md` and `contracts/scan-and-digest.md`, and a one-line note in `specs/026-flexible-artifact-discovery/spec.md` Assumptions ("per-artifact path declarations deferred; per-type directories added in 028"); do not rewrite history

### Implementation — `/bidra` guide (Norwegian)

- [x] T038 [US3] In `apps/web/src/lib/contribute-guide.ts` add `EXAMPLE_KIHUB_DIRS_CONFIG`, `EXAMPLE_CUSTOM_LAYOUT_TREE` (a `team-repo/` with `kihub.yaml`, `agents/_skills/<slug>/{SKILL.md,artifact.yaml}` and a decoy folder without manifest) and `EXAMPLE_CUSTOM_LAYOUT_MANIFEST` (type `skill`, `source.path` the full folder); extend the checklist (listed for the right type; folder exists on the branch KI Hub reads; `source.path` is the full path); extend `TROUBLESHOOTING` with «Ukjent type i kihub.yaml», «Mappen i kihub.yaml finnes ikke», «Samme mappe er oppført for to typer», «Artefaktmapper ligger inni hverandre» and extend (not duplicate) «Feil i kihub.yaml» and «type passer ikke med mappen»; update the «Feil mappedybde» fix text so it no longer claims the layout is always two levels below the root; add FAQ entries «Må vi flytte mapper?» (nei) , «Kan vi blande mapper og roter?» and «Hvorfor finner KI Hub ikke mappen min?»; import prefixes from `@kihub/discovery-core` messages where the entry quotes an error. Make T032 pass
- [x] T039 [US3] Update `apps/web/src/app/(app)/bidra/page.tsx`: add a «Har dere egne mapper?» section (server-rendered, existing Designsystemet/kihub styles, no new client component) that shows the custom-layout tree, `kihub.yaml` and manifest with the existing code-block component; adjust the lines near 243 and 297–305 that explain `kihub.yaml` roots so they describe both `artifactRoots` and `artifactDirs`; ensure heading levels and anchors stay valid
- [x] T040 [US3] Review all Norwegian copy for plain bokmål (klarspråk): short sentences, "nei, dere trenger ikke flytte mapper" as the first line of the section, no unexplained jargon; read it against `contracts/guide-content.md` claims 1–8 and tick each claim in Notes

**Checkpoint**: all three stories done; docs, manifest reference, README, CLAUDE.md and `/bidra` agree and are test-pinned.

---

## Phase 6: Polish & Full Gate

- [x] T041 Run the package gates: `pnpm --filter @kihub/discovery-core test`, `pnpm --filter @kihub/github-client test`, `pnpm --filter @kihub/artifact-schema test`, `pnpm --filter @kihub/governance-core test`
- [x] T042 Run `pnpm --filter web lint` and `pnpm --filter web exec tsc --noEmit`; fix everything introduced by this feature
- [x] T043 Run web **unit** tests (`pnpm --filter web exec vitest run tests/unit`) and then web **integration** tests (`pnpm --filter web exec vitest run tests/integration`) **separately** against `kihub_028` with the env exported (combined runs hit the known Payload/Vitest early-exit); record counts
- [x] T044 Run the production build against the migrated scratch DB: `AUTH_MODE=entra`, `DATABASE_URI` → a migrated scratch DB, `MEDIA_STORAGE_MODE=azure` env as in CI, `pnpm --filter web build`; it must compile, typecheck and generate all routes
- [x] T045 Browser check of `/bidra` via `preview_start` (mock sign-in): the new section, examples, checklist, troubleshooting and FAQ render; no console errors or hydration warnings; at 375 px width there is no horizontal page scroll; copy buttons still work
- [x] T046 Walk `quickstart.md` §§1–5 once end to end; tick SC-001…SC-007 in Notes with the evidence (test names or output)
- [x] T047 Final consistency sweep: grep the repo (outside `specs/0[0-2][0-5]*`) for statements that still say the layout under a root is the only option (`exactly two levels`, `<root>/<type>/<slug>` as the only form, `artifactRoots` as the only key) and fix or qualify each; update the Notes section of this file with decisions, deviations and what was verified or not
- [x] T048 Leave everything uncommitted for the user's review; list changed files with `git status --short` in the final report (no commit, no push, no PR)

---

## Dependencies & Execution Order

- **Phase 1** → **Phase 2** (blocks everything). Within Phase 2: T004/T005 (tests) before T006–T011; T006 before T007/T008; T007 and T008 before T009; T009 before T010/T011; T012 after T009–T011; T013 last.
- **US1 (P1)** depends on Phase 2. T014 → T015/T016/T017 (tests first) → T018; T019 → T020 → T021 → T022 → T023; T024 last.
- **US2 (P2)** depends on Phase 2 and reuses US1's fixtures; its tests (T025–T027) can be written in parallel with US1 implementation, but T028–T030 go after US1's T018 to avoid conflicting edits in `scan.ts`/`client.ts`.
- **US3 (P3)** depends on US1 + US2 for final wording and message prefixes (T006 exists from Phase 2, so T032 can start right after Phase 2). T033–T037 are independent files `[P]`; T038 → T039 → T040.
- **Polish** after all stories.

### Parallel opportunities

- Phase 2: T004 ‖ T005 (different test files); T012 ‖ nothing else touching those test files.
- US1: T014 first, then T015 ‖ T016 ‖ T017; T019 ‖ T018.
- US2: T025 ‖ T026 ‖ T027.
- US3: T033 ‖ T034 ‖ T035 ‖ T036 ‖ T037 (five different files).

## Implementation Strategy

1. **MVP = Phase 1 + 2 + US1.** That makes the Altinn Studio layout discoverable and is demonstrable
   with the local dry run (T024).
2. Add **US2** before merging anywhere: ambiguity must fail closed before any real repository is
   registered with `artifactDirs`.
3. Add **US3** so teams are told the truth; the guide must not promise behaviour that is not shipped, so
   it merges with the code.
4. Land order: 026 (PR #176) first, then 028 on top; if 026 is rebased, regenerate T021's migration
   (snapshot must contain 026's schema).

## Notes

Implementation record (2026-11-17). Nothing committed or pushed.

**Baseline (T001)**: on the 026 base discovery-core 80, github-client 11, artifact-schema 17, web unit 252.

**Change surface (T003)**: `packages/discovery-core/src/{config,scan,index}.ts` (+ new `layout.ts`,
`messages.ts`, `types.ts`), `packages/github-client/src/client.ts`, `apps/web/src/lib/discovery.ts`,
`apps/web/src/collections/DiscoveryRun.ts`, the guide files. The nine web integration fakes and the
`scanrepo.test.ts` fakes take no parameter and compile unchanged except one fake that read the roots.

**Final results (T041–T044)**: discovery-core 146 (7 files), github-client 23, artifact-schema 17,
governance-core 17, web unit 261 (22 files), web integration 187 (31 files, scratch DB `kihub_028`,
run separately from unit), web lint clean, `tsc --noEmit` clean (web and packages), `next build`
green against a freshly migrated scratch DB with `AUTH_MODE=entra` (the first run stopped on Next's own
security-advisory check for Next 16.4.1, which is unrelated to this work; a rerun compiled and generated
all 13 pages).

**Migration (T021–T023)**: `20261117_155625_discovery_run_artifact_dirs (regenerated after 026 was merged with main; first generated as `20261117_095513_…`)` — one `ADD COLUMN IF NOT EXISTS
"artifact_dirs" jsonb`, `down` with `DROP COLUMN IF EXISTS`. Generated in `MEDIA_STORAGE_MODE=azure`
(dummy Azure env, generation only). The whole chain was verified up → down → up on a fresh scratch DB
(column present, absent, present). `payload-types.ts` was generated in azure mode too, but its extra
`_objectKey` lines were dropped to keep the diff to `artifactDirs` only (the committed types predate
azure-mode generation).

**Dry run (T024)**: a mock Altinn-Studio-shaped checkout (`agents/_skills/tekstforfatter-docs` with
`artifact.yaml`, a sibling skill without one, `kihub.yaml` listing `skill: [agents/_skills]`) scanned to
exactly one valid `skill` at `agents/_skills/tekstforfatter-docs`; the quickstart one-liner works as
written.

**Browser (T045)**: `/bidra` on a worktree dev server (:3028, mock sign-in): new «egne mapper» tip and
details block, 4 new troubleshooting entries, 3 new FAQ entries, 13 quoted error fragments; no console
errors; no horizontal page overflow at 375 px with all details open.

**Decisions and deviations from the plan**

- `ResolvedDiscoveryConfig.artifactDirs` is **optional** and present only when the file uses it, so the
  026 tests that compare the resolved object pass unchanged (SC-002 literally). `data-model.md` updated.
- The nested-artifact check is **scoped** to pairs where at least one folder was found through
  `artifactDirs` (new `listed` flag on containers, `listedArtifactDirs`). 026 allowed nesting between
  root-layout artifacts (an existing reader test builds one), and FR-013 requires roots-only configs to
  behave exactly as before. Spec FR-010, research R6, the contract and the docs say so.
- Shared message fragments are called **markers** (`MARKERS`, `DISCOVERY_FAILURE_MARKERS`) rather than
  prefixes: they are fixed text inside the message, not its start. The guide quotes them in a new
  `errors` field and a unit test requires each marker to be quoted.
- `locateArtifact` also returns `containerDir` and `listed`; the type-mismatch message now reads
  `type '<t>' does not match the type '<c>' configured for '<dir>'` (no test asserted the old text; the
  two 026 assertions on it were updated).
- Parity test lives in `packages/github-client/tests/parity.test.ts` (github-client depends on
  discovery-core, not the reverse) and imports the shared fixtures from discovery-core's tests.
- `apps/web/.env` was copied into this worktree (gitignored) so tests could run; the shared `kihub` DB
  was never touched. Colima was started for this (it also restarted other projects' containers).

**Not verified**: a real GitHub scan against `Altinn/altinn-studio` (needs a token and the team's
`kihub.yaml`/`artifact.yaml` files); the production deploy path; behaviour with a real Entra sign-in.
