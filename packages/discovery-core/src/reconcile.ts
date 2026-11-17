import { buildRecord } from './record';
import type { RawArtifact } from './scan';

export interface IndexReport {
  created: string[];
  updated: string[];
  deactivated: string[];
  skippedInvalid: { path: string; errors: string[] }[];
  duplicates: string[];
  /** Previously-unowned (legacy) ids stamped with this scan's source (015 FR-003). */
  adopted: string[];
  /** Ids taken over from another source — a move or a cross-source duplicate (015 FR-004/005). */
  reassigned: string[];
  /** Agent-card validation problems per path — the artifact itself registered (015 FR-012). */
  cardIssues: { path: string; errors: string[] }[];
  /** Existing artifacts whose previous non-null content digest changed during this scan. */
  revisionChanged: string[];
}

/**
 * Minimal Payload Local API surface used by reconcile — kept narrow so it is easy to fake in
 * tests. `find()`'s return type is intentionally loose (`docs: unknown[]`): the real `Payload`
 * instance's `find()` is generic over the full collection-slug union, and a narrower return type
 * here stops structurally matching it as more collections are added elsewhere in the app. Callers
 * within this file cast each `docs[]` entry to the shape they know the 'artifacts' collection has.
 */
export interface PayloadLike {
  find(args: {
    collection: string;
    where?: unknown;
    limit?: number;
    pagination?: boolean;
    depth?: number;
    overrideAccess?: boolean;
  }): Promise<{ docs: unknown[] }>;
  create(args: { collection: string; data: unknown; overrideAccess?: boolean }): Promise<unknown>;
  update(args: {
    collection: string;
    id: string | number;
    data: unknown;
    overrideAccess?: boolean;
  }): Promise<unknown>;
}

export interface ReconcileOptions {
  /**
   * The discovery source whose repo was just scanned (015 contract: source-scoped reconcile).
   * Required so a forgotten value can never silently restore the pre-015 global deactivation.
   * Upserts are stamped with it (ownership-by-last-sighting) and deactivation is scoped to it.
   * Pass `null` ONLY for the break-glass local indexer: upserts then leave ownership untouched
   * (new rows stay unowned/adoptable) and nothing is ever deactivated.
   */
  sourceId: number | string | null;
  /** Explicit one-run override for intentionally reconciling a non-empty source to zero valid ids. */
  allowEmptySource?: boolean;
}

interface ArtifactDoc {
  id: string | number;
  artifactId: string;
  /** Scalar id at depth 0; tolerated as a populated `{ id }` object for safety. */
  discoverySource?: number | string | { id: number | string } | null;
  contentDigest?: string | null;
  /** Manifest source metadata; `path` is the discovered directory at the last valid sighting. */
  source?: { path?: string | null } | null;
}

/** Refuses an incomplete/accidentally empty source observation before reconcile performs writes. */
export class UnsafeEmptyScanError extends Error {
  constructor(sourceId: number | string, activeCount: number) {
    super(
      `Refusing empty scan for source ${sourceId}: it currently owns ${activeCount} active artifact${activeCount === 1 ? '' : 's'}`,
    );
    this.name = 'UnsafeEmptyScanError';
  }
}

/** The row's owning source id, normalising a populated relationship down to its id. */
function ownerIdOf(doc: ArtifactDoc): number | string | null {
  const v = doc.discoverySource;
  if (v && typeof v === 'object') return v.id ?? null;
  return v ?? null;
}

const sameId = (a: number | string, b: number | string) => String(a) === String(b);

/**
 * Rows indexed before 026 stored `source.path` unvalidated (e.g. "./skills/x/"); compare loosely.
 * Index scans, not regexes: `/\/+$/` backtracks quadratically on long runs of "/" (CodeQL).
 */
function looseRepoPath(value: string): string {
  let start = 0;
  while (value.startsWith('./', start)) start += 2;
  let end = value.length;
  while (end > start && value[end - 1] === '/') end -= 1;
  return value.slice(start, end);
}

/**
 * Reconcile the catalog with a scan of ONE source (contracts/reconcile.md): create/update by
 * stable artifactId, stamp `discoverySource` on every upsert (adopting unowned rows, reassigning
 * moved ones), soft-deactivate only this source's artifacts that are no longer present, detect
 * duplicate ids (first wins), pass through invalid manifests. Idempotent; never deletes; never
 * touches other sources' or unowned rows in the deactivation pass.
 */
export async function reconcile(
  payload: PayloadLike,
  scanned: RawArtifact[],
  opts: ReconcileOptions,
): Promise<IndexReport> {
  const report: IndexReport = {
    created: [],
    updated: [],
    deactivated: [],
    skippedInvalid: [],
    duplicates: [],
    adopted: [],
    reassigned: [],
    cardIssues: [],
    revisionChanged: [],
  };
  const { sourceId, allowEmptySource = false } = opts;

  for (const s of scanned) {
    if (!s.valid) report.skippedInvalid.push({ path: s.path, errors: s.errors ?? [] });
    else if (s.agentCardErrors?.length) {
      report.cardIssues.push({ path: s.path, errors: s.agentCardErrors });
    }
  }

  // Safety is evaluated before any create/update/deactivate call. Duplicate ids count once, exactly
  // like the main loop's first-wins semantics.
  const validUniqueIds = new Set(
    scanned.filter((item) => item.valid && item.manifest).map((item) => item.manifest!.id),
  );
  let activeOwnedDocs: ArtifactDoc[] = [];
  if (sourceId !== null) {
    const active = await payload.find({
      collection: 'artifacts',
      where: { and: [{ active: { equals: true } }, { discoverySource: { equals: sourceId } }] },
      // Every owned row: a capped page would leave rows past it un-deactivated forever.
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    activeOwnedDocs = active.docs as ArtifactDoc[];
    if (activeOwnedDocs.length > 0 && validUniqueIds.size === 0 && !allowEmptySource) {
      throw new UnsafeEmptyScanError(sourceId, activeOwnedDocs.length);
    }
  }

  const seen = new Set<string>();
  const now = new Date().toISOString();

  for (const s of scanned) {
    if (!s.valid || !s.manifest) continue;
    const id = s.manifest.id;
    if (seen.has(id)) {
      report.duplicates.push(id);
      continue;
    }
    seen.add(id);

    const data: Record<string, unknown> = {
      ...buildRecord(s.manifest, s.readme ?? '', s.contentDigest ?? ''),
      active: true,
      lastIndexedAt: now,
      // Card storage on EVERY upsert (015 FR-011/012 + analyze C2): non-agents and agents with a
      // missing/invalid card get null — stale cards survive neither a re-scan nor a type change.
      agentCard: s.agentCard ?? null,
    };
    if (sourceId !== null) data.discoverySource = sourceId;

    const existing = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: id } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    });
    const existingDoc = existing.docs[0] as ArtifactDoc | undefined;

    if (existingDoc) {
      // Read the previous owner BEFORE the update — the update overwrites it.
      const prevOwner = ownerIdOf(existingDoc);
      if (
        existingDoc.contentDigest &&
        s.contentDigest &&
        existingDoc.contentDigest !== s.contentDigest
      ) {
        report.revisionChanged.push(id);
      }
      await payload.update({
        collection: 'artifacts',
        id: existingDoc.id,
        data,
        overrideAccess: true,
      });
      report.updated.push(id);
      if (sourceId !== null) {
        if (prevOwner === null) report.adopted.push(id);
        else if (!sameId(prevOwner, sourceId)) report.reassigned.push(id);
      }
    } else {
      await payload.create({ collection: 'artifacts', data, overrideAccess: true });
      report.created.push(id);
    }
  }

  // Soft-deactivate previously-active artifacts not seen in this run — scoped to the scanned
  // source. Rows owned by other sources or unowned (legacy) rows are never candidates (FR-002),
  // and the break-glass mode (sourceId null) owns no source, so it deactivates nothing.
  // A row whose directory is still present but whose manifest is now invalid is kept active: an
  // authoring error (reported in skippedInvalid) must not silently unpublish the artifact.
  if (sourceId !== null) {
    const invalidPaths = new Set(scanned.filter((s) => !s.valid).map((s) => looseRepoPath(s.path)));
    for (const doc of activeOwnedDocs) {
      const storedPath = doc.source?.path;
      const stillPresent = Boolean(storedPath && invalidPaths.has(looseRepoPath(storedPath)));
      if (!seen.has(doc.artifactId) && !stillPresent) {
        await payload.update({
          collection: 'artifacts',
          id: doc.id,
          data: { active: false },
          overrideAccess: true,
        });
        report.deactivated.push(doc.artifactId);
      }
    }
  }

  return report;
}
