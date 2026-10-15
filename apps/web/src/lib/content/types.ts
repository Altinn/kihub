/**
 * 023 — KI Hub-owned view models for editorial content (specs/023-content-source-seam/
 * data-model.md). Employee pages and components consume THESE, never a CMS's generated types, so a
 * module can move to another content source without touching what renders it.
 *
 * Rules (research R2): ids are strings (Umbraco keys are GUIDs; ids are only React keys), slugs are
 * plain strings, dates stay ISO strings, relations arrive resolved, and only fields a page, component
 * or pure view helper reads are carried. `ContentImage` deliberately mirrors the nullability of
 * today's inputs so the image helpers are retyped, not rewritten (research R3).
 *
 * The other neutral shapes already existed before 023 and stay where they are: `LearningLibrary` and
 * the tree types in `lib/learning-view.ts`, `FrontpageContent`/`SiteChrome` in
 * `lib/site-content-defaults.ts`.
 */
import type { EventFormatValue, EventTypeValue } from '@/lib/events-view';
import type { RichTextContent } from './rich-text';

export type { RichTextContent } from './rich-text';

/* ---------- images ---------- */

/** KI Hub's rendition names: 16:10 cards at 800/1600 px, reading width at 1200/2400 px. */
export type RenditionName = 'card' | 'card2x' | 'content' | 'content2x';

export interface ImageRendition {
  url: string | null;
  width: number | null;
  height: number | null;
}

export interface ContentImage {
  /** The original file. */
  url: string | null;
  width: number | null;
  height: number | null;
  alt: string;
  /** 0–100; `null` = unset (helpers apply `?? 50`, so a stored 0 is honoured). */
  focalX: number | null;
  focalY: number | null;
  /** Source of the `?v=` cache-buster — re-framing overwrites same-named files. */
  updatedAt: string | null;
  /** Only the renditions the source has; an absent key stays absent. */
  renditions: Partial<Record<RenditionName, ImageRendition>>;
}

/* ---------- people ---------- */

export interface Author {
  name: string | null;
  email: string | null;
}

/* ---------- news ---------- */

/** Already resolved by the source: the managed image, a legacy pasted URL, or nothing (R4). */
export type NewsHero =
  | { kind: 'image'; image: ContentImage }
  | { kind: 'legacy'; url: string }
  | { kind: 'none' };

export interface NewsArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: RichTextContent;
  publishDate: string | null;
  /** Empty entries already removed. */
  tags: string[];
  author: Author | null;
  hero: NewsHero;
}

export interface NewsPage {
  articles: NewsArticle[];
  /** The page actually returned — may differ from the request after the out-of-range clamp. */
  page: number;
  /** 0 when the archive is empty. */
  totalPages: number;
  totalDocs: number;
}

/* ---------- events ---------- */

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description: RichTextContent;
  startDateTime: string;
  endDateTime: string | null;
  location: string | null;
  onlineUrl: string | null;
  organizer: string | null;
  channel: string | null;
  eventType: EventTypeValue;
  format: EventFormatValue;
  capacity: number | null;
  seatsTaken: number | null;
}

/* ---------- projects ---------- */

export interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: RichTextContent;
}

/* ---------- KI Læring ---------- */

export interface LearningArticle {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: RichTextContent;
  updatedAt: string;
  /** `''` when the relation is unset or unpopulated (today's `relationTitle`). */
  categoryTitle: string;
  subcategoryTitle: string;
  author: Author | null;
}
