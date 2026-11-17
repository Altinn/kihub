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
