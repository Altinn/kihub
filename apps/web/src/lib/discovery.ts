import { type IndexReport, reconcile, type RepoReader, scanRepo } from '@kihub/discovery-core';
import { createGithubRepoReader } from '@kihub/github-client';
import type { Role } from '@kihub/governance-core';
import type { DiscoverySource, User } from '@/payload-types';
import { APIError, type Payload } from 'payload';

export type TriggerType = 'webhook' | 'scheduled' | 'manual';

export interface RunResult {
  /** `null` when the run was skipped (source already running, or unknown source). */
  runId: number | null;
  outcome: 'success' | 'failure' | 'skipped';
  report?: IndexReport;
  failureReason?: string;
}

export interface RunDiscoveryOptions {
  /** The acting user for a `manual` trigger; recorded as `triggeredBy`. */
  actor?: User | null;
  /** Override the repo reader (tests). Defaults to a GitHub reader built from the source + env token. */
  createReader?: (source: DiscoverySource) => RepoReader;
}

function defaultReader(source: DiscoverySource): RepoReader {
  const token = process.env[source.tokenEnvVar];
  if (!token) throw new Error(`Missing fetch token env var "${source.tokenEnvVar}" for source ${source.name}`);
  return createGithubRepoReader({ repo: source.repo, ref: source.ref ?? 'main', token });
}

// --- Per-source mutual exclusion via a Postgres advisory lock (research §4) --------------------
// Payload's bulk `update({where})` is find-then-update (not atomic), so it cannot serialize
// concurrent runs. `pg_try_advisory_lock` is a true atomic test-and-set; we hold it on one
// dedicated pool connection for the whole run and release it in `finally`.

interface PgClientLike {
  query(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
  release(): void;
}
interface PgPoolLike {
  connect(): Promise<PgClientLike>;
}

// Namespace constant ("KH") keeps our advisory keys from colliding with any other subsystem's.
const ADVISORY_NAMESPACE = 0x4b48;

/** Stable signed-32-bit key from a source id, for the two-int `pg_advisory_lock` form. */
function advisoryKey(sourceId: string | number): number {
  const s = String(sourceId);
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function getPool(payload: Payload): PgPoolLike {
  return (payload.db as unknown as { pool: PgPoolLike }).pool;
}

/**
 * Run discovery for one source: acquire the advisory lock, fetch remotely, scan + reconcile (the
 * unchanged Phase 2 engine), then record a `discovery-runs` doc and update the source snapshot.
 * Shared by the webhook route, the scheduled route, and the in-app manual trigger so reconcile
 * semantics and run recording are defined exactly once (contracts/discovery-collections.md).
 *
 * On a fetch/auth/unreachable failure a `failure` run is recorded and the `artifacts` collection is
 * left intact — deactivation only happens inside a successful scan that observed the repo (FR-009).
 */
export async function runDiscovery(
  payload: Payload,
  sourceId: string | number,
  trigger: TriggerType,
  opts: RunDiscoveryOptions = {},
): Promise<RunResult> {
  const key = advisoryKey(sourceId);
  const client = await getPool(payload).connect();
  try {
    const lock = await client.query('SELECT pg_try_advisory_lock($1, $2) AS locked', [ADVISORY_NAMESPACE, key]);
    if (lock.rows[0]?.locked !== true) {
      // A fresh run already holds this source — coalesce (FR-008).
      return { runId: null, outcome: 'skipped' };
    }
    try {
      return await runLocked(payload, sourceId, trigger, opts);
    } finally {
      await client.query('SELECT pg_advisory_unlock($1, $2)', [ADVISORY_NAMESPACE, key]);
    }
  } finally {
    client.release();
  }
}

async function runLocked(
  payload: Payload,
  sourceId: string | number,
  trigger: TriggerType,
  opts: RunDiscoveryOptions,
): Promise<RunResult> {
  let source: DiscoverySource;
  try {
    source = await payload.findByID({ collection: 'discovery-sources', id: sourceId, overrideAccess: true });
  } catch {
    return { runId: null, outcome: 'skipped' }; // unknown source
  }

  const startedAt = new Date().toISOString();
  const createReader = opts.createReader ?? defaultReader;
  const triggeredBy = trigger === 'manual' && opts.actor ? opts.actor.id : undefined;

  // Best-effort display marker; the advisory lock is the real mutex.
  await payload.update({
    collection: 'discovery-sources',
    id: source.id,
    data: { runningSince: startedAt },
    overrideAccess: true,
  });

  try {
    const scanned = await scanRepo(createReader(source));
    // Source-scoped reconcile (015): ownership stamped on every upsert, deactivation limited to
    // this source's own artifacts — other sources' and unowned rows are never touched.
    const report = await reconcile(payload, scanned, { sourceId: source.id });

    const run = await payload.create({
      collection: 'discovery-runs',
      data: {
        source: source.id,
        trigger,
        triggeredBy,
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome: 'success',
        summary: {
          created: report.created.length,
          updated: report.updated.length,
          deactivated: report.deactivated.length,
          duplicates: report.duplicates.length,
          skippedInvalid: report.skippedInvalid.length,
          adopted: report.adopted.length,
          reassigned: report.reassigned.length,
          cardIssues: report.cardIssues.length,
        },
        createdIds: report.created,
        updatedIds: report.updated,
        deactivatedIds: report.deactivated,
        adoptedIds: report.adopted,
        reassignedIds: report.reassigned,
        skippedInvalid: report.skippedInvalid.map((s) => ({ path: s.path, errors: s.errors })),
        cardIssues: report.cardIssues.map((c) => ({ path: c.path, errors: c.errors })),
      },
      overrideAccess: true,
    });

    await payload.update({
      collection: 'discovery-sources',
      id: source.id,
      data: {
        lastRunAt: startedAt,
        lastRunOutcome: 'success',
        lastRunSummary: {
          created: report.created.length,
          updated: report.updated.length,
          deactivated: report.deactivated.length,
          skippedInvalid: report.skippedInvalid.length,
        },
        runningSince: null,
      },
      overrideAccess: true,
    });

    return { runId: run.id, outcome: 'success', report };
  } catch (err) {
    const failureReason = err instanceof Error ? err.message : String(err);
    const run = await payload.create({
      collection: 'discovery-runs',
      data: {
        source: source.id,
        trigger,
        triggeredBy,
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome: 'failure',
        failureReason,
      },
      overrideAccess: true,
    });
    await payload.update({
      collection: 'discovery-sources',
      id: source.id,
      data: { lastRunAt: startedAt, lastRunOutcome: 'failure', runningSince: null },
      overrideAccess: true,
    });
    return { runId: run.id, outcome: 'failure', failureReason };
  }
}

/**
 * In-app manual trigger (FR-012/FR-013) — the successor to the Phase 2 CLI. Admin-only, enforced
 * server-side on the live `users.role`; a non-Admin actor is refused (SC-008). Records the run as
 * `manual` attributed to the acting Admin.
 */
export async function triggerDiscovery(
  payload: Payload,
  sourceId: string | number,
  actor: User | null,
  opts: RunDiscoveryOptions = {},
): Promise<RunResult> {
  if (!actor || (actor.role as Role) !== 'admin') {
    throw new APIError('Only an Admin may trigger discovery', 403);
  }
  return runDiscovery(payload, sourceId, 'manual', { ...opts, actor });
}

/** Run discovery for every enabled source (scheduled scan). Returns one result per source. */
export async function runAllEnabledSources(
  payload: Payload,
  trigger: TriggerType,
  opts: RunDiscoveryOptions = {},
): Promise<{ source: string; result: RunResult }[]> {
  const { docs } = await payload.find({
    collection: 'discovery-sources',
    where: { enabled: { equals: true } },
    limit: 200,
    overrideAccess: true,
  });
  const results: { source: string; result: RunResult }[] = [];
  for (const source of docs as DiscoverySource[]) {
    results.push({ source: source.name, result: await runDiscovery(payload, source.id, trigger, opts) });
  }
  return results;
}
