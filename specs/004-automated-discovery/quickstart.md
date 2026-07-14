# Quickstart: Automated Discovery Triggers (validation guide)

Proves Phase 4 end-to-end: automated triggers drive the existing reconcile against a **remote**
source, runs are recorded and observable, secrets stay hidden, and Phase 3 governance survives a
re-scan. Assumes Phase 1–3 running locally (`AUTH_MODE=mock`, an Admin persona available).

## Prerequisites

- `apps/web` dev server running against local Postgres (Phase 1 setup).
- A GitHub token with read access to the artifact repo, exported as the env var named by the
  source's `tokenEnvVar` (e.g. `GITHUB_TOKEN_AI_ARTIFACTS=…`).
- A scheduled-scan key exported (e.g. `DISCOVERY_SCAN_KEY=…`).
- One `discovery-sources` doc created (Admin UI or seed): `repo=digdir/ai-artifacts`, `ref=main`,
  `tokenEnvVar=GITHUB_TOKEN_AI_ARTIFACTS`, a `webhookSecret`, `enabled=true`.

## Scenario 1 — Webhook-driven discovery (US1, FR-001/002/003)

1. Compute a valid signature: `sha256=` + HMAC-SHA256 of a sample `push` body keyed by the source's
   `webhookSecret`. `POST /api/discovery/webhook` with header `X-Hub-Signature-256`.
2. **Expect**: `202`; a new `discovery-runs` doc (`trigger:webhook`, `outcome:success`) with
   created/updated/deactivated counts matching the repo; catalog listing reflects the changes.
3. Re-POST the same body (replay) → **no duplicate** catalog entries (idempotent reconcile).
4. POST with a **wrong/missing** signature → `401`, and **no** new `discovery-runs` doc (SC-002).

## Scenario 2 — Scheduled catch-up (US2, FR-006/007)

1. Introduce drift: change the repo with no webhook delivered.
2. `POST /api/discovery/scan` with header `X-Discovery-Scan-Key: $DISCOVERY_SCAN_KEY`.
3. **Expect**: `200`; catalog converges to the repo's true state; a `discovery-runs` doc with
   `trigger:scheduled`. A wrong key → `401`, no run.

## Scenario 3 — Observe & run on demand (US3, FR-010/011/012/013)

1. As **Admin**, open `/admin/discovery`: see the source card (last run time, outcome) and run
   history with per-run summaries.
2. Click **Run now** → a new `discovery-runs` doc with `trigger:manual` and `triggeredBy` = you.
3. As a **non-Admin** persona, attempt the trigger action / source edit → **refused** (SC-008).
4. Inspect a run doc and the source API response → **no** `webhookSecret` or token present.

## Scenario 4 — Governance preserved on auto-run (FR-004/005)

1. Ensure an artifact has Phase 3 governance state (owner, lifecycle, a review).
2. Trigger any discovery run (webhook/scheduled/manual).
3. **Expect**: technical metadata updates; the artifact's `catalog-entries`/`reviews`/`audit-log`
   are **unchanged**; a newly-added artifact appears with a default governance record.

## Scenario 5 — Failure isolation (FR-009, SC-009)

1. Point the source at an unreachable repo / revoke the token; trigger a run.
2. **Expect**: a `discovery-runs` doc with `outcome:failure` + `failureReason`; existing catalog
   entries are **not** mass-deactivated.
3. With a valid repo containing one invalid `artifact.yaml`, trigger a run → that artifact is
   skipped+reported, all valid artifacts still reconciled.

## Automated checks

- Unit: `pnpm --filter @kihub/github-client test`, `pnpm --filter @kihub/discovery-core test`
  (incl. new `scanrepo` parity test).
- Integration: `pnpm --filter web test` — `discovery-webhook`, `discovery-run`, `discovery-access`,
  `discovery-serialize`, and the existing `reindex-preserves` (still green).

## Fallback (CLI retained)

- `AI_ARTIFACTS_PATH=../ai-artifacts pnpm --filter web index` still works against a local checkout
  (break-glass path; unchanged from Phase 2).
