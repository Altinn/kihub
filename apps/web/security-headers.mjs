/**
 * HTTP security headers sent on every response (NSM «HØY» review, Nov 2026).
 *
 * The CSP is deliberately limited to directives that cannot break the app: Next.js and the
 * Payload admin rely on inline scripts, so `script-src`/`style-src` are NOT restricted.
 * `form-action` is left out too: Chrome applies it to the redirect after a form POST, which
 * would block the Auth.js sign-in hop to login.microsoftonline.com. Framing is limited to our
 * own origin (`'self'`, not `'none'`) so Payload's admin can still frame the site.
 */
export const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
  },
];

/**
 * 029 — extra header for the INTERN guideline deck (`/retningslinje/deck/*`), sent INSTEAD of the global
 * CSP above (Next's config headers override a header the route handler sets, and a later `headers()`
 * entry overrides an earlier one with the same key — so this lives here, not in the route).
 *
 * It makes «the deck contacts no external host» (FR-010) browser-enforced: scripts and styles allow
 * `'unsafe-inline'` because the bundle ships one tiny inline script (its README) and a hash would break
 * on every new export; everything else is same-origin only, `connect-src` is closed, and the deck cannot
 * be framed by another site. The global directives (`frame-ancestors 'self'`, `base-uri`) are kept.
 */
export const DECK_CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'none'",
  "frame-ancestors 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export const DECK_SECURITY_HEADERS = [{ key: 'Content-Security-Policy', value: DECK_CSP }];
