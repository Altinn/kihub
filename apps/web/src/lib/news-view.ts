/**
 * 013 — pure view math for the /news page (contracts/news-read-v2.md §B). No Payload imports, so
 * everything here is unit-testable in isolation (the lib/events-view.ts pattern). Dates are
 * Europe/Oslo + nb-NO (FR-013) — the explicit timeZone is load-bearing, since an article stamped
 * 22:30 UTC belongs to the NEXT Oslo calendar day.
 */

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
