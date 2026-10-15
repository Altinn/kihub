import type { LearningCategory, LearningPage, LearningSubcategory } from '@/payload-types';
import type { LearningSource } from '../ports';
import { lexicalContent } from '../rich-text';
import type { LearningArticle } from '../types';
import { PUBLISHED, payloadClient } from './client';
import { toAuthor } from './media';

/**
 * 014 read layer for the employee-facing KI Læring surfaces (contracts/learning-read.md §A), moved
 * verbatim into the Payload content source by 023.
 *
 * Every method returns ONLY published pages by construction — the same posture as news and
 * `lib/catalog.ts` — so an employee page can never render a draft. The collection's `read` access
 * rule is the second line of defence for the REST/GraphQL path (FR-032).
 */

/**
 * Upper bound for a single read. The library is expected to reach ~100 pages (014 plan.md
 * Scale/Scope); 200 leaves headroom while keeping one read bounded, matching news.
 */
const LIBRARY_READ_LIMIT = 200;

/** A populated relation's title, else `''` (unset, or an unpopulated id). */
function relationTitle(
  value: number | LearningCategory | LearningSubcategory | null | undefined,
): string {
  return value && typeof value === 'object' ? value.title : '';
}

export function toLearningArticle(doc: LearningPage): LearningArticle {
  return {
    id: String(doc.id),
    slug: doc.slug ?? '',
    title: doc.title,
    summary: doc.summary ?? null,
    body: lexicalContent(doc.body),
    updatedAt: doc.updatedAt,
    categoryTitle: relationTitle(doc.category),
    subcategoryTitle: relationTitle(doc.subcategory),
    author: toAuthor(doc.author),
  };
}

export const payloadLearningSource: LearningSource = {
  /**
   * The whole published library in **exactly three queries**, whatever its size (014 SC-010).
   *
   * The pages read uses `depth: 0` deliberately: the tree needs each page's category and subcategory
   * as *ids*, and depth 0 returns them as ids instead of populating the related documents — turning
   * what would be a join per page into none. The category and subcategory documents come from their
   * own single reads instead.
   *
   * `overrideAccess: true` is safe and intentional here: the `where` clause already constrains this
   * to published pages, exactly as news does.
   */
  async readLibrary() {
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
  },

  /**
   * One published page by handle, or `null` (draft/unknown → the route calls `notFound()`, FR-012).
   * Default depth, so category/subcategory/author and the body's upload nodes arrive populated.
   */
  async getPublishedPageBySlug(slug) {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: 'learning-pages',
      where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as LearningPage | undefined;
    return doc ? toLearningArticle(doc) : null;
  },
};
