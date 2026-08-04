# Contract: Payload collections `discovery-sources` + `discovery-runs`

Field shapes are defined in [data-model.md](../data-model.md); this contract fixes access rules and
the write path. Both are enterprise-context/operational metadata only (Principle II).

## `discovery-sources`

- **Access**: `create`/`update`/`delete` → Admin only; `read` → Admin. Enforced via Payload
  `access` functions reading the live `users.role` (Phase 3 pattern), not UI hiding (FR-013).
- **Secret handling**: `webhookSecret` uses `admin.hidden` + restricted `access.read`; the GitHub
  token is *not* a field — only `tokenEnvVar` (its env-var name) is stored (research §5).
- **Lock field**: `runningSince` is written only by `runDiscovery`; a value older than the
  staleness window is treated as cleared (crash recovery).

## `discovery-runs`

- **Access**: `create` → server-side only (`overrideAccess` from `runDiscovery`); `read` → Admin;
  `update`/`delete` → nobody (append-only, immutable).
- **Guarantee**: exactly one doc per execution with `trigger`, `source`, `startedAt`,
  `finishedAt`, `outcome`, and the `summary` counts + id arrays (FR-010, SC-006).
- **No secrets**: token/`webhookSecret` never projected into a run doc.

## Write path (single source of truth)

`lib/discovery.ts::runDiscovery(source, trigger, actor?)`:

1. Refuse if `source.runningSince` is set & fresh (serialization, research §4); else set it.
2. Build reader — `createGithubRepoReader({ repo, ref, token: process.env[source.tokenEnvVar] })`.
3. `scanned = await scanRepo(reader)` → `report = await reconcile(payload, scanned)` (unchanged).
4. On success: write `discovery-runs` (outcome `success`, `summary`/ids from `report`); update
   source snapshot (`lastRunAt/Outcome/Summary`); clear `runningSince`.
5. On thrown error (fetch/auth/unreachable): write `discovery-runs` (outcome `failure`,
   `failureReason`); leave `artifacts` untouched (FR-009); clear `runningSince`.

## Tests (Payload integration)

- Non-Admin `create`/`update` on `discovery-sources` and `discovery-runs` read → refused
  (`discovery-access.test.ts`).
- One `runDiscovery` produces one `discovery-runs` doc + expected reconcile effects + updated
  source snapshot (`discovery-run.test.ts`).
- Two concurrent `runDiscovery` for one source → second is skipped/coalesced, no duplicate
  artifacts (`discovery-serialize.test.ts`).
