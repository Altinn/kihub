import { newsSource } from '@/lib/content/registry';
import type { NewsArticle, NewsPage } from '@/lib/content/types';

export type { NewsPage } from '@/lib/content/types';

/**
 * Phase 7 read layer for the employee-facing news surfaces (extended by 013). Since 023 a facade:
 * the content source behind it is chosen per module (contracts/content-source.md §4).
 * Published-only, ordering, the out-of-range clamp and not-found semantics are guaranteed by every
 * source (§3).
 */

/** Published articles, strictly newest-first (013 FR-005); ≤ 200. */
export function listPublishedNews(): Promise<NewsArticle[]> {
  return newsSource().listPublished();
}

/** One page of published articles, newest-first, clamped to the last page (013 FR-006/010). */
export function listPublishedNewsPage(page: number): Promise<NewsPage> {
  return newsSource().listPublishedPage(page);
}

/** A single published article by slug, or `null` (draft/unknown → the page returns 404). */
export function getPublishedNewsBySlug(slug: string): Promise<NewsArticle | null> {
  return newsSource().getPublishedBySlug(slug);
}
