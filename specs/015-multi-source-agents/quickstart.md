# Quickstart: Validating Multi-Source Discovery & Agent Artifacts

**Feature**: 015-multi-source-agents. Runnable proof scenarios, ordered cheap → expensive.
Contracts: [manifest-v1.1](contracts/manifest-v1.1.md), [agent-card](contracts/agent-card.md),
[reconcile](contracts/reconcile.md). Field details: [data-model.md](data-model.md).

## Prerequisites

- Postgres up: colima + `kihub-postgres` container on :55432 (usually already running).
- Env exported for integration tests: `set -a; source apps/web/.env; set +a`.
- Dev server for manual checks: `pnpm --filter web dev` (mock auth → sign in as **Aria Admin**).

## 1. Package unit suites (no DB)

```bash
pnpm -r test
```

Expected: existing 43 package tests + new ones green — reconcile scoping/adoption/reassignment
(discovery-core), agent-card validation incl. size cap and per-field errors (artifact-schema),
scanRepo card fetch for agents only (discovery-core).

```bash
pnpm --filter @kihub/artifact-schema validate specs/015-multi-source-agents/fixtures/agent-artifact.yaml
```

Expected: `✓ … (digdir.support-agent, type=agent)` — the CLI accepts the new type. (Fixture from
[contracts/manifest-v1.1.md](contracts/manifest-v1.1.md); create under the feature dir or a temp
dir.)

## 2. Migration verification (scratch DB — NEVER the push-mode dev DB)

The local dev DB is push-mode; `payload migrate` against it prompts "data loss will occur".
Use a scratch DB:

```bash
docker exec kihub-postgres psql -U kihub -c 'CREATE DATABASE kihub_migtest;'
```

Then, with `DATABASE_URI` pointed at `kihub_migtest`: `pnpm --filter web migrate` (full chain
incl. the new `agents_migration`), `pnpm --filter web migrate:down`, `migrate` again — all three
must complete without error (proves the hand-patched `down`). Confirm the enum:

```bash
docker exec kihub-postgres psql -U kihub -d kihub_migtest -c "SELECT unnest(enum_range(NULL::enum_artifacts_type));"
```

Expected: eight values ending in `agent`. Also confirm `artifacts.discovery_source_id` (FK, ON
DELETE SET NULL) and `artifacts.agent_card` (jsonb) exist and are all-NULL on upgraded data
(invariant I4). Drop the scratch DB when done.

## 3. Web integration suite (live Payload + Postgres)

```bash
set -a; source apps/web/.env; set +a
pnpm --filter web test
```

Expected green, including the new integration tests:

- **Multi-source safety (US1)**: two fake-reader sources with disjoint artifacts; scans in any
  order never deactivate the other source's rows; deleting one artifact deactivates exactly it
  (SC-001/002).
- **Adoption & moves**: pre-seeded unowned row is adopted (reported `adopted`); moving an id
  between the fake sources reassigns ownership with governance row intact (`reconcile`/
  `discovery-run` reports `reassigned`).
- **Agent e2e (US2)**: `agents/<slug>/artifact.yaml` fixture → registered, `type: 'agent'`,
  visible via `listArtifacts({type:'agent'})` and `searchArtifacts`; full governance cycle on it
  (reuse the existing governance test pattern) with audit entries.
- **Card lifecycle (US3)**: valid card stored → malformed card on next scan: artifact still
  updated, `agentCard` null, run has `cardIssues` → card file removed: stays null, no issues.
- **Run reporting**: `discovery-runs` doc carries adopted/reassigned/cardIssues counts and ids.

## 4. Manual end-to-end in the browser (the user's real test plan)

1. In the **other repo** (e.g. `digdir/<your-agents-repo>`), add
   `agents/support-agent/artifact.yaml` (+ optional `agent-card.json`) per the contract examples.
2. Add the source's token env var to `apps/web/.env` (e.g. `GITHUB_TOKEN_AGENTS=<PAT with read
   access>`), restart the dev server.
3. `/cms` → **Discovery Sources** → create: name, `repo: digdir/<your-agents-repo>`, `ref: main`,
   `tokenEnvVar: GITHUB_TOKEN_AGENTS`, any `webhookSecret`.
4. `/admin/discovery` → **Run now** on the new source.
   Expected: run summary shows the created agent; the pre-existing `ai-artifacts` source's
   artifacts are **all still active** in `/registry` (the point of US1).
5. `/registry`: filter chip «Agent» appears (Norwegian labels on all type chips); the agent card
   shows the label, not the raw enum.
6. Artifact detail page: agent card section between install and README — «Ferdigheter»,
   «Egenskaper», «Grensesnitt», «Autentisering» rendered from the card; break the card in the
   repo, re-run, and the section disappears while `/admin/discovery` lists the card errors.
7. Run the **other** source ("Run now" on `ai-artifacts`): the agent stays active (SC-001).

## 5. Full gates (definition of done, per repo convention)

```bash
pnpm -r test
pnpm --filter web lint
```

Prod build — needs a **migrated scratch DB** and non-mock auth (recorded gotchas: push-mode DB
prompts; the app rejects `AUTH_MODE=mock` in production; `next build` is the only gate that has
caught type errors the suite missed):

```bash
DATABASE_URI=postgres://…/kihub_migtest AUTH_MODE=entra pnpm --filter web build
```

Expected: compiles, typechecks, generates all routes.
