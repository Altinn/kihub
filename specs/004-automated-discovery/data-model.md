# Phase 1 Data Model: Automated Discovery Triggers

Two new Payload collections. Both hold operational/connection metadata only — never artifact
content (Principle I) — and are separate from the technical `artifacts` record and the Phase 3
governance collections. The Phase 2 `artifacts` collection is reconciled by discovery but its
**shape is unchanged**.

## Collection: `discovery-sources`

A configured connection to an artifact repository on GitHub that discovery scans. Admin-managed.

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `name` | text (required, unique) | Human label, e.g. `ai-artifacts`. |
| `repo` | text (required) | `owner/repo`, e.g. `digdir/ai-artifacts`. |
| `ref` | text (default `main`) | Branch/ref to scan. |
| `tokenEnvVar` | text (required) | Name of the env var holding the GitHub fetch token (value never stored — research §5). |
| `webhookSecret` | text (required) | HMAC signing secret. Hidden + Admin-read-only; never returned to client or written to runs (research §5). |
| `enabled` | checkbox (default `true`) | Disabled sources are skipped by scheduled scans and webhooks. |
| `runningSince` | date (nullable) | Per-source run lock (research §4); set at run start, cleared at end; stale value auto-clears. |
| `lastRunAt` | date (nullable) | Snapshot of the most recent run start (denormalized from `discovery-runs` for quick listing). |
| `lastRunOutcome` | select (`success` \| `failure`, nullable) | Snapshot of the most recent run outcome. |
| `lastRunSummary` | group (nullable) | Snapshot counts: `created`, `updated`, `deactivated`, `skippedInvalid`. |

**Access (Payload)**: create/update/delete → Admin only (FR-013). read → Admin (source config,
incl. status) — non-Admins have no discovery UI this phase. `webhookSecret` and any token material
are excluded from all read responses.

**Relationships**: none hard-linked; discovery reconciles `artifacts` by stable `artifactId`, not
by a FK from source to artifact.

## Collection: `discovery-runs`

An append-only record of one discovery execution — the observability/audit history (FR-010).

| Field | Type | Notes / Validation |
|-------|------|--------------------|
| `source` | relationship → `discovery-sources` (required) | Which source was scanned. |
| `trigger` | select (required) | `webhook` \| `scheduled` \| `manual`. |
| `triggeredBy` | relationship → `users` (nullable) | Set for `manual` (the Admin actor); null for machine triggers. |
| `startedAt` | date (required) | Run start. |
| `finishedAt` | date (nullable) | Run end; null while running / if the process died. |
| `outcome` | select (required) | `success` \| `failure`. |
| `failureReason` | text (nullable) | Populated on `failure` (e.g. source unreachable, auth error). |
| `summary` | group | `created` `updated` `deactivated` `duplicates` `skippedInvalid` — counts (mirrors Phase 2 `IndexReport`). |
| `createdIds` / `updatedIds` / `deactivatedIds` | array<text> | Affected stable artifact IDs. |
| `skippedInvalid` | array<group> | `{ path, errors[] }` for manifests that failed validation. |

**Access (Payload)**: create → server-side only (written by `runDiscovery`, `overrideAccess`).
read → Admin. update/delete → none (append-only; runs are immutable once written).

**Invariants**:
- Exactly one `discovery-runs` doc per completed (or failed) execution (FR-010, SC-006).
- No secret material (token, `webhookSecret`) ever appears in a run doc (research §5).
- A `failure` run leaves `artifacts` untouched — deactivation happens only within a `success` scan
  that actually observed the repo (FR-009).

## Reused / unchanged entities

- **`artifacts` (Phase 2)** — created/updated/deactivated by `reconcile` keyed on `artifactId`;
  shape unchanged. Automated runs use the identical reconcile path as the CLI.
- **`catalog-entries` / `reviews` / `audit-log` (Phase 3)** — untouched by discovery; the re-index
  preservation guarantee (governance state survives a re-scan) is inherited unchanged (FR-004).
- **`users` (Phase 1/3)** — `triggeredBy` references the acting Admin for manual runs; role gate
  reuses the Phase 3 five-role model.

## Derived / transient types (packages)

- **`RepoReader`** (`@kihub/discovery-core`) — interface: `listArtifactDirs()`,
  `readFile(path)` (async). Implemented by `createLocalReader(root)` (bundled) and
  `createGithubRepoReader(...)` (`@kihub/github-client`). Not persisted.
- **`RawArtifact`** / **`IndexReport`** (`@kihub/discovery-core`) — unchanged from Phase 2; the run
  `summary`/id arrays are projected from `IndexReport`.
