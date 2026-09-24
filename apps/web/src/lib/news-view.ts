/**
 * 013 — pure view math for the /news page (contracts/news-read-v2.md §B). No Payload imports, so
 * everything here is unit-testable in isolation (the lib/events-view.ts pattern). Dates are
 * Europe/Oslo + nb-NO (FR-013) — the explicit timeZone is load-bearing, since an article stamped
 * 22:30 UTC belongs to the NEXT Oslo calendar day.
 *
 * 020 adds the hero-image helpers at the bottom (contracts/hero-image-rendering.md §B1). They take
 * generated Payload TYPES only — still no runtime Payload import.
 */

import type { Media, News } from '@/payload-types';

const OSLO_TZ = 'Europe/Oslo';

/** Articles per page — the single knob (six desktop rows of two). */
export const NEWS_PAGE_SIZE = 12;

/* ---------- ?page= parsing (FR-007/010) ---------- */

/**
 * The requested 1-based page from the URL. Anything that is not a positive whole number — 0,
 * negatives, `abc`, `1.5`, `2e3`, blanks, missing — falls back to page 1; a repeated `?page=`
 * arrives as an array and the first entry wins (the `parseEventsSearchParams` precedent).
 *
 * The UPPER bound is deliberately not clamped here: only the read layer knows `totalPages`, so
 * out-of-range recovery belongs there (research §5).
 */
export function parseNewsPageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d+$/.test(value.trim())) return 1;
  const page = Number(value.trim());
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/* ---------- Pagination model (FR-008/009) ---------- */

export interface NewsPagination {
  /** The page actually rendered (already clamped by the read layer). */
  page: number;
  /** 0 when the archive is empty. */
  totalPages: number;
  totalDocs: number;
  hasPrev: boolean;
  hasNext: boolean;
  /** Present only when the direction is actionable. */
  prevHref?: string;
  nextHref?: string;
  label: string;
  /** False when the whole archive fits on one page — the control bar renders nothing (FR-009). */
  visible: boolean;
}

/** Page 1 is the canonical `/news` with no query string, so a shared link stays clean. */
function pageHref(page: number): string {
  return page <= 1 ? '/news' : `/news?page=${page}`;
}

/** The view model behind `<NewsPagination>`; all boundary logic lives here, not in the component. */
export function buildPagination(
  page: number,
  totalPages: number,
  totalDocs: number,
): NewsPagination {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  return {
    page,
    totalPages,
    totalDocs,
    hasPrev,
    hasNext,
    ...(hasPrev ? { prevHref: pageHref(page - 1) } : {}),
    ...(hasNext ? { nextHref: pageHref(page + 1) } : {}),
    label: `Side ${page} av ${Math.max(totalPages, 1)}`,
    visible: totalPages > 1,
  };
}

/* ---------- Date display (FR-013) ---------- */

/**
 * nb-NO long form in Oslo time — "22. juni 2026"; `''` when the article has no publish date, which
 * lets callers omit the line entirely. Shared by the list card and the detail page so both agree
 * (the detail page previously formatted without a timeZone, i.e. in the server's zone).
 */
export function formatNewsDate(publishDate?: string | null): string {
  if (!publishDate) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    timeZone: OSLO_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(publishDate));
}

/* ---------- Hero images (020, contracts/hero-image-rendering.md §B1) ---------- */

/** Which hero an article renders: the managed upload, the legacy pasted URL, or none. */
export type HeroSource =
  | { kind: 'upload'; media: Media }
  | { kind: 'legacy'; url: string }
  | { kind: 'none' };

/**
 * Precedence upload > legacy > none (FR-008). `heroImage` is only an upload when it is a POPULATED
 * media document with a file URL: `null` (the media item was deleted — the FK is ON DELETE SET NULL,
 * FR-010), `undefined`, or a bare numeric id (not populated) all fall through to the legacy URL.
 */
export function resolveHeroSource(article: Pick<News, 'heroImage' | 'heroImageUrl'>): HeroSource {
  const media = article.heroImage;
  if (media && typeof media === 'object' && media.url) return { kind: 'upload', media };
  const legacy = article.heroImageUrl?.trim();
  if (legacy) return { kind: 'legacy', url: legacy };
  return { kind: 'none' };
}

/**
 * Re-framing overwrites the SAME derived filenames (`<name>-800x500.png`), so without a version the
 * browser keeps showing the old framing (research R7). `updatedAt` moves on every save.
 */
function withVersion(url: string, updatedAt?: string | null): string {
  const version = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  if (!Number.isFinite(version)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${version}`;
}

type SizeEntry = { url?: string | null; width?: number | null; height?: number | null };

/** A usable srcset candidate: has a file URL and a known width. */
function candidate(size: SizeEntry | undefined): { url: string; width: number } | null {
  return size?.url && size.width ? { url: size.url, width: size.width } : null;
}

const CARD_RATIO = 16 / 10;

/**
 * Only an EXACT 16:10 card size is known to be Payload's focal-point extract. A small original takes
 * the plain non-enlarging resize and may come out another shape (research R3), so it is skipped.
 */
function exactCard(size: SizeEntry | undefined): { url: string; width: number } | null {
  const c = candidate(size);
  if (!c || !size?.height) return null;
  return Math.abs(c.width / size.height - CARD_RATIO) / CARD_RATIO <= 0.01 ? c : null;
}

/**
 * A small original makes Payload store the SAME file for several sizes (`content` = `content2x` =
 * the original); a repeated width descriptor would make the whole srcset invalid, so keep one
 * candidate per width.
 */
function toSrcSet(candidates: Array<{ url: string; width: number }>, updatedAt?: string | null) {
  const unique = candidates.filter((c, i) => candidates.findIndex((o) => o.width === c.width) === i);
  return unique.length
    ? unique.map((c) => `${withVersion(c.url, updatedAt)} ${c.width}w`).join(', ')
    : undefined;
}

export interface CardImage {
  src: string;
  srcSet?: string;
  /** Always set: a no-op on an exact focal extract, the framing itself on a fallback source. */
  objectPosition: string;
}

/**
 * The image for a 16:10 news card (FR-004/005, research R4). Prefers the focal-framed `card`/`card2x`
 * sizes; when neither is an exact 16:10 extract (pre-020 media, small originals) falls back to the
 * uncropped reading-width sizes or the original, and lets `object-position` crop around the same
 * focal point in the browser. `??` rather than `||`: a stored focal value of 0 is a real edge.
 */
export function pickCardImage(media: Media): CardImage {
  const objectPosition = `${media.focalX ?? 50}% ${media.focalY ?? 50}%`;
  const cards = [exactCard(media.sizes?.card), exactCard(media.sizes?.card2x)].filter(
    (c): c is { url: string; width: number } => c !== null,
  );
  const [smallest] = cards;
  if (smallest) {
    return {
      src: withVersion(smallest.url, media.updatedAt),
      srcSet: toSrcSet(cards, media.updatedAt),
      objectPosition,
    };
  }
  return { ...readingWidthSource(media), objectPosition };
}

/** `content`/`content2x` (never a card size), else the original file. */
function readingWidthSource(media: Media): { src: string; srcSet?: string; width?: number; height?: number } {
  const sizes = [media.sizes?.content, media.sizes?.content2x].flatMap((size) => {
    const c = candidate(size);
    return c ? [{ ...c, height: size?.height ?? undefined }] : [];
  });
  const [first] = sizes;
  if (first) {
    return {
      src: withVersion(first.url, media.updatedAt),
      srcSet: toSrcSet(sizes, media.updatedAt),
      width: first.width,
      height: first.height,
    };
  }
  return {
    src: withVersion(media.url as string, media.updatedAt),
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}

export interface ArticleImage {
  src: string;
  srcSet?: string;
  width?: number;
  height?: number;
  alt: string;
}

/**
 * The article-page hero (FR-006/007, research R5): the whole image at reading width, never a card
 * crop, with the media item's own alt text. Callers only pass a media from `resolveHeroSource`, so
 * `url` is present.
 */
export function pickArticleImage(media: Media): ArticleImage {
  return { ...readingWidthSource(media), alt: media.alt };
}
