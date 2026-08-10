import config from '@payload-config';
import { getPayload } from 'payload';
import type { LearningLibrary } from '@/lib/learning-view';
import type { LearningPage } from '@/payload-types';

/**
 * 014 read layer for the employee-facing KI Læring surfaces (contracts/learning-read.md §A).
 *
 * Every function returns ONLY published pages by construction — the same posture as `lib/news.ts`
 * and `lib/catalog.ts` — so an employee page can never render a draft. The collection's `read`
 * access rule is the second line of defence for the REST/GraphQL path (FR-032).
 */
async function payloadClient() {
  return getPayload({ config });
}

const PUBLISHED = { status: { equals: 'published' } } as const;

/**
 * Upper bound for a single read. The library is expected to reach ~100 pages (plan.md Scale/Scope);
 * 200 leaves headroom while keeping one read bounded, matching `listPublishedNews`.
 */
const LIBRARY_READ_LIMIT = 200;

/**
 * The whole published library in **exactly three queries**, whatever its size (SC-010).
 *
 * The pages read uses `depth: 0` deliberately: the tree needs each page's category and subcategory
 * as *ids*, and depth 0 returns them as ids instead of populating the related documents — turning
 * what would be a join per page into none. The category and subcategory documents come from their
 * own single reads instead.
 *
 * `overrideAccess: true` is safe and intentional here: the `where` clause already constrains this to
 * published pages, exactly as `lib/news.ts` does.
 */
export async function readLearningLibrary(): Promise<LearningLibrary> {
  const payload = await payloadClient();

  const [categories, subcategories, pages] = await Promise.all([
    payload.find({
      collection: 'learning-categories',
      sort: ['order', 'title'],
      limit: LIBRARY_READ_LIMIT,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'learning-subcategories',
      sort: ['order', 'title'],
      limit: LIBRARY_READ_LIMIT,
      depth: 0,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'learning-pages',
      where: PUBLISHED,
      sort: ['order', 'title'],
      limit: LIBRARY_READ_LIMIT,
      depth: 0,
      overrideAccess: true,
    }),
  ]);

  return {
    categories: categories.docs.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      order: c.order,
    })),
    subcategories: subcategories.docs.map((s) => ({
      id: s.id,
      title: s.title,
      // depth: 0 → the relationship is the raw id.
      category: s.category as number,
      order: s.order,
    })),
    pages: pages.docs.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      category: p.category as number,
      subcategory: (p.subcategory ?? null) as number | null,
      order: p.order,
    })),
  };
}

/**
 * One published page by handle, or `null` (draft/unknown → the route calls `notFound()`, FR-012).
 * Default depth, so the body's upload nodes arrive populated and images can render.
 */
export async function getPublishedLearningPageBySlug(slug: string): Promise<LearningPage | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'learning-pages',
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    limit: 1,
    overrideAccess: true,
  });
  return (result.docs[0] as LearningPage) ?? null;
}
