import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DECK_CSP, DECK_SECURITY_HEADERS, SECURITY_HEADERS } from '../../security-headers.mjs';

/**
 * Guards the response headers added for the NSM «HØY» review. The CSP must stay limited to
 * directives that cannot break inline scripts or the Entra sign-in redirect.
 */
describe('security headers', () => {
  const byKey = new Map(SECURITY_HEADERS.map(({ key, value }) => [key, value]));

  it('sends HSTS, nosniff, a referrer policy and same-origin framing', () => {
    expect(byKey.get('Strict-Transport-Security')).toMatch(/max-age=\d{8,}/);
    expect(byKey.get('X-Content-Type-Options')).toBe('nosniff');
    expect(byKey.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(byKey.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('keeps the CSP to non-breaking directives', () => {
    const csp = byKey.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).not.toMatch(/script-src|style-src|default-src|form-action/);
  });
});

/**
 * 029 — the INTERN guideline deck gets its own, stricter CSP so «no external hosts» (FR-010) is enforced
 * by the browser. It must come from the config (a route handler's header is overridden by config
 * headers) and from a LATER entry (a later entry wins on a key clash).
 */
describe('guideline deck CSP', () => {
  const directives = new Map(
    DECK_CSP.split('; ').map((part) => [part.split(' ')[0], part.slice(part.indexOf(' ') + 1)]),
  );

  it('allows only same-origin resources and no network from scripts', () => {
    expect(DECK_SECURITY_HEADERS).toEqual([{ key: 'Content-Security-Policy', value: DECK_CSP }]);
    expect(directives.get('default-src')).toBe("'none'");
    expect(directives.get('connect-src')).toBe("'none'");
    expect(directives.get('font-src')).toBe("'self'");
    expect(directives.get('img-src')).toBe("'self' data:");
    expect(directives.get('form-action')).toBe("'none'");
    expect(directives.get('frame-ancestors')).toBe("'self'");
    expect(DECK_CSP).not.toMatch(/https?:|\*/);
  });

  it('is applied through a later next.config entry for the deck path only', () => {
    const config = readFileSync(fileURLToPath(new URL('../../next.config.mjs', import.meta.url)), 'utf8');
    const global = config.indexOf("source: '/:path*'");
    const deck = config.indexOf("source: '/retningslinje/deck/:path*'");
    expect(global).toBeGreaterThan(-1);
    expect(deck).toBeGreaterThan(global);
    expect(config).toMatch(/headers: DECK_SECURITY_HEADERS/);
  });
});

