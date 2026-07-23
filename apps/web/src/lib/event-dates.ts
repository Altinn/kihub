/**
 * Phase 8 — pure date/time helpers for the Calendar/Events module. No Payload imports, so these are
 * unit-testable in isolation (mirroring how `lib/slug.ts` is separate from `lib/events.ts`). All
 * display is in Europe/Oslo (FR-015).
 */

const OSLO_TZ = 'Europe/Oslo';

/**
 * Reject an event whose end precedes its start (FR-011). Throws with a friendly message so the
 * collection `beforeValidate` hook surfaces it to editors. A missing/empty end is always valid —
 * the end datetime is optional.
 */
export function validateEventInterval(start: string | Date, end?: string | Date | null): void {
  if (!end) return;
  if (new Date(end).getTime() < new Date(start).getTime()) {
    throw new Error('End date/time must not be before the start date/time.');
  }
}

/**
 * An event is "upcoming" (shown in the employee list) until it has ended: true when
 * `(endDateTime ?? startDateTime) >= now`. An event that has started but not yet ended still counts
 * as upcoming; only fully-past events are hidden (FR-004).
 */
export function isUpcoming(
  event: { startDateTime: string; endDateTime?: string | null },
  now: Date,
): boolean {
  const effectiveEnd = event.endDateTime ?? event.startDateTime;
  return new Date(effectiveEnd).getTime() >= now.getTime();
}

/**
 * Render an event's when-string for display in nb-NO / Europe/Oslo (FR-015). Shows the start, and
 * the end when present (a compact `start–end` form when both fall on the same Oslo date).
 */
export function formatEventWhen(start: string | Date, end?: string | Date | null): string {
  const startDate = new Date(start);
  const dateFmt = new Intl.DateTimeFormat('nb-NO', {
    timeZone: OSLO_TZ,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat('nb-NO', {
    timeZone: OSLO_TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
  const startStr = `${dateFmt.format(startDate)}, ${timeFmt.format(startDate)}`;
  if (!end) return startStr;
  const endDate = new Date(end);
  const sameDay = dateFmt.format(startDate) === dateFmt.format(endDate);
  return sameDay
    ? `${startStr}–${timeFmt.format(endDate)}`
    : `${startStr} – ${dateFmt.format(endDate)}, ${timeFmt.format(endDate)}`;
}
