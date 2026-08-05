import config from '@payload-config';
import { getPayload } from 'payload';
import { NEWS_PAGE_SIZE } from '@/lib/news-view';
import type { News } from '@/payload-types';

/**
 * Phase 7 read layer for the employee-facing news surfaces, extended by 013
 * (contracts/news-read-v2.md §A). Every function returns ONLY published articles by construction
 * (mirroring how `lib/catalog.ts` always filters `active: true`), so the employee pages can never
 * render a draft — the collection's `read` access rule is the second line of defense for the API
 * path (007 research §2).
 */
async function payloadClient() {
  return getPayload({ config });
}

const PUBLISHED = { status: { equals: 'published' } } as const;

/**
 * Published articles, strictly newest-first (013 FR-005).
 *
 * 013 removed the trailing `featured`-first stable sort: the /news list is now strictly
 * date-descending, and the frontpage — the only other caller — re-sorts by date anyway via
 * `selectLatestNews` (011 FR-008), so nothing consumed the boost any more (013 research §9).
 */
export async function listPublishedNews(): Promise<News[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'news',
    where: PUBLISHED,
    sort: '-publishDate',
    limit: 200,
    overrideAccess: true,
  });
  return result.docs as News[];
}

/** One page of the archive plus the totals the pagination controls need (013 FR-006/008). */
export interface NewsPage {
  articles: News[];
  /** The page actually returned — may differ from the request after the out-of-range clamp. */
  page: number;
  /** 0 when the archive is empty. */
  totalPages: number;
  totalDocs: number;
}

/**
 * One page of published articles, newest-first (013 FR-006/007/010).
 *
 * Ordering is `-publishDate` with the data layer's automatic `-createdAt` tiebreaker, which is what
 * makes offset paging safe: same-day articles keep a stable total order, so no article is skipped or
 * repeated at a page boundary (013 research §4, SC-001).
 *
 * `page` is expected to be a positive integer (`parseNewsPageParam` guarantees that); this function
 * owns the UPPER bound, which only it can know. A request beyond the last page is clamped to the
 * last page rather than erroring or rendering an empty grid (FR-010) — the second query runs only in
 * that pathological case.
 */
export async function listPublishedNewsPage(page: number): Promise<NewsPage> {
  const payload = await payloadClient();
  const query = { collection: 'news', where: PUBLISHED, sort: '-publishDate', limit: NEWS_PAGE_SIZE, overrideAccess: true } as const;

  const result = await payload.find({ ...query, page });
  if (result.docs.length === 0 && result.totalPages > 0 && page > result.totalPages) {
    const clamped = await payload.find({ ...query, page: result.totalPages });
    return {
      articles: clamped.docs as News[],
      page: result.totalPages,
      totalPages: clamped.totalPages,
      totalDocs: clamped.totalDocs,
    };
  }

  return {
    articles: result.docs as News[],
    // An empty archive has no pages at all; the caller still renders "page 1" (the empty state).
    page: result.totalPages === 0 ? 1 : page,
    totalPages: result.totalPages,
    totalDocs: result.totalDocs,
  };
}

/** A single published article by slug, or `null` (draft/unknown → the page returns 404) (FR-005/006). */
export async function getPublishedNewsBySlug(slug: string): Promise<News | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'news',
    where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
    limit: 1,
    overrideAccess: true,
  });
  return (result.docs[0] as News) ?? null;
}
