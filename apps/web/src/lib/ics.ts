/**
 * 011 frontpage — pure RFC 5545 (iCalendar) generation for "+ Legg til i kalender"
 * (contracts/event-ics.md). ~40 lines of stable text format beat a dependency; no Payload
 * imports, so this unit-tests in isolation.
 */

/** The event fields the ICS needs — structural, so tests don't have to build full Payload docs. */
export interface IcsEvent {
  title: string;
  slug?: string | null;
  startDateTime: string;
  endDateTime?: string | null;
  location?: string | null;
  onlineUrl?: string | null;
  organizer?: string | null;
}

/** Escape a TEXT value per RFC 5545 §3.3.11: backslash, semicolon, comma, newline. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Render a date-time in UTC basic format (`YYYYMMDDTHHMMSSZ`). */
function utcStamp(value: string | Date): string {
  return new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Fold a content line at 75 octets per RFC 5545 §3.1 (continuation lines start with one space).
 * Folding is byte-based; we split on UTF-8 code-point boundaries below the limit.
 */
function foldLine(line: string): string[] {
  const LIMIT = 75;
  if (Buffer.byteLength(line, 'utf8') <= LIMIT) return [line];
  const out: string[] = [];
  let current = '';
  let budget = LIMIT;
  for (const char of line) {
    const width = Buffer.byteLength(char, 'utf8');
    if (Buffer.byteLength(current, 'utf8') + width > budget) {
      out.push(current);
      current = ' ';
      budget = LIMIT;
    }
    current += char;
  }
  out.push(current);
  return out;
}

/**
 * Build the calendar file for one published event. `UID` is slug-derived and stable so a
 * re-download updates the entry in calendar clients instead of duplicating it. Times are emitted
 * as UTC — clients localize, so no VTIMEZONE is needed.
 */
export function buildEventIcs(event: IcsEvent, baseUrl: string): string {
  const slug = event.slug ?? '';
  const description = [event.organizer, event.onlineUrl].filter(Boolean).join(' · ');

  const contentLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KI Hub//Events//NB',
    'BEGIN:VEVENT',
    `UID:${slug}@kihub`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(event.startDateTime)}`,
    ...(event.endDateTime ? [`DTEND:${utcStamp(event.endDateTime)}`] : []),
    `SUMMARY:${escapeText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
    `URL:${baseUrl}/events/${slug}`,
    ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return contentLines.flatMap(foldLine).join('\r\n') + '\r\n';
}
