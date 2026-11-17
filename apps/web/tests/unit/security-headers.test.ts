import { describe, expect, it } from 'vitest';

import { SECURITY_HEADERS } from '../../security-headers.mjs';

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
