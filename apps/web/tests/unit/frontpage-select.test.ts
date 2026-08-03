import { describe, expect, it } from 'vitest';
import { selectEventsSection, selectLatestNews } from '@/lib/frontpage-select';

/**
 * T001 (US2/US3, FR-006/008) — the pure frontpage selection logic. The read libs return
 * featured-first ordering (for the /events and /news pages); the frontpage sections are strictly
 * chronological, so these helpers re-sort and partition without touching the shared libs.
 */

const now = new Date('2026-07-01T00:00:00.000Z');

function ev(slug: string, startDateTime: string, extra: Record<string, unknown> = {}) {
  return { slug, title: slug, startDateTime, ...extra };
}

describe('selectEventsSection (FR-006, clarification: next 4 regardless of month)', () => {
  it('returns the soonest event as `next` and the following ones as `timeline`, chronologically', () => {
    // Featured-first input order (as listUpcomingEvents returns it): featured c before a/b.
    const c = ev('c', '2026-07-21T09:00:00.000Z', { featured: true });
    const a = ev('a', '2026-07-03T08:00:00.000Z');
    const b = ev('b', '2026-07-08T11:00:00.000Z');
    const { next, timeline } = selectEventsSection([c, a, b], now);
    expect(next).toBe(a);
    expect(timeline).toEqual([b, c]);
  });

  it('caps the timeline at 4 and crosses calendar-month boundaries', () => {
    const events = [
      ev('jul-1', '2026-07-03T08:00:00.000Z'),
      ev('jul-2', '2026-07-08T11:00:00.000Z'),
      ev('jul-3', '2026-07-15T09:30:00.000Z'),
      ev('jul-4', '2026-07-21T07:00:00.000Z'),
      ev('sep-1', '2026-09-04T07:00:00.000Z'), // different month — still eligible
      ev('sep-2', '2026-09-10T07:00:00.000Z'), // 6th event — beyond the cap
    ];
    const { next, timeline } = selectEventsSection([...events].reverse(), now);
    expect(next?.slug).toBe('jul-1');
    expect(timeline.map((e) => e.slug)).toEqual(['jul-2', 'jul-3', 'jul-4', 'sep-1']);
  });

  it('returns a shorter timeline when fewer events exist', () => {
    const a = ev('a', '2026-07-03T08:00:00.000Z');
    const b = ev('b', '2026-07-08T11:00:00.000Z');
    expect(selectEventsSection([a, b], now).timeline).toEqual([b]);
    expect(selectEventsSection([a], now).timeline).toEqual([]);
  });

  it('returns { next: null, timeline: [] } for empty input', () => {
    expect(selectEventsSection([], now)).toEqual({ next: null, timeline: [] });
  });

  it('defensively drops events already fully past `now` (same rule as isUpcoming)', () => {
    const past = ev('past', '2026-06-20T08:00:00.000Z');
    const inProgress = ev('in-progress', '2026-06-30T08:00:00.000Z', {
      endDateTime: '2026-07-02T08:00:00.000Z',
    });
    const future = ev('future', '2026-07-03T08:00:00.000Z');
    const { next, timeline } = selectEventsSection([past, inProgress, future], now);
    expect(next?.slug).toBe('in-progress');
    expect(timeline.map((e) => e.slug)).toEqual(['future']);
  });

  it('does not mutate the input array', () => {
    const input = [ev('b', '2026-07-08T11:00:00.000Z'), ev('a', '2026-07-03T08:00:00.000Z')];
    const snapshot = [...input];
    selectEventsSection(input, now);
    expect(input).toEqual(snapshot);
  });
});

function article(slug: string, publishDate: string | null, extra: Record<string, unknown> = {}) {
  return { slug, title: slug, publishDate, ...extra };
}

describe('selectLatestNews (FR-008: newest-first, featured ignored)', () => {
  it('orders strictly by publishDate descending — a featured-but-older article does not jump ahead', () => {
    const featuredOld = article('featured-old', '2026-06-01T00:00:00.000Z', { featured: true });
    const newer = article('newer', '2026-07-20T00:00:00.000Z');
    const newest = article('newest', '2026-07-21T00:00:00.000Z');
    // Featured-first input order (as listPublishedNews returns it).
    const result = selectLatestNews([featuredOld, newest, newer]);
    expect(result.map((n) => n.slug)).toEqual(['newest', 'newer', 'featured-old']);
  });

  it('caps at 4 by default', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((s, i) =>
      article(s, `2026-07-${10 + i}T00:00:00.000Z`),
    );
    const result = selectLatestNews(items);
    expect(result).toHaveLength(4);
    expect(result.map((n) => n.slug)).toEqual(['e', 'd', 'c', 'b']);
  });

  it('respects an explicit cap and returns everything when fewer exist', () => {
    const a = article('a', '2026-07-10T00:00:00.000Z');
    const b = article('b', '2026-07-11T00:00:00.000Z');
    expect(selectLatestNews([a, b], 1).map((n) => n.slug)).toEqual(['b']);
    expect(selectLatestNews([a, b], 10)).toHaveLength(2);
    expect(selectLatestNews([], 4)).toEqual([]);
  });

  it('sorts articles without a publishDate last', () => {
    const dated = article('dated', '2026-07-10T00:00:00.000Z');
    const undated = article('undated', null);
    expect(selectLatestNews([undated, dated]).map((n) => n.slug)).toEqual(['dated', 'undated']);
  });

  it('does not mutate the input array', () => {
    const input = [
      article('a', '2026-07-10T00:00:00.000Z'),
      article('b', '2026-07-11T00:00:00.000Z'),
    ];
    const snapshot = [...input];
    selectLatestNews(input);
    expect(input).toEqual(snapshot);
  });
});
