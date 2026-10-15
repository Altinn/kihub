import { payloadLearningSource } from '@/lib/content/payload/learning';
import type { LearningArticle } from '@/lib/content/types';
import type { LearningLibrary } from '@/lib/learning-view';

/**
 * 014 read layer for the employee-facing KI Læring surfaces. Since 023 a facade: the content source
 * behind it is chosen per module (contracts/content-source.md §4). Published-only, ordering and
 * not-found semantics are guaranteed by every source (§3).
 */

/** The whole published library (categories, subcategories, published pages) for the tree. */
export function readLearningLibrary(): Promise<LearningLibrary> {
  return payloadLearningSource.readLibrary();
}

/** One published page by handle, or `null` (draft/unknown → the route calls `notFound()`). */
export function getPublishedLearningPageBySlug(slug: string): Promise<LearningArticle | null> {
  return payloadLearningSource.getPublishedPageBySlug(slug);
}
