/**
 * 023 — what a content source must provide, per editorial module
 * (specs/023-content-source-seam/contracts/content-source.md §3). Every implementation MUST return
 * published content only, keep the documented ordering, and answer `null` for "not found".
 */
import type { EventFormatValue, EventTypeValue } from '@/lib/events-view';
import type { LearningLibrary } from '@/lib/learning-view';
import type { FrontpageContent, SiteChrome } from '@/lib/site-content-defaults';
import type { EventItem, LearningArticle, NewsArticle, NewsPage, ProjectItem } from './types';

export type ContentModule = 'news' | 'events' | 'projects' | 'learning' | 'frontpage' | 'siteChrome';

export interface NewsSource {
  /** Newest first by publish date; ≤ 200. */
  listPublished(): Promise<NewsArticle[]>;
  /** `NEWS_PAGE_SIZE` per page; past the last page → the last page; empty → page 1 of 0. */
  listPublishedPage(page: number): Promise<NewsPage>;
  getPublishedBySlug(slug: string): Promise<NewsArticle | null>;
}

export interface EventsSource {
  /** Not yet ended, optional filters, featured first then soonest first; ≤ 200. */
  listUpcoming(filters?: { types?: EventTypeValue[]; form?: EventFormatValue }): Promise<EventItem[]>;
  /** Overlapping [from, to], past included, soonest first; ≤ 200. */
  listInRange(fromIso: string, toIso: string): Promise<EventItem[]>;
  /** Past events included. */
  getPublishedBySlug(slug: string): Promise<EventItem | null>;
}

export interface ProjectsSource {
  /** Editor `order` ascending, then creation order; ≤ 200. */
  listPublished(): Promise<ProjectItem[]>;
  getPublishedBySlug(slug: string): Promise<ProjectItem | null>;
}

export interface LearningSource {
  /** All categories/subcategories, published pages only, each by `order` then `title`. */
  readLibrary(): Promise<LearningLibrary>;
  getPublishedPageBySlug(slug: string): Promise<LearningArticle | null>;
}

export interface FrontpageSource {
  /** Always complete: unset/invalid sections fall back to the seeded defaults. */
  getFrontpage(): Promise<FrontpageContent>;
}

export interface SiteChromeSource {
  /** Always complete: per-section fallback to the seeded defaults. */
  getSiteChrome(): Promise<SiteChrome>;
}

export interface ModuleSources {
  news: NewsSource;
  events: EventsSource;
  projects: ProjectsSource;
  learning: LearningSource;
  frontpage: FrontpageSource;
  siteChrome: SiteChromeSource;
}
