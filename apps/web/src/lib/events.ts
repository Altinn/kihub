import { payloadEventsSource } from '@/lib/content/payload/events';
import type { EventItem } from '@/lib/content/types';
import type { EventFormatValue, EventTypeValue } from '@/lib/events-view';

/**
 * Phase 8 read layer for the employee-facing events surfaces. Since 023 a facade: the content
 * source behind it is chosen per module (contracts/content-source.md §4). Published-only, ordering
 * and not-found semantics are guaranteed by every source (§3).
 */

/** Published upcoming events, featured first, soonest-first within each group (FR-004/005). */
export function listUpcomingEvents(filters?: {
  types?: EventTypeValue[];
  form?: EventFormatValue;
}): Promise<EventItem[]> {
  return payloadEventsSource.listUpcoming(filters);
}

/** 012 FR-007 — published events overlapping [from, to], past included, soonest-first. */
export function listEventsInRange(fromIso: string, toIso: string): Promise<EventItem[]> {
  return payloadEventsSource.listInRange(fromIso, toIso);
}

/** A single published event by slug, past included, or `null` (draft/unknown → 404). */
export function getPublishedEventBySlug(slug: string): Promise<EventItem | null> {
  return payloadEventsSource.getPublishedBySlug(slug);
}
