import { describe, expect, it } from 'vitest';
import { formatLearningUpdated } from '@/lib/learning-view';

/**
 * 014 T013 — "Sist oppdatert" formatting (FR-018). The explicit Europe/Oslo timeZone is the point of
 * these tests: without it the server's zone would decide the calendar day, and a page saved just
 * after midnight Oslo time would display the previous day.
 */
describe('formatLearningUpdated', () => {
  it('formats nb-NO long form', () => {
    expect(formatLearningUpdated('2026-08-10T12:00:00.000Z')).toBe('10. august 2026');
  });

  it('uses Oslo time across the UTC day boundary (the load-bearing case)', () => {
    // 22:30 UTC on 9 August is 00:30 Oslo on 10 August (CEST, +02:00).
    expect(formatLearningUpdated('2026-08-09T22:30:00.000Z')).toBe('10. august 2026');
  });

  it('does not roll the day forward too early', () => {
    // 21:30 UTC on 9 August is 23:30 Oslo, still 9 August.
    expect(formatLearningUpdated('2026-08-09T21:30:00.000Z')).toBe('9. august 2026');
  });

  it('handles the winter offset (CET, +01:00)', () => {
    // 23:30 UTC on 14 January is 00:30 Oslo on 15 January.
    expect(formatLearningUpdated('2026-01-14T23:30:00.000Z')).toBe('15. januar 2026');
    expect(formatLearningUpdated('2026-01-14T22:30:00.000Z')).toBe('14. januar 2026');
  });

  it('handles the spring DST transition', () => {
    // CEST starts 29 March 2026. 23:30 UTC on 28 March is 00:30 Oslo on 29 March (still CET).
    expect(formatLearningUpdated('2026-03-28T23:30:00.000Z')).toBe('29. mars 2026');
    // 22:30 UTC on 29 March is 00:30 Oslo on 30 March (now CEST).
    expect(formatLearningUpdated('2026-03-29T22:30:00.000Z')).toBe('30. mars 2026');
  });

  it('returns an empty string for a missing value so callers can omit the line', () => {
    expect(formatLearningUpdated(null)).toBe('');
    expect(formatLearningUpdated(undefined)).toBe('');
    expect(formatLearningUpdated('')).toBe('');
  });

  it('formats every Norwegian month name in lower case', () => {
    const months = Array.from({ length: 12 }, (_, i) =>
      formatLearningUpdated(`2026-${String(i + 1).padStart(2, '0')}-15T12:00:00.000Z`),
    );
    expect(months).toEqual([
      '15. januar 2026',
      '15. februar 2026',
      '15. mars 2026',
      '15. april 2026',
      '15. mai 2026',
      '15. juni 2026',
      '15. juli 2026',
      '15. august 2026',
      '15. september 2026',
      '15. oktober 2026',
      '15. november 2026',
      '15. desember 2026',
    ]);
  });
});
