import { auth } from '@/auth';
import { getDeckStore, isGuidelineDeckEnabled, resolveDeckPath } from '@/lib/guideline-deck';

/**
 * 029 US2 — serves the INTERN guideline deck to signed-in employees only (contracts/deck-route.md).
 *
 * Route handlers do not run through the `(app)` layout, so the session check lives here. Order matters:
 * the release switch first (so a disabled feature reveals nothing, to anyone), then the session, then
 * the path rules, then the store. Everything the caller is not entitled to — an unknown file, a path
 * that tries to leave the deck, a non-whitelisted type — is the same plain «Not found».
 *
 * The files are streamed from a private store and never cached (`private, no-store`): the deck is
 * INTERN and must not be reusable from a shared or persistent cache after the session ends (FR-009).
 *
 * The deck's Content-Security-Policy (no external hosts, FR-010) is NOT set here: config-level headers
 * override a header set by a route handler, so it lives in `security-headers.mjs` / `next.config.mjs`.
 */

const NOT_FOUND = () => new Response('Not found', { status: 404 });

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (!isGuidelineDeckEnabled()) return NOT_FOUND();

  const session = await auth();
  if (!session?.user) {
    return new Response(null, { status: 303, headers: { Location: '/signin' } });
  }

  const { path: segments } = await params;
  const resolved = resolveDeckPath(segments);
  if (!resolved.ok) return NOT_FOUND();

  try {
    const file = await getDeckStore().read(resolved.key);
    if (!file) return NOT_FOUND();

    const headers = new Headers({
      'Content-Type': resolved.contentType,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    if (file.size !== undefined) headers.set('Content-Length', String(file.size));

    return new Response(file.body, { status: 200, headers });
  } catch (error) {
    // Log what was asked for, never the deck's content; the caller learns nothing about the store.
    console.error('guideline deck: store error for', resolved.key, error);
    return new Response('Internal error', { status: 500 });
  }
}
