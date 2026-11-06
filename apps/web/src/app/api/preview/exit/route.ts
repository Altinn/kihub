import { draftMode } from 'next/headers';
import { isSafeInternalPath } from '@/lib/preview-paths';

/**
 * 027 — «Avslutt forhåndsvisning» (contracts/preview-route.md §C). Turns draft mode off and returns
 * the editor to the page they were on when that page is on this origin, else to the frontpage.
 */
export function exitTarget(requestUrl: string, referer: string | null): string {
  if (!referer) return '/';
  try {
    const own = new URL(requestUrl);
    const from = new URL(referer);
    if (from.origin !== own.origin) return '/';
    const path = `${from.pathname}${from.search}`;
    return isSafeInternalPath(path) ? path : '/';
  } catch {
    return '/';
  }
}

export async function GET(request: Request) {
  (await draftMode()).disable();
  return new Response(null, {
    status: 303,
    headers: { Location: exitTarget(request.url, request.headers.get('referer')) },
  });
}
