import { auth } from '@/auth';
import { getPublishedEventBySlug } from '@/lib/events';
import { buildEventIcs } from '@/lib/ics';

/**
 * 011 US2 — the "+ Legg til i kalender" download (contracts/event-ics.md). Route handlers are not
 * wrapped by the `(app)` layout, so the employee gate is enforced here explicitly. The
 * published-only invariant is inherited from `getPublishedEventBySlug` (draft/unknown → 404),
 * never re-implemented.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) {
    return new Response('Not found', { status: 404 });
  }

  const baseUrl = new URL(request.url).origin;
  return new Response(buildEventIcs(event, baseUrl), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug ?? 'event'}.ics"`,
    },
  });
}
