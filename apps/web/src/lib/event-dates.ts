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
/**
 * 011 frontpage — date parts for the "Neste arrangement" card and "Utover måneden" timeline
 * (contracts/frontpage-read.md). Each helper renders one visual fragment in Europe/Oslo / nb-NO
 * regardless of server timezone.
 */
function osloPart(
  value: string | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('nb-NO', { timeZone: OSLO_TZ, ...options }).format(
    new Date(value),
  );
}

/** The card's large date numeral, always two digits ("03"). nb-NO appends a dot — strip it. */
export function formatDayNumeral(value: string | Date): string {
  return osloPart(value, { day: '2-digit' }).replace(/\.$/, '');
}

/** The card's "måned år" line ("juli 2026"). */
export function formatMonthYear(value: string | Date): string {
  return osloPart(value, { month: 'long', year: 'numeric' });
}

/** Short Norwegian weekday without the trailing dot ("fre"). */
export function formatWeekday(value: string | Date): string {
  return osloPart(value, { weekday: 'short' }).replace(/\.$/, '');
}

/** Oslo wall-clock time as HH:mm ("10:00"). */
export function formatTimeHM(value: string | Date): string {
  return osloPart(value, { hour: '2-digit', minute: '2-digit' });
}

/** Timeline row date as "dd. MMM" ("08. jul"). */
export function formatTimelineDate(value: string | Date): string {
  const month = osloPart(value, { month: 'short' }).replace(/\.$/, '');
  return `${formatDayNumeral(value)}. ${month}`;
}

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
