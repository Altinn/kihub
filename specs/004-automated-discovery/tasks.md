---
description: "Task list for Phase 4 — Automated Discovery Triggers implementation"
---

# Tasks: Phase 4 — Automated Discovery Triggers

**Input**: Design documents from `/specs/004-automated-discovery/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included where the constitution's testing gate applies — `@kihub/github-client` and the
`scanRepo` refactor have unit tests; webhook signature verification, run recording, per-source
serialization, governance preservation, and Admin access control have Payload integration tests.
Admin UI is verified via quickstart.

**Organization**: By user story — US1=P1 webhook-driven discovery, US2=P2 scheduled catch-up scan,
US3=P3 observe & run on demand. Builds on Phase 1 (auth/roles), Phase 2 (`artifacts` collection,
`discovery-core` scan/reconcile, CLI) and Phase 3 (governance collections + re-index preservation).
The Phase 2 `reconcile` and CLI, and all Phase 3 collections, are reused **unchanged**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1 / US2 / US3 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: app in `apps/web/`, new pure GitHub reader in `packages/github-client/`, extended
indexing core in `packages/discovery-core/`, reused schema in `packages/artifact-schema/`
(untouched), reused governance in `packages/governance-core/` (untouched).

---

## Phase 1: Setup

- [X] T001 Initialize `packages/github-client` (`package.json` name `@kihub/github-client`, `type: module`, `tsconfig.json`, dep-free runtime, dev `vitest`, `test` script; mirror `packages/discovery-core` layout)
- [X] T002 [P] Add config placeholders in `apps/web/.env.example` for `GITHUB_TOKEN_AI_ARTIFACTS` (fetch token), `DISCOVERY_SCAN_KEY` (scheduled-scan header secret), and a note that each source's webhook signing secret is stored on its `discovery-sources` doc

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The source-agnostic reader, the remote GitHub client, the two new collections, and the
single shared `runDiscovery` service (fetch→scan→reconcile→record run, serialized per source) must
exist before any trigger (webhook / scheduled / manual) can be wired.

**⚠️ CRITICAL**: Blocks all user stories

- [X] T003 [P] Refactor `packages/discovery-core/src/scan.ts` per contracts/discovery-core-scanrepo.md: extract a `RepoReader` interface (`listArtifactDirs()`, `readFile(path)`, async) + `scanRepo(reader)` holding the `TYPE_DIRS`/manifest-validation logic; add `createLocalReader(rootPath)`; reimplement `scan(rootPath)` as a thin wrapper so its public behavior is unchanged; export `RepoReader`, `scanRepo`, `createLocalReader` from `packages/discovery-core/src/index.ts` (`reconcile` untouched)
- [X] T004 [P] Unit test `packages/discovery-core/tests/scanrepo.test.ts`: `scanRepo(fakeReader)` output equals `scan(tempDir)` for the same fixtures incl. an invalid-manifest case; confirm existing `scan.test.ts` and `reconcile.test.ts` remain green (depends on T003)
- [X] T005 Implement `packages/github-client/src/client.ts` `createGithubRepoReader({ repo, ref, token, fetchImpl })` returning a `RepoReader` per contracts/github-client.md (recursive git-tree call to list `artifact.yaml` dirs; raw blob read for `readFile`, `404`→`undefined`, other errors throw; `Authorization: Bearer`; token never in thrown messages); export from `packages/github-client/src/index.ts` (depends on T003 for the `RepoReader` type)
- [X] T006 [P] Unit test `packages/github-client/tests/client.test.ts` with an injected fake `fetch`: tree response → correct `listArtifactDirs()`; blob read returns contents; `404`→`undefined`; `500`→throws; token absent from error output (depends on T005)
- [X] T007 [P] Create the `discovery-sources` Payload collection in `apps/web/src/collections/DiscoverySource.ts` per data-model.md (`name` unique, `repo`, `ref` default `main`, `tokenEnvVar`, `webhookSecret` with `admin.hidden` + Admin-only `access.read`, `enabled`, `runningSince`, `lastRunAt`, `lastRunOutcome`, `lastRunSummary`; access create/update/delete=Admin, read=Admin reading live `users.role`; secret/token material excluded from all read responses)
- [X] T008 [P] Create the `discovery-runs` Payload collection in `apps/web/src/collections/DiscoveryRun.ts` per data-model.md (`source` rel, `trigger`, `triggeredBy` rel, `startedAt`, `finishedAt`, `outcome`, `failureReason`, `summary` group counts, `createdIds`/`updatedIds`/`deactivatedIds` arrays, `skippedInvalid` array; access create=server-side only, read=Admin, update/delete=false — append-only)
- [X] T009 Register `DiscoverySource` and `DiscoveryRun` in `apps/web/src/payload.config.ts`, and add `@kihub/github-client` (+ ensure `@kihub/discovery-core`) as workspace deps in `apps/web/package.json` (depends on T007, T008)
- [X] T010 Implement the shared service `apps/web/src/lib/discovery.ts` `runDiscovery(source, trigger, actor?)` per contracts/discovery-collections.md: refuse if `source.runningSince` set & fresh (per-source serialization with staleness window) else set it; build `createGithubRepoReader({ repo, ref, token: process.env[source.tokenEnvVar] })`; `scanRepo` → `reconcile(payload, scanned)` (unchanged); on success write a `discovery-runs` doc + update the source snapshot; on thrown fetch/auth/unreachable error write a `failure` run and leave `artifacts` untouched; always clear `runningSince`; never write secrets into the run (depends on T003, T005, T007, T008, T009)
- [X] T011 [P] Integration test `apps/web/tests/integration/discovery-run.test.ts`: one `runDiscovery` produces exactly one `discovery-runs` doc with correct trigger/summary + the expected reconcile effects + updated source snapshot; the failure path records `outcome:failure`+`failureReason` and does **not** deactivate existing artifacts (depends on T010)
- [X] T012 [P] Integration test `apps/web/tests/integration/discovery-serialize.test.ts`: two overlapping `runDiscovery` calls for one source → the second is skipped/coalesced and no duplicate catalog entries result (depends on T010)
- [X] T013 [P] Extend/confirm `apps/web/tests/integration/reindex-preserves.test.ts` covers an automated `runDiscovery` path (Phase 3 governance state on an artifact survives an automated re-scan) (depends on T010)

**Checkpoint**: Remote fetch + reconcile + run recording work behind one service; triggers can now be wired

---

## Phase 3: User Story 1 - Webhook-driven discovery (Priority: P1) 🎯 MVP

**Goal**: A push to a configured source fires an authenticated webhook that automatically
re-discovers and reconciles the catalog, with governance preserved and the run recorded.

**Independent Test**: Deliver a validly-signed `push` notification → catalog reconciles + a
`discovery-runs` doc appears; a wrong/missing signature is rejected with no run; a replay creates no
duplicates.

### Tests for User Story 1 ⚠️

- [X] T014 [US1] Integration test `apps/web/tests/integration/discovery-webhook.test.ts` (write first, must fail): a request to `/api/discovery/webhook/[sourceId]` with a valid `X-Hub-Signature-256` → `202` + one `discovery-runs` doc; invalid/missing signature → `401` and **no** run (SC-002); replayed body → no duplicate entries; `ping` → `204`; unknown/disabled `[sourceId]` → `404`

### Implementation for User Story 1

- [X] T015 [US1] Implement `apps/web/src/app/api/discovery/webhook/[sourceId]/route.ts` per contracts/discovery-routes.md: select the `discovery-sources` doc from the **`[sourceId]` path segment** (trusted URL — never the request body), read the **raw** body, verify HMAC-SHA256(rawBody, `source.webhookSecret`) against `X-Hub-Signature-256` using `crypto.timingSafeEqual`, reject with `401` on mismatch; only after the signature passes, parse the body for event routing; `ping`→`204`, `push`→`runDiscovery(source,'webhook')`→`202`, other events→`204`, unknown/disabled `[sourceId]`→`404` (depends on T010)

**Checkpoint**: US1 fully functional — the catalog self-updates on push; this is the deployable MVP

---

## Phase 4: User Story 2 - Scheduled catch-up scan (Priority: P2)

**Goal**: On a configurable cadence, every enabled source is scanned so the catalog converges even
when a webhook was missed or a source was connected after it already had artifacts.

**Independent Test**: Introduce drift with no webhook delivered, invoke the scheduled scan, and
confirm the catalog converges; a wrong scan key is rejected with no run.

### Tests for User Story 2 ⚠️

- [X] T016 [US2] Integration test `apps/web/tests/integration/discovery-scan.test.ts` (write first, must fail): valid `X-Discovery-Scan-Key` → `runDiscovery` for all enabled sources + catalog converges (SC-004); wrong/missing key → `401` and no run

### Implementation for User Story 2

- [X] T017 [US2] Implement `apps/web/src/app/api/discovery/scan/route.ts` per contracts/discovery-routes.md: verify the `X-Discovery-Scan-Key` header against `process.env.DISCOVERY_SCAN_KEY` (`401` on mismatch), iterate all `enabled` `discovery-sources` calling `runDiscovery(source,'scheduled')`, respond `200` with a per-source outcome summary (depends on T010)
- [X] T018 [P] [US2] Add a `scan` script to `apps/web/package.json` that POSTs to `/api/discovery/scan` with the key header for local dev, and document the deployed scheduler wiring in quickstart.md per research §1. **The recurring invocation itself lives outside the app** (Azure Container Apps scheduled job, default daily) — the doc MUST name this as an explicit deploy-time configuration + owner so FR-006's "recurring cadence" is not left unowned; the app only guarantees the endpoint + per-run reconcile, and the scheduler's absence degrades gracefully to webhook-only freshness

**Checkpoint**: US1 + US2 both work — event-driven freshness plus a scheduled safety net

---

## Phase 5: User Story 3 - Observe & run on demand (Priority: P3)

**Goal**: An Admin can see per-source discovery status and run history, and trigger an immediate run
(the successor to the Phase 2 CLI); non-Admins cannot.

**Independent Test**: As Admin, view `/admin/discovery` status + history and click "Run now" → a
`manual` run appears attributed to you; as a non-Admin the trigger/config is refused.

### Tests for User Story 3 ⚠️

- [X] T019 [US3] Integration test `apps/web/tests/integration/discovery-access.test.ts` (write first, must fail): non-Admin `triggerDiscovery` / `discovery-sources` create-update / `discovery-runs` read are refused server-side (SC-008); Admin is allowed and a `manual` run records `triggeredBy`

### Implementation for User Story 3

- [X] T020 [US3] Implement the `triggerDiscovery(sourceId)` Server Action in `apps/web/src/lib/discovery.ts`: Admin gate on the live `users.role` (Phase 3 pattern), then `runDiscovery(source,'manual',actor)` with `triggeredBy` = acting Admin; refuse non-Admin (depends on T010)
- [X] T021 [P] [US3] Create `apps/web/src/components/DiscoveryRunSummary.tsx` (Designsystemet only): render a run's outcome + created/updated/deactivated/skipped-invalid counts and failure reason
- [X] T022 [P] [US3] Create `apps/web/src/components/DiscoverySourceCard.tsx` (Designsystemet only): source name, last-run time/outcome, and a "Run now" control invoking `triggerDiscovery`
- [X] T023 [US3] Create `apps/web/src/app/(app)/admin/discovery/page.tsx` (Admin-only route, mirroring `(app)/admin/roles`): list source cards + a run-history list using the two components; non-Admins are redirected/refused (depends on T020, T021, T022)

**Checkpoint**: All three trigger paths (webhook, scheduled, manual) live and observable

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T024 [P] Run all quickstart.md scenarios 1–5 end-to-end (webhook, scheduled, manual, governance-preserved, failure isolation) and confirm expected outcomes
- [X] T025 [P] Update `apps/web` docs/README: automated discovery triggers, required env vars (`GITHUB_TOKEN_AI_ARTIFACTS`, `DISCOVERY_SCAN_KEY`, per-source webhook secret), and that `pnpm --filter web index` (local checkout) is now a retained break-glass fallback
- [X] T026 Workspace typecheck + lint (`tsc --noEmit` across packages/apps) to confirm the `discovery-core` reader refactor did not break the CLI or any consumer

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately.
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**.
- **User Stories (Phase 3–5)**: all depend on Foundational (specifically `runDiscovery`, T010).
  Once T010 lands, US1/US2/US3 can proceed in parallel.
- **Polish (Phase 6)**: depends on the targeted user stories being complete.

### User Story Dependencies

- **US1 (P1)**: only the webhook route (T015) atop T010 — independently testable. MVP.
- **US2 (P2)**: only the scan route (T017) atop T010 — independent of US1.
- **US3 (P3)**: the Server Action + admin UI atop T010 — independent of US1/US2 (though it observes
  the runs they produce).

### Within Each User Story

- Tests written first and failing before implementation.
- `runDiscovery` (T010) is the shared prerequisite for every trigger.

### Parallel Opportunities

- Setup: T002 ∥ T001.
- Foundational: T003 ∥ T007 ∥ T008 (different files); T005 after T003; T004/T006 after their impls;
  T009 after T007/T008; T010 after T003/T005/T009; T011/T012/T013 ∥ after T010.
- After T010: US1 (T014→T015), US2 (T016→T017, T018 ∥), US3 (T019→T020, T021 ∥ T022, then T023)
  can all run in parallel by different developers.
- Components T021 ∥ T022.

---

## Parallel Example: Foundational core

```bash
# After T003 (reader refactor), these can proceed together:
Task: "Create discovery-sources collection in apps/web/src/collections/DiscoverySource.ts"   # T007
Task: "Create discovery-runs collection in apps/web/src/collections/DiscoveryRun.ts"          # T008
Task: "Implement createGithubRepoReader in packages/github-client/src/client.ts"              # T005
```

## Parallel Example: User stories after Foundational

```bash
# Once T010 (runDiscovery) is merged, in parallel:
Task: "US1 webhook route + signature test"      # T014 → T015
Task: "US2 scheduled scan route + key test"     # T016 → T017
Task: "US3 admin UI + trigger action + access test"  # T019 → T020 → T021/T022 → T023
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → 2. Phase 2 Foundational (T003–T013, incl. `runDiscovery`) → 3. Phase 3 US1
   (webhook) → 4. **STOP & VALIDATE**: push to the source auto-updates the catalog, runs recorded,
   governance preserved. Deploy/demo.

### Incremental Delivery

1. Setup + Foundational → the discovery service works (testable via `runDiscovery`).
2. US1 webhook → self-updating catalog (MVP).
3. US2 scheduled scan → convergence safety net.
4. US3 admin observability + manual trigger → operable + CLI successor.
5. Polish → quickstart validation, docs, workspace typecheck.

---

## Notes

- [P] = different files, no incomplete dependencies.
- Reuse is deliberate: `reconcile` (Phase 2) and all Phase 3 governance collections are **unchanged**;
  the only `discovery-core` change is the reader seam (T003), covered by a parity test (T004).
- The Phase 2 CLI (`scripts/index-artifacts.ts`) is retained untouched as a break-glass fallback.
- Secrets (GitHub token via env, per-source webhook secret) never appear in run records or the UI.
- Commit after each task or logical group; stop at any checkpoint to validate independently.
