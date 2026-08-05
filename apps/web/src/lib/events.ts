import config from '@payload-config';
import { getPayload } from 'payload';
import type { EventFormatValue, EventTypeValue } from '@/lib/events-view';
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

/**
 * Published upcoming events, featured first, soonest-first within each group (FR-004).
 * 012: optional TYPE/FORM filters are applied in the query itself (FR-005) — the frontpage
 * keeps calling this with no arguments (byte-identical 011 behavior).
 */
export async function listUpcomingEvents(filters?: {
  types?: EventTypeValue[];
  form?: EventFormatValue;
}): Promise<Event[]> {
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
        ...(filters?.types?.length ? [{ eventType: { in: filters.types } }] : []),
        ...(filters?.form ? [{ format: { equals: filters.form } }] : []),
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

/**
 * 012 FR-007 — published events overlapping [from, to] for the calendar's 6-week grid, past
 * events included, soonest-first. Overlap: started before the range ends AND not ended before
 * the range starts (missing end ⇒ the start must fall inside the range).
 */
export async function listEventsInRange(fromIso: string, toIso: string): Promise<Event[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'events',
    where: {
      and: [
        { status: { equals: 'published' } },
        { startDateTime: { less_than_equal: toIso } },
        {
          or: [
            { endDateTime: { greater_than_equal: fromIso } },
            {
              and: [
                { endDateTime: { exists: false } },
                { startDateTime: { greater_than_equal: fromIso } },
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
  return result.docs as Event[];
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
