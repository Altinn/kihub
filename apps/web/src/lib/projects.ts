import config from '@payload-config';
import { getPayload } from 'payload';
import { PUBLISHED, type ReadOptions } from './payload-queries';
import type { Project } from '@/payload-types';

/**
 * 016 read layer for the employee-facing `/prosjekter` surfaces. Every function returns ONLY
 * published projects by construction (mirroring `lib/news.ts`/`lib/learning.ts`), so the employee
 * pages can never render a draft — the collection's `read` access rule is the second line of
 * defense for the API path.
 */
async function payloadClient() {
  return getPayload({ config });
}

/**
 * Published projects, ordered by the editor-controlled `order` field (ascending). Most projects
 * share the default `order` (100), so the secondary key is explicit rather than relying on
 * whatever tie-break the adapter happens to apply.
 */
export async function listPublishedProjects(): Promise<Project[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'projects',
    where: PUBLISHED,
    sort: ['order', 'createdAt'],
    limit: 200,
    overrideAccess: true,
  });
  return result.docs as Project[];
}

/**
 * A single published project by slug, or `null` (draft/unknown → the page returns 404).
 * 027: `{ preview: true }` returns the latest version (draft or not) for an editor's preview.
 */
export async function getProjectBySlug(slug: string, opts: ReadOptions = {}): Promise<Project | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'projects',
    where: opts.preview ? { slug: { equals: slug } } : { and: [{ slug: { equals: slug } }, PUBLISHED] },
    draft: Boolean(opts.preview),
    limit: 1,
    overrideAccess: true,
  });
  return (result.docs[0] as Project) ?? null;
}
