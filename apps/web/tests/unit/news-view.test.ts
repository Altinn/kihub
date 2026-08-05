import { describe, expect, it } from 'vitest';
import {
  NEWS_PAGE_SIZE,
  buildPagination,
  formatNewsDate,
  parseNewsPageParam,
} from '../../src/lib/news-view';

/**
 * T003 (013 US2/FR-007/008/009/010/013) — the pure /news view module. The page-boundary arithmetic
 * is this feature's main correctness hazard (SC-001/SC-007), so every malformed `?page=` value from
 * the spec's edge-case list and every control-visibility boundary is asserted directly here rather
 * than through a rendered page.
 */

describe('NEWS_PAGE_SIZE', () => {
  it('is the single tunable page size', () => {
    expect(NEWS_PAGE_SIZE).toBe(12);
  });
});

describe('parseNewsPageParam', () => {
  it('defaults to page 1 when the param is missing or blank', () => {
    expect(parseNewsPageParam(undefined)).toBe(1);
    expect(parseNewsPageParam('')).toBe(1);
    expect(parseNewsPageParam(' ')).toBe(1);
  });

  it('reads a positive whole number', () => {
    expect(parseNewsPageParam('1')).toBe(1);
    expect(parseNewsPageParam('7')).toBe(7);
    expect(parseNewsPageParam(' 3 ')).toBe(3);
  });

  it('falls back to page 1 for non-positive values', () => {
    expect(parseNewsPageParam('0')).toBe(1);
    expect(parseNewsPageParam('-3')).toBe(1);
  });

  it('falls back to page 1 for non-integer values', () => {
    expect(parseNewsPageParam('abc')).toBe(1);
    expect(parseNewsPageParam('1.5')).toBe(1);
    expect(parseNewsPageParam('2e3')).toBe(1);
    expect(parseNewsPageParam('12px')).toBe(1);
    expect(parseNewsPageParam('NaN')).toBe(1);
  });

  it('takes the first entry when the param is repeated', () => {
    // ?page=2&page=9 arrives as an array — the events page treats repeats the same way.
    expect(parseNewsPageParam(['2', '9'])).toBe(2);
    expect(parseNewsPageParam(['abc', '9'])).toBe(1);
    expect(parseNewsPageParam([])).toBe(1);
  });

  it('does NOT clamp the upper bound — only the read layer knows totalPages', () => {
    expect(parseNewsPageParam('999')).toBe(999);
  });
});

describe('buildPagination', () => {
  it('hides the whole control bar when the archive fits on one page', () => {
    expect(buildPagination(1, 1, 8).visible).toBe(false);
    // An empty archive reports zero pages, and still must not render controls.
    expect(buildPagination(1, 0, 0).visible).toBe(false);
  });

  it('shows the bar as soon as there is a second page', () => {
    expect(buildPagination(1, 2, 20).visible).toBe(true);
  });

  it('offers no previous direction on the first page', () => {
    const p = buildPagination(1, 3, 30);
    expect(p.hasPrev).toBe(false);
    expect(p.prevHref).toBeUndefined();
    expect(p.hasNext).toBe(true);
    expect(p.nextHref).toBe('/news?page=2');
  });

  it('offers no next direction on the last page', () => {
    const p = buildPagination(3, 3, 30);
    expect(p.hasNext).toBe(false);
    expect(p.nextHref).toBeUndefined();
    expect(p.hasPrev).toBe(true);
    expect(p.prevHref).toBe('/news?page=2');
  });

  it('offers both directions in the middle', () => {
    const p = buildPagination(2, 3, 30);
    expect(p.prevHref).toBe('/news');
    expect(p.nextHref).toBe('/news?page=3');
  });

  it('links back to the bare /news for page 1, keeping the canonical address clean', () => {
    expect(buildPagination(2, 5, 60).prevHref).toBe('/news');
  });

  it('labels the position in Norwegian', () => {
    expect(buildPagination(2, 5, 55).label).toBe('Side 2 av 5');
    // An empty archive reads "Side 1 av 1" rather than "av 0" (the bar is hidden anyway).
    expect(buildPagination(1, 0, 0).label).toBe('Side 1 av 1');
  });

  it('passes the totals through for the caller', () => {
    const p = buildPagination(2, 5, 55);
    expect(p.page).toBe(2);
    expect(p.totalPages).toBe(5);
    expect(p.totalDocs).toBe(55);
  });
});

describe('formatNewsDate', () => {
  it('formats nb-NO long form', () => {
    expect(formatNewsDate('2026-06-22T10:00:00.000Z')).toBe('22. juni 2026');
    expect(formatNewsDate('2026-01-03T10:00:00.000Z')).toBe('3. januar 2026');
  });

  it('uses the Oslo calendar day, not the UTC day (CEST: UTC+2)', () => {
    // 22:30 UTC on June 22 is 00:30 on June 23 in Oslo.
    expect(formatNewsDate('2026-06-22T22:30:00.000Z')).toBe('23. juni 2026');
  });

  it('uses the Oslo calendar day in winter too (CET: UTC+1)', () => {
    expect(formatNewsDate('2026-01-10T23:30:00.000Z')).toBe('11. januar 2026');
    expect(formatNewsDate('2026-01-10T22:30:00.000Z')).toBe('10. januar 2026');
  });

  it('is empty for a missing date so callers can omit the line', () => {
    expect(formatNewsDate(undefined)).toBe('');
    expect(formatNewsDate(null)).toBe('');
    expect(formatNewsDate('')).toBe('');
  });
});
