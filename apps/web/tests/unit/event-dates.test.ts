import { describe, expect, it } from 'vitest';
import {
  formatDayNumeral,
  formatEventWhen,
  formatMonthYear,
  formatTimeHM,
  formatTimelineDate,
  formatWeekday,
  isUpcoming,
  validateEventInterval,
} from '@/lib/event-dates';

/** T011 (US2, FR-004/011/015) — the pure date logic used by the Events collection + read layer. */
describe('validateEventInterval (FR-011)', () => {
  it('accepts a missing end (end is optional)', () => {
    expect(() => validateEventInterval('2026-09-01T10:00:00.000Z')).not.toThrow();
    expect(() => validateEventInterval('2026-09-01T10:00:00.000Z', null)).not.toThrow();
  });

  it('accepts an end at or after the start', () => {
    expect(() =>
      validateEventInterval('2026-09-01T10:00:00.000Z', '2026-09-01T11:00:00.000Z'),
    ).not.toThrow();
    expect(() =>
      validateEventInterval('2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'),
    ).not.toThrow();
  });

  it('rejects an end before the start', () => {
    expect(() =>
      validateEventInterval('2026-09-01T10:00:00.000Z', '2026-09-01T09:00:00.000Z'),
    ).toThrow();
  });
});

describe('isUpcoming (FR-004)', () => {
  const now = new Date('2026-09-01T12:00:00.000Z');

  it('hides a fully-past event (start and end both before now)', () => {
    expect(
      isUpcoming(
        { startDateTime: '2026-08-01T10:00:00.000Z', endDateTime: '2026-08-01T11:00:00.000Z' },
        now,
      ),
    ).toBe(false);
  });

  it('hides a past event with no end (start before now)', () => {
    expect(isUpcoming({ startDateTime: '2026-08-01T10:00:00.000Z' }, now)).toBe(false);
  });

  it('shows an in-progress event (started, not yet ended)', () => {
    expect(
      isUpcoming(
        { startDateTime: '2026-09-01T11:00:00.000Z', endDateTime: '2026-09-01T13:00:00.000Z' },
        now,
      ),
    ).toBe(true);
  });

  it('shows a future event', () => {
    expect(isUpcoming({ startDateTime: '2026-09-02T10:00:00.000Z' }, now)).toBe(true);
  });
});

describe('formatEventWhen (FR-015, Europe/Oslo)', () => {
  it('renders the start in Europe/Oslo (summer = UTC+2)', () => {
    // 08:30 UTC on 1 Sep is 10:30 in Oslo (CEST).
    const when = formatEventWhen('2026-09-01T08:30:00.000Z');
    expect(when).toContain('10:30');
    expect(when).toContain('2026');
  });

  it('renders a compact start–end range for a same-day event', () => {
    const when = formatEventWhen('2026-09-01T08:00:00.000Z', '2026-09-01T09:00:00.000Z');
    // 10:00 Oslo to 11:00 Oslo, same day → "…, 10:00–11:00".
    expect(when).toContain('10:00–11:00');
  });
});

/**
 * T003 (011 frontpage, contracts/frontpage-read.md) — the date-part helpers behind the
 * "Neste arrangement" card and the "Utover måneden" timeline. All parts render in Europe/Oslo /
 * nb-NO regardless of the server timezone.
 */
describe('frontpage date parts (011, Europe/Oslo)', () => {
  // 08:00 UTC on Fri 3 Jul 2026 = 10:00 in Oslo (CEST, UTC+2).
  const start = '2026-07-03T08:00:00.000Z';

  it('formatDayNumeral renders the 2-digit Oslo day of month', () => {
    expect(formatDayNumeral(start)).toBe('03');
  });

  it('formatMonthYear renders the full Norwegian month + year', () => {
    expect(formatMonthYear(start)).toBe('juli 2026');
  });

  it('formatWeekday renders the short Norwegian weekday without a trailing dot', () => {
    expect(formatWeekday(start)).toBe('fre');
  });

  it('formatTimeHM renders the Oslo wall-clock time as HH:mm', () => {
    expect(formatTimeHM(start)).toBe('10:00');
  });

  it('formatTimelineDate renders "dd. MMM" for timeline rows', () => {
    expect(formatTimelineDate('2026-07-08T11:00:00.000Z')).toBe('08. jul');
  });

  it('uses the Oslo date even when UTC is still the previous day', () => {
    // 22:30 UTC on 3 Jul is 00:30 on 4 Jul in Oslo.
    const lateUtc = '2026-07-03T22:30:00.000Z';
    expect(formatDayNumeral(lateUtc)).toBe('04');
    expect(formatTimeHM(lateUtc)).toBe('00:30');
    expect(formatTimelineDate(lateUtc)).toBe('04. jul');
  });
});
