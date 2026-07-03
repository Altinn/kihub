import { buildRecord } from './record';
import type { RawArtifact } from './scan';

export interface IndexReport {
  created: string[];
  updated: string[];
  deactivated: string[];
  skippedInvalid: { path: string; errors: string[] }[];
  duplicates: string[];
}

/** Minimal Payload Local API surface used by reconcile — kept narrow so it is easy to fake in tests. */
export interface PayloadLike {
  find(args: {
    collection: string;
    where?: unknown;
    limit?: number;
    overrideAccess?: boolean;
  }): Promise<{ docs: Array<{ id: string | number; artifactId: string }> }>;
  create(args: { collection: string; data: unknown; overrideAccess?: boolean }): Promise<unknown>;
  update(args: {
    collection: string;
    id: string | number;
    data: unknown;
    overrideAccess?: boolean;
  }): Promise<unknown>;
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

    if (existing.docs[0]) {
      await payload.update({
        collection: 'artifacts',
        id: existing.docs[0].id,
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
  for (const doc of active.docs) {
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
