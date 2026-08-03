/**
 * 011 frontpage — pure selection helpers for the "Hva skjer i BOD" and "Siste nytt" sections
 * (FR-006/008, contracts/frontpage-read.md). The shared read libs return featured-first ordering
 * for the /events and /news pages; the frontpage is strictly chronological, so these helpers
 * re-sort WITHOUT touching the shared libs. Structural generics + no Payload imports keep the
 * module unit-testable in isolation (mirrors `lib/event-dates.ts` / `lib/slug.ts`).
 */

/** Timeline rows shown beside the next-event card (clarification: next 4, month-agnostic). */
export const FRONTPAGE_TIMELINE_LIMIT = 4;

/** News cards shown in "Siste nytt" (FR-008). */
export const FRONTPAGE_NEWS_LIMIT = 4;

/**
 * Partition upcoming events for the events section: strictly `startDateTime`-ascending (undoing
 * the read lib's featured-first boost), `next` = the soonest, `timeline` = the following ≤4
 * regardless of calendar month. Events already fully past `now` are dropped defensively (same
 * `(endDateTime ?? startDateTime) >= now` rule as `isUpcoming`) so a stale caller can never
 * feature a finished event.
 */
export function selectEventsSection<
  T extends { startDateTime: string; endDateTime?: string | null },
>(events: T[], now: Date): { next: T | null; timeline: T[] } {
  const upcoming = events
    .filter((e) => new Date(e.endDateTime ?? e.startDateTime).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  const [next = null, ...rest] = upcoming;
  return { next, timeline: rest.slice(0, FRONTPAGE_TIMELINE_LIMIT) };
}

/**
 * The `n` most recently published articles, newest first, IGNORING the `featured` boost (FR-008:
 * "most recently published" — a featured-but-older article must not outrank a newer one).
 * Articles without a `publishDate` sort last.
 */
export function selectLatestNews<T extends { publishDate?: string | null }>(
  news: T[],
  n: number = FRONTPAGE_NEWS_LIMIT,
): T[] {
  if (n <= 0) return [];
  return [...news]
    .sort((a, b) => {
      const aTime = a.publishDate ? new Date(a.publishDate).getTime() : Number.NEGATIVE_INFINITY;
      const bTime = b.publishDate ? new Date(b.publishDate).getTime() : Number.NEGATIVE_INFINITY;
      return bTime - aTime;
    })
    .slice(0, n);
}
