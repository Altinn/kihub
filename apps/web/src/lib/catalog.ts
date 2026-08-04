import config from '@payload-config';
import { getPayload } from 'payload';
import type { Where } from 'payload';

export interface CatalogFilters {
  /** Artifact type (skill/prompt/…). */
  type?: string;
  /** One or more tags; an artifact must carry all of them. */
  tags?: string[];
  /** Category facet — derived from `type` this phase (alias of `type`). */
  category?: string;
}

async function payloadClient() {
  return getPayload({ config });
}

/**
 * List active catalog artifacts, optionally narrowed by type/tags/category. Filters AND together;
 * inactive (removed-from-repo) artifacts are always excluded. Category is type-derived (Phase 2),
 * so it maps onto the `type` constraint.
 */
export async function listArtifacts(filters: CatalogFilters = {}) {
  const payload = await payloadClient();

  const and: Where[] = [{ active: { equals: true } }];
  const type = filters.type ?? filters.category;
  if (type) and.push({ type: { equals: type } });

  const result = await payload.find({
    collection: 'artifacts',
    where: { and },
    sort: 'name',
    limit: 200,
    overrideAccess: true,
  });

  // Tag AND-filtering in app code: a hasMany field doesn't AND multiple `in` conditions reliably.
  if (filters.tags?.length) {
    const required = filters.tags;
    return result.docs.filter((doc) => {
      const tags = ((doc as { tags?: string[] }).tags ?? []) as string[];
      return required.every((t) => tags.includes(t));
    });
  }
  return result.docs;
}

/**
 * Resolve a list of stable artifact ids to active catalog docs, honoring the same governance rules
 * `listArtifacts` uses (active-only + read access; visibility is `internal` this phase so every
 * employee sees every active artifact) and the same type/tag/category AND-filter. Docs are returned
 * in the order of the input `ids` (i.e. full-text relevance order); ids that don't resolve
 * (deactivated / removed / filtered out) are dropped. Governance stays authoritative at query time —
 * the vector/full-text layer only proposes candidates, this decides what is shown (Phase 5 FR-009/010).
 */
export async function resolveByArtifactIds(ids: string[], filters: CatalogFilters = {}) {
  if (ids.length === 0) return [];
  const payload = await payloadClient();

  const and: Where[] = [{ active: { equals: true } }, { artifactId: { in: ids } }];
  const type = filters.type ?? filters.category;
  if (type) and.push({ type: { equals: type } });

  const result = await payload.find({
    collection: 'artifacts',
    where: { and },
    limit: ids.length,
    overrideAccess: true,
  });

  let docs = result.docs;
  if (filters.tags?.length) {
    const required = filters.tags;
    docs = docs.filter((doc) => {
      const tags = ((doc as { tags?: string[] }).tags ?? []) as string[];
      return required.every((t) => tags.includes(t));
    });
  }

  // Preserve the caller's id order (full-text rank order).
  const rank = new Map(ids.map((id, i) => [id, i] as const));
  return docs.sort(
    (a, b) =>
      (rank.get(a.artifactId as string) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.artifactId as string) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Fetch a single active artifact by its stable id, or null if unknown/inactive. */
export async function getArtifact(artifactId: string) {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'artifacts',
    where: { and: [{ artifactId: { equals: artifactId } }, { active: { equals: true } }] },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
}
