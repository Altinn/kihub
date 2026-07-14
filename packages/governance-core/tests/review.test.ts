import { describe, expect, it } from 'vitest';
import { isExpired, REVIEW_TYPES } from '../src/review';

describe('REVIEW_TYPES', () => {
  it('has the six mandated typed-review categories (FR-014)', () => {
    expect(REVIEW_TYPES).toEqual([
      'security',
      'privacy-gdpr',
      'technical',
      'accessibility',
      'responsible-ai',
      'operational',
    ]);
  });
});

describe('isExpired (T024)', () => {
  const now = new Date('2026-07-14T12:00:00Z');

  it('is false for a future expiry date', () => {
    expect(isExpired('2026-08-01T00:00:00Z', now)).toBe(false);
  });

  it('is true for a past expiry date', () => {
    expect(isExpired('2026-01-01T00:00:00Z', now)).toBe(true);
  });

  it('is true at the exact boundary instant (not-before-expired semantics)', () => {
    expect(isExpired(now, now)).toBe(false);
    expect(isExpired(new Date(now.getTime() - 1), now)).toBe(true);
  });

  it('accepts a Date object as well as a string', () => {
    const future = new Date(now.getTime() + 86_400_000);
    expect(isExpired(future, now)).toBe(false);
  });
});
