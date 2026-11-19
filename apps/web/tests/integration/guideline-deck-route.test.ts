import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 029 US2 — the deck route's access matrix (contracts/deck-route.md §A/§C/§E). Runs against the
 * synthetic fixture deck only; the real INTERN deck is never in the test suite (FR-015). `@/auth` is
 * mocked like in route-protection.test.ts so no Payload/DB is pulled in.
 */
const authMock = vi.fn();
vi.mock('@/auth', () => ({ auth: () => authMock() }));

const { GET } = await import('@/app/(app)/retningslinje/deck/[...path]/route');

const FIXTURE = fileURLToPath(new URL('../fixtures/deck/', import.meta.url));
const MARKER = 'FIXTURE-DECK-MARKER-7f3a';
const SESSION = { user: { id: '1', email: 'ada.employee@digdir.no' } };

function call(...segments: string[]) {
  return GET(new Request(`http://localhost/retningslinje/deck/${segments.join('/')}`), {
    params: Promise.resolve({ path: segments }),
  });
}

beforeEach(() => {
  authMock.mockReset();
  vi.stubEnv('MEDIA_STORAGE_MODE', 'disk');
  vi.stubEnv('GUIDELINE_DECK_DIR', FIXTURE);
  vi.stubEnv('GUIDELINE_DECK_ENABLED', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('feature switch off (default)', () => {
  it.each([
    ['without a session', null],
    ['with a session', SESSION],
  ])('answers 404 %s and never looks the session up first', async (_label, session) => {
    vi.stubEnv('GUIDELINE_DECK_ENABLED', '');
    authMock.mockResolvedValue(session);
    const res = await call('index.html');
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain(MARKER);
    expect(authMock).not.toHaveBeenCalled();
  });
});

describe('no session → sign-in, no deck content', () => {
  it.each([['index.html'], ['assets', 'deck.js'], ['assets', 'fonts', 'test.woff2']])(
    '%s redirects to /signin with an empty body',
    async (...segments) => {
      authMock.mockResolvedValue(null);
      const res = await call(...segments);
      expect(res.status).toBe(303);
      expect(res.headers.get('Location')).toBe('/signin');
      expect(await res.text()).toBe('');
    },
  );

  it('treats a session without a user as no session', async () => {
    authMock.mockResolvedValue({});
    expect((await call('index.html')).status).toBe(303);
  });
});

describe('employee session → the whitelisted deck files', () => {
  beforeEach(() => authMock.mockResolvedValue(SESSION));

  it('serves the entry HTML with private caching and noindex', async () => {
    const res = await call('index.html');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    // The deck CSP is a config-level header (security-headers.mjs), pinned in security-headers.test.ts.
    expect(await res.text()).toContain(MARKER);
  });

  it('serves assets with the right type and the same cache rules', async () => {
    const css = await call('assets', 'deck.css');
    expect(css.status).toBe(200);
    expect(css.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(css.headers.get('Cache-Control')).toBe('private, no-store');
    expect(css.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');

    const js = await call('assets', 'deck.js');
    expect(js.headers.get('Content-Type')).toBe('text/javascript; charset=utf-8');

    const font = await call('assets', 'fonts', 'test.woff2');
    expect(font.status).toBe(200);
    expect(font.headers.get('Content-Type')).toBe('font/woff2');
    expect((await font.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });
});

describe('employee session → everything else is a plain 404', () => {
  beforeEach(() => authMock.mockResolvedValue(SESSION));

  it.each([
    ['README (not whitelisted)', ['README.md']],
    ['parent segments', ['..', '..', 'package.json']],
    ['encoded parent segments left literal', ['%2e%2e', '%2e%2e', 'package.json']],
    ['encoded slash left literal', ['..%2f..%2fpackage.json']],
    ['dotfile', ['.env']],
    ['a bare folder', ['assets']],
    ['an unknown extension', ['assets', 'deck.exe']],
    ['too many segments', ['a', 'b', 'c', 'd', 'e.js']],
    ['a file that does not exist', ['assets', 'missing.js']],
  ])('%s', async (_label, segments) => {
    const res = await call(...segments);
    expect(res.status).toBe(404);
    const body = await res.text();
    expect(body).toBe('Not found');
    expect(body).not.toContain(MARKER);
  });
});

describe('store errors', () => {
  it('answers 500 without leaking details when the store is misconfigured', async () => {
    authMock.mockResolvedValue(SESSION);
    vi.stubEnv('MEDIA_STORAGE_MODE', 'azure');
    vi.stubEnv('GUIDELINE_DECK_CONTAINER', '');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call('index.html');
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(await res.text()).toBe('Internal error');
  });
});
