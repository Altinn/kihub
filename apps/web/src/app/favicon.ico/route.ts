/**
 * 027 US3 — browsers request `/favicon.ico` on every visit. KI Hub has no favicon, and without this
 * static route the request would fall through to the CMS-page catch-all `(app)/[slug]`, running the
 * signed-in layout (session lookup, Site Chrome reads) only to 404. Answer it directly, cacheably.
 */
export function GET() {
  return new Response(null, {
    status: 404,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
