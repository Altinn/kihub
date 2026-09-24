import { describe, expect, it } from 'vitest';
import {
  NEWS_PAGE_SIZE,
  buildPagination,
  formatNewsDate,
  parseNewsPageParam,
  pickArticleImage,
  pickCardImage,
  resolveHeroSource,
} from '../../src/lib/news-view';
import type { Media } from '../../src/payload-types';

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

/* ---------- 020 hero images (contracts/hero-image-rendering.md §B4) ---------- */

const UPDATED = '2026-09-23T10:00:00.000Z';
const V = `v=${Date.parse(UPDATED)}`;

type Sizes = NonNullable<Media['sizes']>;
function size(name: string, width: number, height: number) {
  return { url: `/payload-api/media/file/${name}-${width}x${height}.png`, width, height };
}
function media(overrides: Partial<Omit<Media, 'sizes'>> & { sizes?: Partial<Sizes> } = {}): Media {
  return {
    id: 1,
    alt: 'Et bilde med tekst i høyre kant',
    url: '/payload-api/media/file/bilde.png',
    width: 3000,
    height: 1000,
    focalX: 90,
    focalY: 20,
    updatedAt: UPDATED,
    createdAt: UPDATED,
    sizes: {},
    ...overrides,
  } as Media;
}

describe('resolveHeroSource (B4.1, FR-008/FR-010)', () => {
  it('prefers a populated upload even when a legacy URL is also set', () => {
    const m = media();
    expect(resolveHeroSource({ heroImage: m, heroImageUrl: 'https://legacy.example/a.jpg' })).toEqual({
      kind: 'upload',
      media: m,
    });
  });

  it('does not treat a media document without a file URL as an upload', () => {
    expect(resolveHeroSource({ heroImage: media({ url: null }), heroImageUrl: null })).toEqual({ kind: 'none' });
  });

  it('falls back to the legacy URL when the media was deleted (null) or is unpopulated (an id)', () => {
    expect(resolveHeroSource({ heroImage: null, heroImageUrl: 'https://legacy.example/a.jpg' })).toEqual({
      kind: 'legacy',
      url: 'https://legacy.example/a.jpg',
    });
    expect(resolveHeroSource({ heroImage: 42, heroImageUrl: 'https://legacy.example/a.jpg' })).toEqual({
      kind: 'legacy',
      url: 'https://legacy.example/a.jpg',
    });
  });

  it('is none when neither is usable, including a whitespace-only legacy URL', () => {
    expect(resolveHeroSource({ heroImage: undefined, heroImageUrl: '   ' })).toEqual({ kind: 'none' });
    expect(resolveHeroSource({ heroImage: null, heroImageUrl: null })).toEqual({ kind: 'none' });
  });
});

describe('pickCardImage (B4.2–B4.4, B4.6)', () => {
  it('uses the exact 16:10 card sizes as a srcset, with the focal point as object-position', () => {
    const img = pickCardImage(
      media({ sizes: { card: size('bilde', 800, 500), card2x: size('bilde', 1600, 1000) } }),
    );
    expect(img.src).toBe(`/payload-api/media/file/bilde-800x500.png?${V}`);
    expect(img.srcSet).toBe(
      `/payload-api/media/file/bilde-800x500.png?${V} 800w, /payload-api/media/file/bilde-1600x1000.png?${V} 1600w`,
    );
    expect(img.objectPosition).toBe('90% 20%');
  });

  it('uses only the card size that exists', () => {
    const img = pickCardImage(media({ sizes: { card: size('bilde', 800, 500) } }));
    expect(img.srcSet).toBe(`/payload-api/media/file/bilde-800x500.png?${V} 800w`);
  });

  it('skips a card size that is not 16:10 and falls back to the reading-width sizes', () => {
    const img = pickCardImage(
      media({
        sizes: {
          card: size('lite', 600, 300),
          card2x: size('lite', 600, 300),
          content: size('lite', 600, 300),
        },
      }),
    );
    expect(img.src).toBe(`/payload-api/media/file/lite-600x300.png?${V}`);
    expect(img.srcSet).toBe(`/payload-api/media/file/lite-600x300.png?${V} 600w`);
    expect(img.objectPosition).toBe('90% 20%');
  });

  it('keeps one srcset candidate per width when a small original is stored for several sizes', () => {
    const same = size('lite', 600, 300);
    const img = pickCardImage(media({ sizes: { card: same, card2x: same, content: same, content2x: same } }));
    expect(img.srcSet).toBe(`/payload-api/media/file/lite-600x300.png?${V} 600w`);
  });

  it('falls back to the original file when no size exists (pre-020 media)', () => {
    const img = pickCardImage(media());
    expect(img.src).toBe(`/payload-api/media/file/bilde.png?${V}`);
    expect(img.srcSet).toBeUndefined();
  });

  it('centres when no focal point is stored, and honours an exact 0 (?? not ||)', () => {
    expect(pickCardImage(media({ focalX: null, focalY: null })).objectPosition).toBe('50% 50%');
    expect(pickCardImage(media({ focalX: 0, focalY: 0 })).objectPosition).toBe('0% 0%');
  });

  it('omits the version when updatedAt is not a date', () => {
    expect(pickCardImage(media({ updatedAt: 'garbage' })).src).toBe('/payload-api/media/file/bilde.png');
  });
});

describe('pickArticleImage (B4.5, FR-006/007)', () => {
  it('uses the reading-width sizes with their actual widths and dimensions', () => {
    const img = pickArticleImage(
      media({ sizes: { content: size('bilde', 760, 253), content2x: size('bilde', 1520, 507) } }),
    );
    expect(img.src).toBe(`/payload-api/media/file/bilde-760x253.png?${V}`);
    expect(img.srcSet).toBe(
      `/payload-api/media/file/bilde-760x253.png?${V} 760w, /payload-api/media/file/bilde-1520x507.png?${V} 1520w`,
    );
    expect(img).toMatchObject({ width: 760, height: 253, alt: 'Et bilde med tekst i høyre kant' });
  });

  it('never uses a card crop — falls back to the whole original instead', () => {
    const img = pickArticleImage(
      media({ sizes: { card: size('bilde', 800, 500), card2x: size('bilde', 1600, 1000) } }),
    );
    expect(img.src).toBe(`/payload-api/media/file/bilde.png?${V}`);
    expect(img.srcSet).toBeUndefined();
    expect(img).toMatchObject({ width: 3000, height: 1000 });
  });
});
