import { NEWS_PAGE_SIZE } from '@/lib/news-view';
import type { News } from '@/payload-types';
import type { NewsSource } from '../ports';
import { lexicalContent } from '../rich-text';
import type { NewsArticle, NewsHero } from '../types';
import { PUBLISHED, payloadClient } from './client';
import { toAuthor, toContentImage } from './media';

/**
 * Phase 7 read layer for the employee-facing news surfaces (013 contracts/news-read-v2.md §A),
 * moved verbatim into the Payload content source by 023. Every method returns ONLY published
 * articles by construction (mirroring how `lib/catalog.ts` always filters `active: true`), so the
 * employee pages can never render a draft — the collection's `read` access rule is the second line
 * of defense for the API path (007 research §2).
 */

/**
 * Which hero an article renders (020 FR-008, moved here by 023 research R4): the managed upload, the
 * legacy pasted URL, or none. `heroImage` is only an upload when it is a POPULATED media document
 * with a file URL: `null` (the media item was deleted — the FK is ON DELETE SET NULL, FR-010),
 * `undefined`, or a bare numeric id (not populated) all fall through to the legacy URL. The legacy
 * fallback is Payload-era history; another source only ever produces `image` or `none`.
 */
export function resolveHeroSource(article: Pick<News, 'heroImage' | 'heroImageUrl'>): NewsHero {
  const media = article.heroImage;
  if (media && typeof media === 'object' && media.url) {
    return { kind: 'image', image: toContentImage(media)! };
  }
  const legacy = article.heroImageUrl?.trim();
  if (legacy) return { kind: 'legacy', url: legacy };
  return { kind: 'none' };
}

export function toNewsArticle(doc: News): NewsArticle {
  return {
    id: String(doc.id),
    slug: doc.slug ?? '',
    title: doc.title,
    summary: doc.summary ?? null,
    body: lexicalContent(doc.body),
    publishDate: doc.publishDate ?? null,
    tags: (doc.tags ?? []).filter((t): t is string => Boolean(t)),
    author: toAuthor(doc.author),
    hero: resolveHeroSource(doc),
  };
}

export const payloadNewsSource: NewsSource = {
  /**
   * Published articles, strictly newest-first (013 FR-005).
   *
   * 013 removed the trailing `featured`-first stable sort: the /news list is now strictly
   * date-descending, and the frontpage — the only other caller — re-sorts by date anyway via
   * `selectLatestNews` (011 FR-008), so nothing consumed the boost any more (013 research §9).
   */
  async listPublished() {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: 'news',
      where: PUBLISHED,
      sort: '-publishDate',
      limit: 200,
      // 020 R8 — `heroImage` must come back as a populated Media document, not a bare id.
      depth: 1,
      overrideAccess: true,
    });
    return (result.docs as News[]).map(toNewsArticle);
  },

  /**
   * One page of published articles, newest-first (013 FR-006/007/010).
   *
   * Ordering is `-publishDate` with the data layer's automatic `-createdAt` tiebreaker, which is
   * what makes offset paging safe: same-day articles keep a stable total order, so no article is
   * skipped or repeated at a page boundary (013 research §4, SC-001).
   *
   * `page` is expected to be a positive integer (`parseNewsPageParam` guarantees that); this method
   * owns the UPPER bound, which only it can know. A request beyond the last page is clamped to the
   * last page rather than erroring or rendering an empty grid (FR-010) — the second query runs only
   * in that pathological case.
   */
  async listPublishedPage(page) {
    const payload = await payloadClient();
    // 020 R8 — `depth: 1` so `heroImage` comes back as a populated Media document, not a bare id.
    const query = { collection: 'news', where: PUBLISHED, sort: '-publishDate', limit: NEWS_PAGE_SIZE, depth: 1, overrideAccess: true } as const;

    const result = await payload.find({ ...query, page });
    if (result.docs.length === 0 && result.totalPages > 0 && page > result.totalPages) {
      const clamped = await payload.find({ ...query, page: result.totalPages });
      return {
        articles: (clamped.docs as News[]).map(toNewsArticle),
        page: result.totalPages,
        totalPages: clamped.totalPages,
        totalDocs: clamped.totalDocs,
      };
    }

    return {
      articles: (result.docs as News[]).map(toNewsArticle),
      // An empty archive has no pages at all; the caller still renders "page 1" (the empty state).
      page: result.totalPages === 0 ? 1 : page,
      totalPages: result.totalPages,
      totalDocs: result.totalDocs,
    };
  },

  /** A single published article by slug, or `null` (draft/unknown → the page returns 404) (FR-005/006). */
  async getPublishedBySlug(slug) {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: 'news',
      where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
      limit: 1,
      depth: 1, // 020 R8 — populate `heroImage`
      overrideAccess: true,
    });
    const doc = result.docs[0] as News | undefined;
    return doc ? toNewsArticle(doc) : null;
  },
};
