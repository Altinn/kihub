import config from '@payload-config';
import { getPayload } from 'payload';
import type { Event } from '@/payload-types';

/**
 * Phase 8 read layer for the employee-facing events surfaces. Both functions return ONLY published
 * events by construction (mirroring `lib/news.ts`), so the employee pages can never render a draft —
 * the collection's `read` access rule is the second line of defense for the API path (research §2).
 * `listUpcomingEvents` additionally hides past events (a list-only concern, FR-004);
 * `getPublishedEventBySlug` does NOT, so a published past event stays reachable by direct URL.
 */
async function payloadClient() {
  return getPayload({ config });
}

/** Published upcoming events, featured first, soonest-first within each group (FR-004). */
export async function listUpcomingEvents(): Promise<Event[]> {
  const payload = await payloadClient();
  const now = new Date().toISOString();
  const result = await payload.find({
    collection: 'events',
    where: {
      and: [
        { status: { equals: 'published' } },
        // Upcoming = not yet ended: end in the future, or (no end set) start in the future.
        // Mirrors `isUpcoming` in lib/event-dates.ts: (endDateTime ?? startDateTime) >= now.
        {
          or: [
            { endDateTime: { greater_than_equal: now } },
            {
              and: [
                { endDateTime: { exists: false } },
                { startDateTime: { greater_than_equal: now } },
              ],
            },
          ],
        },
      ],
    },
    sort: 'startDateTime',
    limit: 200,
    overrideAccess: true,
  });
  // `find` already returns soonest-first; a stable sort by `featured` surfaces featured events ahead
  // while preserving soonest-first order within the featured and non-featured groups.
  return [...(result.docs as Event[])].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );
}

/** A single published event by slug, or `null` (draft/unknown → the page returns 404) (FR-005/006). */
export async function getPublishedEventBySlug(slug: string): Promise<Event | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'events',
    where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
    limit: 1,
    overrideAccess: true,
  });
  return (result.docs[0] as Event) ?? null;
}
