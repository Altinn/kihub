# Contract: events read layer v2 (`src/lib/events.ts`)

Extends the 009 read contract (`specs/009-calendar-events/contracts/events-read.md`).
Both functions below return ONLY `status: 'published'` events by construction (draft exclusion
in the query itself, `overrideAccess: true`, collection access rule as second defense — FR-016).

## `listUpcomingEvents(filters?)`

```ts
type EventTypeValue = 'webinar' | 'verksted' | 'kurs' | 'konferanse' | 'internt';
type EventFormatValue = 'digitalt' | 'oppmote' | 'hybrid';

listUpcomingEvents(filters?: {
  types?: EventTypeValue[];   // TYPE multi-select: eventType IN types (omit/empty = all)
  form?: EventFormatValue;    // FORM single-select: format equals (omit = Alle)
}): Promise<Event[]>
```

- Upcoming semantics unchanged: `(endDateTime ?? startDateTime) >= now`, sort `startDateTime`
  asc, limit 200, stable featured-first re-sort.
- Filters are applied **in the Payload query** (server-side, FR-005).
- Called with no args by the frontpage (011 behavior byte-identical).

## `listEventsInRange(fromIso, toIso)` (new)

```ts
listEventsInRange(fromIso: string, toIso: string): Promise<Event[]>
```

- Published events **overlapping** `[from, to]`:
  `startDateTime <= to AND ((endDateTime exists AND endDateTime >= from) OR
  (endDateTime missing AND startDateTime >= from))`.
- Sorted `startDateTime` asc, limit 200. Includes past events inside the range (FR-007).
- Caller (calendar view) passes the full 6-week grid range so adjacent-month cells are
  populated.

## `getPublishedEventBySlug(slug)` — unchanged.

## Pure view module (`src/lib/events-view.ts`, new — no Payload imports)

```ts
EVENT_TYPES / EVENT_TYPE_LABELS       // value ↔ Norwegian label maps (single source)
EVENT_FORMATS / EVENT_FORMAT_LABELS
parseEventsSearchParams(sp: Record<string, string | string[] | undefined>):
  { view: 'liste' | 'kalender'; year: number; month: number;   // month 1–12, Oslo-current default
    types: EventTypeValue[]; form?: EventFormatValue }          // FR-018 fallbacks
buildMonthGrid(year: number, month: number, todayKey: string):
  Array<Array<{ dayKey: string; dayNumber: number; inMonth: boolean; isToday: boolean }>> // 6×7, Monday-first
osloDayKey(value: string | Date): string                        // 'YYYY-MM-DD' in Europe/Oslo
eventDayKeys(e: { startDateTime: string; endDateTime?: string | null }): string[]
groupEventsByDay<T extends { startDateTime: string }>(events: T[]): Array<[string, T[]]>
formatDateChip(dayKey: string): string                          // "Fredag 3. juli"
formatMonthTitle(year: number, month: number): string           // "August 2026"
prevMonth / nextMonth (year, month): { year; month }
gridRange(year: number, month: number): { fromIso: string; toIso: string } // 6-week span, Oslo
seatsText(capacity?: number | null, seatsTaken?: number | null): string
placeText(e: Pick<Event, 'format' | 'location' | 'onlineUrl'>): string
validateSeatCapacity(capacity?: number | null, seatsTaken?: number | null): void // throws
```
