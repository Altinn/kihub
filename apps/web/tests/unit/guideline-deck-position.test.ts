import { describe, expect, it } from 'vitest';
import { deckUserKey } from '@/lib/guideline-deck';
import {
  type DeckPositionStorage,
  deckPositionStorageKey,
  readDeckPosition,
  resolveStartHash,
  writeDeckPosition,
} from '@/lib/guideline-deck-view';

/** 030 — pure rules for remembering the reader's place (specs/030-deck-resume-position). */

function fakeStorage(initial: Record<string, string> = {}): DeckPositionStorage & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const throwing: DeckPositionStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('quota');
  },
};

describe('resolveStartHash', () => {
  it('lets a valid page address win over the remembered place (FR-002)', () => {
    expect(resolveStartHash('#53', '#12')).toBe('#53');
    expect(resolveStartHash('#53.2', '#12')).toBe('#53.2');
  });

  it('uses the remembered place when the page address is empty or invalid (FR-001)', () => {
    expect(resolveStartHash('', '#12.2')).toBe('#12.2');
    expect(resolveStartHash('#abc', '#12')).toBe('#12');
    expect(resolveStartHash('#1234', '#12')).toBe('#12');
  });

  it('returns the first slide (empty) when neither is a slide address (FR-006)', () => {
    expect(resolveStartHash('', '')).toBe('');
    expect(resolveStartHash('#x', 'javascript:alert(1)')).toBe('');
    expect(resolveStartHash('', '#1;x')).toBe('');
    expect(resolveStartHash('', '#1234')).toBe('');
  });
});

describe('readDeckPosition', () => {
  const key = deckPositionStorageKey('abc');

  it('returns the remembered slide address', () => {
    expect(readDeckPosition(fakeStorage({ [key]: '#53.2' }), key)).toBe('#53.2');
  });

  it('ignores missing, empty, corrupted and hand-edited values', () => {
    expect(readDeckPosition(fakeStorage(), key)).toBe('');
    for (const bad of ['', 'null', '53', '#53; drop', '<script>', '#0x1', '#1234', '{"a":1}']) {
      expect(readDeckPosition(fakeStorage({ [key]: bad }), key)).toBe('');
    }
  });

  it('degrades to nothing when storage is unavailable or throws (FR-007)', () => {
    expect(readDeckPosition(null, key)).toBe('');
    expect(readDeckPosition(throwing, key)).toBe('');
  });
});

describe('writeDeckPosition', () => {
  const key = deckPositionStorageKey('abc');

  it('stores a valid slide address', () => {
    const storage = fakeStorage();
    expect(writeDeckPosition(storage, key, '#12.3')).toBe(true);
    expect(storage.data[key]).toBe('#12.3');
  });

  it('refuses anything that is not a slide address', () => {
    const storage = fakeStorage();
    for (const bad of ['', '#', '12', '#12;x', '#abc', '#1234']) {
      expect(writeDeckPosition(storage, key, bad)).toBe(false);
    }
    expect(storage.data).toEqual({});
  });

  it('swallows blocked or full storage (FR-007)', () => {
    expect(writeDeckPosition(throwing, key, '#12')).toBe(false);
    expect(writeDeckPosition(null, key, '#12')).toBe(false);
  });
});

describe('per-user keys (FR-004, FR-010)', () => {
  it('keeps two users apart in the same storage', () => {
    const storage = fakeStorage();
    const a = deckPositionStorageKey(deckUserKey('oid-a'));
    const b = deckPositionStorageKey(deckUserKey('oid-b'));
    writeDeckPosition(storage, a, '#40');
    expect(readDeckPosition(storage, a)).toBe('#40');
    expect(readDeckPosition(storage, b)).toBe('');
  });

  it('derives a stable, short, non-readable key from the oid', () => {
    const key = deckUserKey('mock-oid-member-0001');
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(deckUserKey('mock-oid-member-0001')).toBe(key);
    expect(deckUserKey('mock-oid-member-0002')).not.toBe(key);
    expect(key).not.toContain('mock');
  });
});
