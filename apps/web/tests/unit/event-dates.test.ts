import { describe, expect, it } from 'vitest';
import { formatEventWhen, isUpcoming, validateEventInterval } from '@/lib/event-dates';

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
