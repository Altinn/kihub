# Phase 0 Research: Automated Discovery Triggers

Resolves the Technical Context unknowns for Phase 4. Each decision favors the simplest option that
satisfies the phase (Constitution Principle VII) while reusing Phase 2/3 machinery.

## §1 — Scheduled-scan mechanism

**Decision**: Expose a secured internal route `POST /api/discovery/scan` that runs discovery for
all enabled sources, and invoke it on a cadence from an **external scheduler** — Azure Container
Apps scheduled job (deployed) / a documented `curl` or `pnpm` script (local dev). Cadence is
configured at the scheduler, defaulting to **daily**; the route itself is stateless.

**Rationale**: In-process cron (`node-cron`) is fragile under container restarts and multi-replica
deploys (every replica would fire). A stateless, externally-triggered endpoint matches the Azure
Container Apps target, is trivially testable (call the handler directly), and keeps "cadence" a
deployment concern rather than app code. The route is protected by a shared secret header
(distinct from webhook HMAC) so only the scheduler can invoke it.

**Alternatives considered**: Payload jobs queue + cron (adds a queue/runner to operate this phase —
deferred); `node-cron` in-process (replica fan-out + restart drift); GitHub Actions scheduled
workflow calling the endpoint (viable and documented as an option, but Azure job is the primary
deploy path).

## §2 — GitHub content fetch

**Decision**: New pure package `@kihub/github-client` exposing
`createGithubRepoReader({ repo, ref, token }): RepoReader`. It reads the repo via GitHub's REST API
using the platform `fetch` — `GET /repos/{owner}/{repo}/git/trees/{ref}?recursive=1` to enumerate
paths, then the contents/blob endpoint (raw media type) to read each `artifact.yaml` / `README.md`.
No SDK dependency is required; Octokit may be added only if pagination/rate-limit ergonomics demand
it. The reader implements the same `RepoReader` interface `discovery-core.scanRepo` consumes.

**Rationale**: The recursive git-tree call returns the whole path list in one request, so the
reader only fetches the handful of blobs discovery actually needs (`artifact.yaml` + `README.md`
per artifact dir) — cheap for a small catalog and well within rate limits with a token. Keeping the
client pure (constructor-injected `fetch` + token) makes it unit-testable with a faked `fetch` and
Payload-agnostic, mirroring `discovery-core`'s design. This is the `github-client` package the
constitution's Technology Constraints already name.

**Alternatives considered**: Tarball download + local extract (extra FS/temp handling, more moving
parts than needed for a small repo); per-path Contents API walk without the tree call (N extra
requests to discover directories); a local clone per run (defeats the point of remote fetch and
reintroduces checkout management).

## §3 — Webhook authenticity

**Decision**: Verify GitHub's `X-Hub-Signature-256` header — HMAC-SHA256 of the raw request body
keyed by the per-source webhook secret — using Node `crypto.timingSafeEqual`. On mismatch or
missing signature, return `401` and run no discovery. Only `push` events (and GitHub `ping`) are
handled; other event types are acknowledged with `204` and ignored.

**Rationale**: HMAC signature is GitHub's standard, well-documented webhook security mechanism
(chosen in Clarifications), needs no extra infrastructure, and Node `crypto` covers it with zero
new dependencies. `timingSafeEqual` avoids timing side channels. Reading the *raw* body (not the
parsed JSON) is required for a correct signature — the route must access the unparsed payload.

**Alternatives considered**: IP allowlist (no payload integrity; GitHub IP ranges shift; awkward
behind Azure ingress) — rejected in Clarifications; delivery-ID de-duplication (unnecessary because
`reconcile` is idempotent — a replayed push produces no duplicate).

## §4 — Per-source run serialization

**Decision**: Serialize runs per source with a lightweight lock on the `discovery-sources` doc: a
`runningSince` timestamp set at run start and cleared at end. `runDiscovery` refuses to start a new
run for a source whose `runningSince` is set and recent (within a staleness window that auto-clears
a crashed run), coalescing concurrent triggers. Because `reconcile` is idempotent, this is an
optimization against wasted/duplicate work and deactivation races, not a correctness crutch.

**Rationale**: A DB-flag lock is simple, visible (Admins can see a run in progress), and
self-healing via the staleness window — no external lock service. It prevents a scheduled scan and
a webhook from scanning the same source simultaneously, which could otherwise race on the
"deactivate not-seen" step.

**Alternatives considered**: Postgres advisory locks (works but opaque to the UI and harder to
surface/observe); a job queue with single-flight per key (heavier than the phase needs); no locking
+ rely purely on idempotency (risks two runs racing the deactivation set).

## §5 — Secret storage (GitHub token + webhook secret)

**Decision**: The **GitHub fetch token lives in an environment variable**; the `discovery-sources`
doc stores only the env-var *name* (e.g. `GITHUB_TOKEN_AI_ARTIFACTS`) it should read — the token
value is never persisted in the database or returned by the API. The **webhook signing secret** is
stored on the source doc but as a hidden, Admin-read-only field (`admin.hidden` + `access.read`
restricted), used server-side only for HMAC verification and never sent to the client or written
into `discovery-runs`.

**Rationale**: Keeping the long-lived token out of the DB entirely is the safest simple option and
fits the Azure app-settings/secrets model. The webhook secret must be comparable server-side per
source, so it lives with the source but is access-gated and excluded from all read surfaces. Both
are explicitly excluded from run records (FR-002/FR-001a).

**Alternatives considered**: Encrypted-at-rest field for the token in Payload (adds key management
this phase doesn't need since env vars already provide isolation); a dedicated secrets vault (Azure
Key Vault) — a sound future step, deferred as speculative for a single internal source.

## §6 — Extending `discovery-core` without breaking Phase 2

**Decision**: Introduce a `RepoReader` interface (`listArtifactDirs()`, `readFile(path)`, all async)
and `scanRepo(reader): Promise<RawArtifact[]>` holding the existing validation/`TYPE_DIRS` logic.
Reimplement the current `scan(rootPath)` as a thin wrapper over a bundled `createLocalReader(root)`
so its synchronous public behavior and the Phase 2 CLI + `scan.test.ts` remain unchanged. The
GitHub reader and the local reader are interchangeable inputs to `scanRepo`.

**Rationale**: The manifest-validation and directory-walk rules are the valuable, tested core; only
the byte-source varies. An injected reader interface is the minimal seam that lets the same logic
serve local (CLI) and remote (automated) paths, keeps `reconcile` untouched, and preserves every
Phase 2 test. A `scanrepo.test.ts` asserts parity between a fake reader and a real temp-dir scan.

**Alternatives considered**: A second parallel `scanRemote` duplicating the walk/validation
(divergence risk); moving the walk into each caller (spreads reconcile-adjacent logic); a breaking
async-only `scan` signature (would churn the CLI and Phase 2 tests for no benefit).

## Resolved unknowns

All Technical Context items are resolved; no `NEEDS CLARIFICATION` remain. Phase 4 adds one pure
package (`github-client`), extends one (`discovery-core`), adds two Payload collections, two API
routes, one Admin page, and one shared discovery-service module — reusing Phase 2 `reconcile` and
Phase 3 governance preservation unchanged.
