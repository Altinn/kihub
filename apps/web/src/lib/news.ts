import config from '@payload-config';
import { getPayload } from 'payload';
import type { News } from '@/payload-types';

/**
 * Phase 7 read layer for the employee-facing news surfaces. Both functions return ONLY published
 * articles by construction (mirroring how `lib/catalog.ts` always filters `active: true`), so the
 * employee pages can never render a draft — the collection's `read` access rule is the second line
 * of defense for the API path (research §2).
 */
async function payloadClient() {
  return getPayload({ config });
}

/** Published articles, featured first, newest-first within each group (FR-004). */
export async function listPublishedNews(): Promise<News[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'news',
    where: { status: { equals: 'published' } },
    sort: '-publishDate',
    limit: 200,
    overrideAccess: true,
  });
  // `find` already returns newest-first; a stable sort by `featured` surfaces featured articles
  // ahead while preserving newest-first order within the featured and non-featured groups.
  return [...(result.docs as News[])].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );
}

/** A single published article by slug, or `null` (draft/unknown → the page returns 404) (FR-005/006). */
export async function getPublishedNewsBySlug(slug: string): Promise<News | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'news',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1,
    overrideAccess: true,
  });
  return (result.docs[0] as News) ?? null;
}
