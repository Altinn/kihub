import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildDeckSrc,
  DECK_ENTRY,
  deckIsAvailable,
  diskDeckStore,
  getDeckStore,
  isGuidelineDeckEnabled,
  parseDeckHash,
  resolveAzureDeckConfig,
  resolveDeckPath,
} from '@/lib/guideline-deck';

/**
 * 029 — pure rules of the guideline-deck seam (contracts/deck-route.md §B/§D, guideline-page.md §B).
 * Uses only the synthetic fixture deck; the real INTERN deck is never part of the test suite (FR-015).
 */
const FIXTURE = fileURLToPath(new URL('../fixtures/deck/', import.meta.url));

async function text(stream: ReadableStream<Uint8Array>): Promise<string> {
  return new Response(stream).text();
}

describe('isGuidelineDeckEnabled', () => {
  it('is on only for the exact value "true"', () => {
    expect(isGuidelineDeckEnabled({ GUIDELINE_DECK_ENABLED: 'true' })).toBe(true);
    for (const value of [undefined, '', 'TRUE', 'True', '1', 'yes', 'true ', 'false']) {
      expect(isGuidelineDeckEnabled({ GUIDELINE_DECK_ENABLED: value })).toBe(false);
    }
  });
});

describe('resolveDeckPath', () => {
  it('accepts the files of the real bundle layout', () => {
    expect(resolveDeckPath(['index.html'])).toEqual({
      ok: true,
      key: 'index.html',
      contentType: 'text/html; charset=utf-8',
    });
    expect(resolveDeckPath(['assets', 'deck.js'])).toMatchObject({ ok: true, key: 'assets/deck.js' });
    expect(resolveDeckPath(['assets', 'deck.css'])).toMatchObject({ contentType: 'text/css; charset=utf-8' });
    expect(resolveDeckPath(['assets', 'fonts', 'InterVariable.woff2'])).toMatchObject({
      ok: true,
      contentType: 'font/woff2',
    });
    expect(resolveDeckPath(['assets', 'blob.svg'])).toMatchObject({ contentType: 'image/svg+xml' });
  });

  it('matches the extension case-insensitively', () => {
    expect(resolveDeckPath(['assets', 'LOGO.PNG'])).toMatchObject({ ok: true, contentType: 'image/png' });
  });

  it.each([
    ['parent segment', ['..', 'package.json']],
    ['current segment', ['.', 'index.html']],
    ['climbing out of assets', ['assets', '..', '..', 'package.json']],
    ['encoded dots left literal', ['%2e%2e', 'package.json']],
    ['encoded slash left literal', ['..%2f..%2fpackage.json']],
    ['backslash', ['assets\\deck.js']],
    ['slash inside a segment', ['assets/deck.js']],
    ['NUL byte', ['index.html\0.png']],
    ['empty segment', ['assets', '', 'deck.js']],
    ['dotfile', ['.env']],
    ['dotfile in a folder', ['assets', '.htaccess.html']],
    ['space', ['my file.html']],
    ['README', ['README.md']],
    ['source map', ['assets', 'deck.js.map']],
    ['no extension', ['assets', 'deck']],
    ['trailing dot', ['index.']],
    ['a bare folder', ['assets']],
    ['unknown extension', ['assets', 'deck.exe']],
    ['too many segments', ['a', 'b', 'c', 'd', 'e.js']],
    ['no segments', []],
  ])('rejects %s', (_label, segments) => {
    expect(resolveDeckPath(segments)).toEqual({ ok: false });
  });
});

describe('parseDeckHash / buildDeckSrc', () => {
  it('accepts the deck slide grammar #N and #N.b', () => {
    for (const hash of ['#1', '#53', '#70', '#104', '#70.2', '#7.12']) {
      expect(parseDeckHash(hash)).toBe(hash);
    }
  });

  it.each(['', '#', '#0x', '#53;x', '#1234', '#53.123', '53', '#abc', '#53"onload="x', '#-1', '##5'])(
    'drops %j',
    (hash) => {
      expect(parseDeckHash(hash)).toBe('');
    },
  );

  it('builds the iframe / full-screen address', () => {
    expect(buildDeckSrc('')).toBe(DECK_ENTRY);
    expect(buildDeckSrc('#53')).toBe(`${DECK_ENTRY}#53`);
    expect(buildDeckSrc('#70.2')).toBe(`${DECK_ENTRY}#70.2`);
    expect(buildDeckSrc('#53"onload="x')).toBe(DECK_ENTRY);
  });

  it('keeps the entry on an explicit index.html', () => {
    expect(DECK_ENTRY.endsWith('/index.html')).toBe(true);
  });
});

describe('resolveAzureDeckConfig', () => {
  it('names every missing variable at once', () => {
    expect(() => resolveAzureDeckConfig({})).toThrow(
      /AZURE_STORAGE_CONNECTION_STRING, GUIDELINE_DECK_CONTAINER/,
    );
    expect(() => resolveAzureDeckConfig({ AZURE_STORAGE_CONNECTION_STRING: 'x', GUIDELINE_DECK_CONTAINER: '  ' })).toThrow(
      /GUIDELINE_DECK_CONTAINER/,
    );
  });

  it('returns trimmed values', () => {
    expect(
      resolveAzureDeckConfig({ AZURE_STORAGE_CONNECTION_STRING: ' cs ', GUIDELINE_DECK_CONTAINER: ' kihub-protected ' }),
    ).toEqual({ connectionString: 'cs', containerName: 'kihub-protected' });
  });
});

describe('getDeckStore', () => {
  it('fails loudly in azure mode without the settings', () => {
    expect(() => getDeckStore({ MEDIA_STORAGE_MODE: 'azure' })).toThrow(/GUIDELINE_DECK_CONTAINER/);
  });

  it('rejects an unrecognised storage mode instead of falling back to disk', () => {
    expect(() => getDeckStore({ MEDIA_STORAGE_MODE: 'blob' })).toThrow(/MEDIA_STORAGE_MODE/);
  });

  it('reads from GUIDELINE_DECK_DIR in disk mode', async () => {
    const store = getDeckStore({ GUIDELINE_DECK_DIR: FIXTURE });
    expect(await deckIsAvailable(store)).toBe(true);
  });
});

describe('diskDeckStore (synthetic fixture)', () => {
  const store = diskDeckStore(FIXTURE);

  it('streams a fixture file with its size', async () => {
    const file = await store.read('index.html');
    expect(file).not.toBeNull();
    expect(await text(file!.body)).toContain('FIXTURE-DECK-MARKER-7f3a');
    expect(file!.size).toBeGreaterThan(0);
  });

  it('returns null for a missing file or a folder', async () => {
    expect(await store.read('nope.html')).toBeNull();
    expect(await store.read('assets')).toBeNull();
    expect(await store.exists('assets')).toBe(false);
    expect(await store.exists('index.html')).toBe(true);
  });

  it('refuses a key that resolves outside the root, even if the file exists', async () => {
    const base = await mkdtemp(path.join(tmpdir(), 'deck-root-'));
    try {
      await mkdir(path.join(base, 'root'));
      await writeFile(path.join(base, 'secret.html'), 'SECRET');
      await writeFile(path.join(base, 'root', 'index.html'), 'ok');
      const scoped = diskDeckStore(path.join(base, 'root'));
      expect(await scoped.read('../secret.html')).toBeNull();
      expect(await scoped.exists('../secret.html')).toBe(false);
      expect(await scoped.exists('index.html')).toBe(true);
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it('reports unavailable when the entry file is missing', async () => {
    const empty = await mkdtemp(path.join(tmpdir(), 'deck-empty-'));
    try {
      expect(await deckIsAvailable(diskDeckStore(empty))).toBe(false);
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});
