import { timingSafeEqual } from 'node:crypto';
import config from '@payload-config';
import { getPayload } from 'payload';
import { runAllEnabledSources } from '@/lib/discovery';

/** Constant-time equality for the scan key, guarding against timing side channels. */
function keyMatches(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Scheduled catch-up scan (contracts/discovery-routes.md, research §1). Invoked by an external
 * scheduler (Azure Container Apps job, default daily) with the `X-Discovery-Scan-Key` header;
 * runs discovery for every enabled source so the catalog converges even when a webhook was missed.
 * The recurring invocation itself is a deploy-time concern, not app code.
 */
export async function POST(request: Request) {
  if (!keyMatches(request.headers.get('x-discovery-scan-key'), process.env.DISCOVERY_SCAN_KEY)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await getPayload({ config });
  const results = await runAllEnabledSources(payload, 'scheduled');

  return Response.json({
    scanned: results.length,
    results: results.map((r) => ({ source: r.source, outcome: r.result.outcome, runId: r.result.runId })),
  });
}
