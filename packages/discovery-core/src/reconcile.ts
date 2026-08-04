import { buildRecord } from './record';
import type { RawArtifact } from './scan';

export interface IndexReport {
  created: string[];
  updated: string[];
  deactivated: string[];
  skippedInvalid: { path: string; errors: string[] }[];
  duplicates: string[];
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

interface ArtifactDoc {
  id: string | number;
  artifactId: string;
}

/**
 * Reconcile the catalog with a scan (contracts/indexer.md): create/update by stable artifactId,
 * soft-deactivate artifacts no longer present, detect duplicate ids (first wins), pass through
 * invalid manifests. Idempotent; never deletes.
 */
export async function reconcile(payload: PayloadLike, scanned: RawArtifact[]): Promise<IndexReport> {
  const report: IndexReport = {
    created: [],
    updated: [],
    deactivated: [],
    skippedInvalid: [],
    duplicates: [],
  };

  for (const s of scanned) {
    if (!s.valid) report.skippedInvalid.push({ path: s.path, errors: s.errors ?? [] });
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

    const data = { ...buildRecord(s.manifest, s.readme ?? ''), active: true, lastIndexedAt: now };
    const existing = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: id } },
      limit: 1,
      overrideAccess: true,
    });
    const existingDoc = existing.docs[0] as ArtifactDoc | undefined;

    if (existingDoc) {
      await payload.update({
        collection: 'artifacts',
        id: existingDoc.id,
        data,
        overrideAccess: true,
      });
      report.updated.push(id);
    } else {
      await payload.create({ collection: 'artifacts', data, overrideAccess: true });
      report.created.push(id);
    }
  }

  // Soft-deactivate previously-active artifacts not seen in this run.
  const active = await payload.find({
    collection: 'artifacts',
    where: { active: { equals: true } },
    limit: 1000,
    overrideAccess: true,
  });
  for (const raw of active.docs) {
    const doc = raw as ArtifactDoc;
    if (!seen.has(doc.artifactId)) {
      await payload.update({
        collection: 'artifacts',
        id: doc.id,
        data: { active: false },
        overrideAccess: true,
      });
      report.deactivated.push(doc.artifactId);
    }
  }

  return report;
}
