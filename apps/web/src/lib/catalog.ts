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
