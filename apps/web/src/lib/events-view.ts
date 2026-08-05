/**
 * 012 — pure view math for the /events page (contracts/events-read.md). No Payload imports, so
 * everything here is unit-testable in isolation (the lib/event-dates.ts pattern). All calendar
 * bucketing and display is Europe/Oslo + nb-NO (FR-017); a "day key" is the event's calendar day
 * in Oslo as 'YYYY-MM-DD', which is the DST/UTC-boundary-safe grouping unit.
 */

const OSLO_TZ = 'Europe/Oslo';

/* ---------- Event type / format enums (single source for values, labels, filters) ---------- */

export const EVENT_TYPES = ['webinar', 'verksted', 'kurs', 'konferanse', 'internt'] as const;
export type EventTypeValue = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_LABELS: Record<EventTypeValue, string> = {
  webinar: 'Webinar',
  verksted: 'Verksted',
  kurs: 'Kurs',
  konferanse: 'Konferanse',
  internt: 'Internt',
};

export const EVENT_FORMATS = ['digitalt', 'oppmote', 'hybrid'] as const;
export type EventFormatValue = (typeof EVENT_FORMATS)[number];

export const EVENT_FORMAT_LABELS: Record<EventFormatValue, string> = {
  digitalt: 'Digitalt',
  oppmote: 'Oppmøte',
  hybrid: 'Hybrid',
};

function isEventType(value: string): value is EventTypeValue {
  return (EVENT_TYPES as readonly string[]).includes(value);
}

function isEventFormat(value: string): value is EventFormatValue {
  return (EVENT_FORMATS as readonly string[]).includes(value);
}

/* ---------- Oslo day math ---------- */

/** The instant's calendar day in Oslo as 'YYYY-MM-DD' (en-CA yields ISO date order directly). */
export function osloDayKey(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OSLO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

/** Day-key helpers work on pure calendar days; UTC ms is only the arithmetic carrier. */
function keyToUtcMs(dayKey: string): number {
  const [y = 0, m = 1, d = 1] = dayKey.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcMsToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Guard for malformed data (end years after start): longest span we will expand. */
const MAX_SPAN_DAYS = 62;

/**
 * Every Oslo calendar day an event spans, start day → end day inclusive (FR-007: multi-day
 * events appear in each spanned cell). No end → just the start day.
 */
export function eventDayKeys(event: {
  startDateTime: string;
  endDateTime?: string | null;
}): string[] {
  const startKey = osloDayKey(event.startDateTime);
  if (!event.endDateTime) return [startKey];
  const endKey = osloDayKey(event.endDateTime);
  if (endKey <= startKey) return [startKey];
  const keys: string[] = [];
  const endMs = keyToUtcMs(endKey);
  for (
    let ms = keyToUtcMs(startKey), i = 0;
    ms <= endMs && i <= MAX_SPAN_DAYS;
    ms += DAY_MS, i += 1
  ) {
    keys.push(utcMsToKey(ms));
  }
  return keys;
}

/**
 * Group a start-sorted event list by Oslo start day for the list view's date chips (FR-002).
 * Insertion order of the groups follows the input order, so soonest-day-first falls out.
 */
export function groupEventsByDay<T extends { startDateTime: string }>(
  events: T[],
): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const key = osloDayKey(event.startDateTime);
    const group = groups.get(key);
    if (group) group.push(event);
    else groups.set(key, [event]);
  }
  return [...groups.entries()];
}

/* ---------- Month grid (FR-006) ---------- */

export interface MonthGridCell {
  dayKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
}

/**
 * A fixed 6×7 Monday-first grid for `year`/`month` (1–12). Six weeks keeps the layout stable
 * across months and always includes the dimmed leading/trailing adjacent-month days. Pure
 * calendar-day math (UTC carrier) — timezone only enters via `todayKey`, an Oslo day key.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  todayKey: string,
): MonthGridCell[][] {
  const firstOfMonth = Date.UTC(year, month - 1, 1);
  // getUTCDay(): 0=Sunday … 6=Saturday → Monday-first offset 0=Monday … 6=Sunday.
  const mondayOffset = (new Date(firstOfMonth).getUTCDay() + 6) % 7;
  const gridStart = firstOfMonth - mondayOffset * DAY_MS;

  const weeks: MonthGridCell[][] = [];
  for (let week = 0; week < 6; week += 1) {
    const cells: MonthGridCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const ms = gridStart + (week * 7 + day) * DAY_MS;
      const date = new Date(ms);
      const dayKey = utcMsToKey(ms);
      cells.push({
        dayKey,
        dayNumber: date.getUTCDate(),
        inMonth: date.getUTCMonth() === month - 1 && date.getUTCFullYear() === year,
        isToday: dayKey === todayKey,
      });
    }
    weeks.push(cells);
  }
  return weeks;
}

/** Oslo wall-clock parts shown at a given instant (offset-independent building block). */
function osloParts(utcMs: number): { y: number; m: number; d: number; h: number; min: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: OSLO_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') };
}

/**
 * The UTC instant at which the Oslo wall clock shows the given local time. Two fix-up rounds
 * converge for DST-shifting zones (the standard inverse-offset trick — no timezone library).
 */
function osloWallTimeToUtcMs(y: number, m: number, d: number, h = 0, min = 0): number {
  const desired = Date.UTC(y, m - 1, d, h, min);
  let ts = desired;
  for (let i = 0; i < 2; i += 1) {
    const shown = osloParts(ts);
    ts += desired - Date.UTC(shown.y, shown.m - 1, shown.d, shown.h, shown.min);
  }
  return ts;
}

/**
 * The instant range covering the whole 6-week grid of `year`/`month` in Oslo time — from the
 * first cell's Oslo midnight to the last cell's end of day. Feed to `listEventsInRange` so
 * adjacent-month cells get their events too (spec edge case).
 */
export function gridRange(year: number, month: number): { fromIso: string; toIso: string } {
  // Same start-of-grid arithmetic as buildMonthGrid; 42 cells later is the day after the grid.
  const firstOfMonth = Date.UTC(year, month - 1, 1);
  const mondayOffset = (new Date(firstOfMonth).getUTCDay() + 6) % 7;
  const first = new Date(firstOfMonth - mondayOffset * DAY_MS);
  const after = new Date(first.getTime() + 42 * DAY_MS);
  const from = osloWallTimeToUtcMs(
    first.getUTCFullYear(),
    first.getUTCMonth() + 1,
    first.getUTCDate(),
  );
  const to =
    osloWallTimeToUtcMs(after.getUTCFullYear(), after.getUTCMonth() + 1, after.getUTCDate()) - 1;
  return { fromIso: new Date(from).toISOString(), toIso: new Date(to).toISOString() };
}

export function prevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/* ---------- nb-NO display formatting ---------- */

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A day key rendered at UTC noon: Oslo (max UTC+2) shows the same calendar day, no tz drift. */
function dayKeyToDate(dayKey: string): Date {
  return new Date(keyToUtcMs(dayKey) + 12 * 60 * 60 * 1000);
}

/** List-view date chip: "Fredag 3. juli" (FR-002). */
export function formatDateChip(dayKey: string): string {
  const text = new Intl.DateTimeFormat('nb-NO', {
    timeZone: OSLO_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(dayKeyToDate(dayKey));
  return capitalize(text);
}

/** Calendar heading: "August 2026" (FR-006). */
export function formatMonthTitle(year: number, month: number): string {
  const text = new Intl.DateTimeFormat('nb-NO', {
    timeZone: OSLO_TZ,
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 15, 12)));
  return capitalize(text);
}

/** Monday-first weekday headers: MAN TIR ONS TOR FRE LØR SØN. */
export function weekdayHeaders(): string[] {
  const fmt = new Intl.DateTimeFormat('nb-NO', { timeZone: OSLO_TZ, weekday: 'short' });
  // 2026-08-03 is a Monday; format seven consecutive days from it.
  return Array.from({ length: 7 }, (_, i) =>
    fmt
      .format(new Date(Date.UTC(2026, 7, 3 + i, 12)))
      .replace(/\.$/, '')
      .toUpperCase(),
  );
}

/* ---------- Search-param contract (FR-001/005/006/018) ---------- */

export interface EventsPageState {
  view: 'liste' | 'kalender';
  /** Displayed calendar year/month (month 1–12); defaults to the current Oslo month. */
  year: number;
  month: number;
  types: EventTypeValue[];
  form?: EventFormatValue;
}

type SearchParams = Record<string, string | string[] | undefined>;

function asArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse/validate the page's URL state with graceful fallbacks (FR-018): unknown view → liste,
 * malformed month → current Oslo month, unknown type/form values ignored.
 */
export function parseEventsSearchParams(sp: SearchParams, now: Date = new Date()): EventsPageState {
  const view = sp.view === 'kalender' ? 'kalender' : 'liste';

  const todayKey = osloDayKey(now);
  let year = Number(todayKey.slice(0, 4));
  let month = Number(todayKey.slice(5, 7));
  const rawMonth = Array.isArray(sp.month) ? sp.month[0] : sp.month;
  if (rawMonth && /^\d{4}-\d{2}$/.test(rawMonth)) {
    const y = Number(rawMonth.slice(0, 4));
    const m = Number(rawMonth.slice(5, 7));
    if (m >= 1 && m <= 12) {
      year = y;
      month = m;
    }
  }

  const types = [...new Set(asArray(sp.type).filter(isEventType))];
  const rawForm = Array.isArray(sp.form) ? sp.form[0] : sp.form;
  const form = rawForm && isEventFormat(rawForm) ? rawForm : undefined;

  return { view, year, month, types, form };
}

/* ---------- Seats & place display (FR-003/004) ---------- */

/** "X av Y plasser igjen" / "Fullt" / "Åpen for alle" — capacity is the switch. */
export function seatsText(
  capacity?: number | null,
  seatsTaken?: number | null,
): string {
  if (capacity == null) return 'Åpen for alle';
  const remaining = Math.max(0, capacity - (seatsTaken ?? 0));
  if (remaining === 0) return 'Fullt';
  return `${remaining} av ${capacity} plasser igjen`;
}

/** Where the event happens, never blank: location, or "Digitalt", or the format label. */
export function placeText(event: {
  format?: string | null;
  location?: string | null;
  onlineUrl?: string | null;
}): string {
  if (event.format === 'digitalt') return 'Digitalt';
  if (event.location) return event.location;
  if (event.onlineUrl) return 'Digitalt';
  return isEventFormat(event.format ?? '') ? EVENT_FORMAT_LABELS[event.format as EventFormatValue] : 'Digitalt';
}

/* ---------- Editorial validation (FR-012) ---------- */

/**
 * Reject invalid capacity/seats combinations with editor-friendly messages (used by the
 * collection's beforeValidate hook, like `validateEventInterval`).
 */
export function validateSeatCapacity(
  capacity?: number | null,
  seatsTaken?: number | null,
): void {
  if (capacity != null && (!Number.isInteger(capacity) || capacity < 1)) {
    throw new Error('Capacity must be a whole number of at least 1.');
  }
  if (seatsTaken != null && (!Number.isInteger(seatsTaken) || seatsTaken < 0)) {
    throw new Error('Seats taken must be a whole number of 0 or more.');
  }
  if (capacity != null && seatsTaken != null && seatsTaken > capacity) {
    throw new Error('Seats taken cannot exceed the capacity.');
  }
}
