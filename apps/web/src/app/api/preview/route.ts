import config from '@payload-config';
import { cookies, draftMode } from 'next/headers';
import { getPayload } from 'payload';
import { auth } from '@/auth';
import { isSafeInternalPath } from '@/lib/preview-paths';
import { resolvePreviewActive } from '@/lib/preview-access';

/**
 * 027 — «Forhåndsvis» entry point (contracts/preview-route.md §B, research R4).
 *
 * The CMS button links here with the document's future public address. Access is decided by the
 * visitor's OWN Entra session and a fresh role lookup — there is no shared secret in the link, so a
 * forwarded link grants nothing to someone without a CMS role (spec FR-013/014): they are sent to the
 * address with preview off and get the normal 404 for a draft.
 *
 * The draft-mode cookie Next sets is session-scoped; it is re-issued with a 60-minute lifetime so a
 * preview ends on its own (FR-016).
 */
const BYPASS_COOKIE = '__prerender_bypass';
const PREVIEW_MAX_AGE_SECONDS = 60 * 60;

function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get('path');
  if (!isSafeInternalPath(path)) {
    return new Response('Ugyldig adresse for forhåndsvisning.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const session = await auth();
  if (!session?.user) {
    return new Response(null, { status: 307, headers: { Location: '/signin' } });
  }

  const payload = await getPayload({ config });
  const allowed = await resolvePreviewActive(
    { draftModeEnabled: true, userId: session.user.id },
    payload,
  );
  if (!allowed) return seeOther(path);

  (await draftMode()).enable();
  const jar = await cookies();
  const bypass = jar.get(BYPASS_COOKIE);
  if (bypass) {
    jar.set(BYPASS_COOKIE, bypass.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'lax',
      path: '/',
      maxAge: PREVIEW_MAX_AGE_SECONDS,
    });
  }
  return seeOther(path);
}
