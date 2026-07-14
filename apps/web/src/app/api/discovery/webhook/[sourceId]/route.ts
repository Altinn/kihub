import { createHmac, timingSafeEqual } from 'node:crypto';
import config from '@payload-config';
import { getPayload } from 'payload';
import { runDiscovery } from '@/lib/discovery';

/**
 * Per-source GitHub webhook (contracts/discovery-routes.md). The source — and therefore the HMAC
 * secret — is selected from the trusted `[sourceId]` path segment, never from the untrusted request
 * body, so we never parse an unverified payload to decide which secret to trust. Only after the
 * `X-Hub-Signature-256` HMAC verifies do we look at the body (for event routing).
 */
export function verifyGithubSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')}`;
  const provided = Buffer.from(signature);
  const computed = Buffer.from(expected);
  // timingSafeEqual requires equal lengths; unequal length is already a definite mismatch.
  if (provided.length !== computed.length) return false;
  return timingSafeEqual(provided, computed);
}

export async function POST(request: Request, { params }: { params: Promise<{ sourceId: string }> }) {
  const { sourceId } = await params;
  const payload = await getPayload({ config });

  let source;
  try {
    source = await payload.findByID({ collection: 'discovery-sources', id: sourceId, overrideAccess: true });
  } catch {
    return new Response('Unknown source', { status: 404 });
  }
  if (!source || source.enabled === false) {
    return new Response('Unknown or disabled source', { status: 404 });
  }

  // Read the RAW body — required for a correct signature (a re-serialized JSON would differ).
  const raw = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  if (!verifyGithubSignature(raw, signature, source.webhookSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = request.headers.get('x-github-event');
  if (event === 'ping') return new Response(null, { status: 204 });
  if (event !== 'push') return new Response(null, { status: 204 });

  // Full re-scan per Clarifications. Awaited so the run is recorded before we ack (the catalog is
  // small); GitHub needs only the acknowledgement.
  await runDiscovery(payload, source.id, 'webhook');
  return new Response('Accepted', { status: 202 });
}
