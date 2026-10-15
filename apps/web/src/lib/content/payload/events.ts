import type { Event } from '@/payload-types';
import type { EventsSource } from '../ports';
import { lexicalContent } from '../rich-text';
import type { EventItem } from '../types';
import { payloadClient } from './client';

/**
 * Phase 8 read layer for the employee-facing events surfaces, moved verbatim into the Payload
 * content source by 023. Every method returns ONLY published events by construction (mirroring
 * news), so the employee pages can never render a draft — the collection's `read` access rule is
 * the second line of defense for the API path (009 research §2). `listUpcoming` additionally hides
 * past events (a list-only concern, FR-004); `getPublishedBySlug` does NOT, so a published past
 * event stays reachable by direct URL.
 */

export function toEventItem(doc: Event): EventItem {
  return {
    id: String(doc.id),
    slug: doc.slug ?? '',
    title: doc.title,
    description: lexicalContent(doc.description),
    startDateTime: doc.startDateTime,
    endDateTime: doc.endDateTime ?? null,
    location: doc.location ?? null,
    onlineUrl: doc.onlineUrl ?? null,
    organizer: doc.organizer ?? null,
    channel: doc.channel ?? null,
    eventType: doc.eventType,
    format: doc.format,
    capacity: doc.capacity ?? null,
    seatsTaken: doc.seatsTaken ?? null,
  };
}

export const payloadEventsSource: EventsSource = {
  /**
   * Published upcoming events, featured first, soonest-first within each group (FR-004).
   * 012: optional TYPE/FORM filters are applied in the query itself (FR-005) — the frontpage
   * keeps calling this with no arguments (byte-identical 011 behavior).
   */
  async listUpcoming(filters) {
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
    // `find` already returns soonest-first; a stable sort by `featured` surfaces featured events
    // ahead while preserving soonest-first order within the featured and non-featured groups.
    // Applied to the Payload docs, before mapping: `featured` is ordering input, not view data.
    return [...(result.docs as Event[])]
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      .map(toEventItem);
  },

  /**
   * 012 FR-007 — published events overlapping [from, to] for the calendar's 6-week grid, past
   * events included, soonest-first. Overlap: started before the range ends AND not ended before
   * the range starts (missing end ⇒ the start must fall inside the range).
   */
  async listInRange(fromIso, toIso) {
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
    return (result.docs as Event[]).map(toEventItem);
  },

  /** A single published event by slug, or `null` (draft/unknown → the page returns 404) (FR-005/006). */
  async getPublishedBySlug(slug) {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: 'events',
      where: { and: [{ slug: { equals: slug } }, { status: { equals: 'published' } }] },
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as Event | undefined;
    return doc ? toEventItem(doc) : null;
  },
};
