import { describe, expect, it } from 'vitest';
import {
  EVENT_FORMAT_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  buildMonthGrid,
  eventDayKeys,
  formatDateChip,
  formatMonthTitle,
  gridRange,
  groupEventsByDay,
  nextMonth,
  osloDayKey,
  parseEventsSearchParams,
  placeText,
  prevMonth,
  seatsText,
  validateSeatCapacity,
  weekdayHeaders,
} from '../../src/lib/events-view';

describe('osloDayKey', () => {
  it('buckets by the Oslo calendar day, not the UTC day (CEST: UTC+2)', () => {
    // 22:30 UTC on July 2 is 00:30 on July 3 in Oslo.
    expect(osloDayKey('2026-07-02T22:30:00.000Z')).toBe('2026-07-03');
  });

  it('handles winter time (CET: UTC+1)', () => {
    // 23:30 UTC on Jan 10 is 00:30 on Jan 11 in Oslo.
    expect(osloDayKey('2026-01-10T23:30:00.000Z')).toBe('2026-01-11');
    // …but 22:30 UTC is still 23:30 the same day.
    expect(osloDayKey('2026-01-10T22:30:00.000Z')).toBe('2026-01-10');
  });
});

describe('eventDayKeys', () => {
  it('is just the start day when there is no end', () => {
    expect(eventDayKeys({ startDateTime: '2026-08-03T08:00:00.000Z' })).toEqual(['2026-08-03']);
  });

  it('spans every Oslo day from start to end inclusive', () => {
    expect(
      eventDayKeys({
        startDateTime: '2026-08-03T08:00:00.000Z',
        endDateTime: '2026-08-05T14:00:00.000Z',
      }),
    ).toEqual(['2026-08-03', '2026-08-04', '2026-08-05']);
  });

  it('spans month boundaries', () => {
    expect(
      eventDayKeys({
        startDateTime: '2026-08-31T08:00:00.000Z',
        endDateTime: '2026-09-01T14:00:00.000Z',
      }),
    ).toEqual(['2026-08-31', '2026-09-01']);
  });

  it('same-Oslo-day start and end yields one day', () => {
    expect(
      eventDayKeys({
        startDateTime: '2026-08-03T08:00:00.000Z',
        endDateTime: '2026-08-03T10:00:00.000Z',
      }),
    ).toEqual(['2026-08-03']);
  });
});

describe('groupEventsByDay', () => {
  it('groups a sorted list by Oslo day, preserving order', () => {
    const events = [
      { startDateTime: '2026-07-03T08:00:00.000Z', title: 'a' },
      { startDateTime: '2026-07-03T11:00:00.000Z', title: 'b' },
      { startDateTime: '2026-07-08T11:00:00.000Z', title: 'c' },
    ];
    const groups = groupEventsByDay(events);
    expect(groups.map(([key]) => key)).toEqual(['2026-07-03', '2026-07-08']);
    expect(groups[0][1].map((e) => e.title)).toEqual(['a', 'b']);
  });

  it('splits UTC-same-day events that fall on different Oslo days', () => {
    const groups = groupEventsByDay([
      { startDateTime: '2026-07-02T10:00:00.000Z' },
      { startDateTime: '2026-07-02T22:30:00.000Z' }, // 00:30 July 3 in Oslo
    ]);
    expect(groups.map(([key]) => key)).toEqual(['2026-07-02', '2026-07-03']);
  });
});

describe('buildMonthGrid', () => {
  it('renders August 2026 as the reference 6×7 Monday-first grid', () => {
    const grid = buildMonthGrid(2026, 8, '2026-08-05');
    expect(grid).toHaveLength(6);
    expect(grid.every((week) => week.length === 7)).toBe(true);
    // The screenshot month: leading 27–31 July, trailing 1–6 September.
    expect(grid[0].map((c) => c.dayNumber)).toEqual([27, 28, 29, 30, 31, 1, 2]);
    expect(grid[0][0].inMonth).toBe(false);
    expect(grid[0][5]).toMatchObject({ dayKey: '2026-08-01', inMonth: true });
    expect(grid[5].map((c) => c.dayNumber)).toEqual([31, 1, 2, 3, 4, 5, 6]);
    expect(grid[5][1].inMonth).toBe(false);
    const today = grid.flat().find((c) => c.isToday);
    expect(today).toMatchObject({ dayKey: '2026-08-05', dayNumber: 5, inMonth: true });
  });

  it('starts on the 1st when the month begins on a Monday', () => {
    // June 2026 starts on a Monday.
    const grid = buildMonthGrid(2026, 6, '');
    expect(grid[0][0]).toMatchObject({ dayKey: '2026-06-01', inMonth: true });
  });

  it('handles February in a non-leap year', () => {
    const grid = buildMonthGrid(2026, 2, '');
    const inMonth = grid.flat().filter((c) => c.inMonth);
    expect(inMonth).toHaveLength(28);
    expect(inMonth[0].dayKey).toBe('2026-02-01');
    expect(inMonth.at(-1)?.dayKey).toBe('2026-02-28');
  });

  it('covers DST-transition months without duplicating or dropping days', () => {
    // March 2026 (spring forward) and October 2026 (fall back).
    for (const [month, days] of [
      [3, 31],
      [10, 31],
    ] as const) {
      const grid = buildMonthGrid(2026, month, '');
      const inMonth = grid.flat().filter((c) => c.inMonth);
      expect(inMonth).toHaveLength(days);
      expect(new Set(inMonth.map((c) => c.dayKey)).size).toBe(days);
    }
  });
});

describe('gridRange', () => {
  it('covers the whole 6-week grid in Oslo time (CEST in August)', () => {
    const { fromIso, toIso } = gridRange(2026, 8);
    // Grid starts Monday July 27 — Oslo midnight is 22:00 UTC the day before.
    expect(fromIso).toBe('2026-07-26T22:00:00.000Z');
    // Grid ends Sunday September 6 — end of day just before Oslo midnight Sept 7.
    expect(toIso).toBe('2026-09-06T21:59:59.999Z');
  });

  it('uses the winter offset for winter months', () => {
    const { fromIso } = gridRange(2026, 1);
    // January 2026 grid starts Monday Dec 29 2025; Oslo midnight is 23:00 UTC (CET).
    expect(fromIso).toBe('2025-12-28T23:00:00.000Z');
  });
});

describe('month navigation', () => {
  it('wraps year boundaries', () => {
    expect(prevMonth(2026, 1)).toEqual({ year: 2025, month: 12 });
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
    expect(prevMonth(2026, 8)).toEqual({ year: 2026, month: 7 });
    expect(nextMonth(2026, 8)).toEqual({ year: 2026, month: 9 });
  });
});

describe('nb-NO formatting', () => {
  it('formats the date chip like the reference design', () => {
    expect(formatDateChip('2026-07-03')).toBe('Fredag 3. juli');
    expect(formatDateChip('2026-09-04')).toBe('Fredag 4. september');
  });

  it('formats the month title capitalized', () => {
    expect(formatMonthTitle(2026, 8)).toBe('August 2026');
  });

  it('yields Monday-first Norwegian weekday headers', () => {
    expect(weekdayHeaders()).toEqual(['MAN', 'TIR', 'ONS', 'TOR', 'FRE', 'LØR', 'SØN']);
  });
});

describe('parseEventsSearchParams (FR-018 fallbacks)', () => {
  const now = new Date('2026-08-05T10:00:00.000Z');

  it('defaults to the list view and the current Oslo month', () => {
    expect(parseEventsSearchParams({}, now)).toEqual({
      view: 'liste',
      year: 2026,
      month: 8,
      types: [],
      form: undefined,
    });
  });

  it('accepts the calendar view and a valid month', () => {
    const state = parseEventsSearchParams({ view: 'kalender', month: '2026-09' }, now);
    expect(state).toMatchObject({ view: 'kalender', year: 2026, month: 9 });
  });

  it('falls back on unknown view and malformed month', () => {
    expect(parseEventsSearchParams({ view: 'week' }, now).view).toBe('liste');
    for (const month of ['garbage', '2026-13', '2026-0', '202608', '2026-08-01']) {
      const state = parseEventsSearchParams({ view: 'kalender', month }, now);
      expect(state, `month=${month}`).toMatchObject({ year: 2026, month: 8 });
    }
  });

  it('collects repeated valid types and ignores unknown values', () => {
    const state = parseEventsSearchParams(
      { type: ['webinar', 'kurs', 'webinar', 'nonsense'], form: 'digitalt' },
      now,
    );
    expect(state.types).toEqual(['webinar', 'kurs']);
    expect(state.form).toBe('digitalt');
  });

  it('ignores unknown form values', () => {
    expect(parseEventsSearchParams({ form: 'metaverse' }, now).form).toBeUndefined();
  });
});

describe('seatsText (FR-004)', () => {
  it('is "Åpen for alle" without capacity, regardless of seatsTaken', () => {
    expect(seatsText(null, null)).toBe('Åpen for alle');
    expect(seatsText(undefined, 12)).toBe('Åpen for alle');
  });

  it('computes remaining seats', () => {
    expect(seatsText(24, 15)).toBe('9 av 24 plasser igjen');
    expect(seatsText(30, undefined)).toBe('30 av 30 plasser igjen');
  });

  it('shows "Fullt" at zero and floors below zero', () => {
    expect(seatsText(24, 24)).toBe('Fullt');
    expect(seatsText(24, 30)).toBe('Fullt');
  });
});

describe('placeText', () => {
  it('is "Digitalt" for digital events even with a location set', () => {
    expect(placeText({ format: 'digitalt', location: 'Møterom Fjorden' })).toBe('Digitalt');
  });

  it('prefers the location for oppmøte/hybrid', () => {
    expect(placeText({ format: 'oppmote', location: 'Læringssenteret' })).toBe('Læringssenteret');
    expect(placeText({ format: 'hybrid', location: 'Oslo Kongressenter' })).toBe(
      'Oslo Kongressenter',
    );
  });

  it('never renders blank', () => {
    expect(placeText({ format: 'hybrid', onlineUrl: 'https://example.com' })).toBe('Digitalt');
    expect(placeText({ format: 'oppmote' })).toBe('Oppmøte');
  });
});

describe('validateSeatCapacity (FR-012)', () => {
  it('accepts valid combinations', () => {
    expect(() => validateSeatCapacity(null, null)).not.toThrow();
    expect(() => validateSeatCapacity(24, 0)).not.toThrow();
    expect(() => validateSeatCapacity(24, 24)).not.toThrow();
    expect(() => validateSeatCapacity(1, undefined)).not.toThrow();
  });

  it('rejects non-positive or fractional capacity', () => {
    expect(() => validateSeatCapacity(0, null)).toThrow(/at least 1/);
    expect(() => validateSeatCapacity(10.5, null)).toThrow(/whole number/);
  });

  it('rejects negative or fractional seatsTaken', () => {
    expect(() => validateSeatCapacity(10, -1)).toThrow(/0 or more/);
    expect(() => validateSeatCapacity(10, 2.5)).toThrow(/whole number/);
  });

  it('rejects seatsTaken above capacity', () => {
    expect(() => validateSeatCapacity(24, 25)).toThrow(/exceed/);
  });
});

describe('enums', () => {
  it('exposes the five types and three formats with Norwegian labels', () => {
    expect(EVENT_TYPES).toHaveLength(5);
    expect(EVENT_TYPE_LABELS.konferanse).toBe('Konferanse');
    expect(EVENT_FORMAT_LABELS.oppmote).toBe('Oppmøte');
  });
});
