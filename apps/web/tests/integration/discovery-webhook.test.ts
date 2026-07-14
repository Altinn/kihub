import { createHmac } from 'node:crypto';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/discovery/webhook/[sourceId]/route';

/**
 * T014 — the webhook's security-critical path (FR-002, SC-002): a request is only acted on when
 * its `X-Hub-Signature-256` HMAC verifies against the source selected from the trusted URL path.
 * The handler is invoked directly (no server needed). The source's `tokenEnvVar` is intentionally
 * unset, so a `push` records a run quickly without any network call.
 */
let payload: Payload;
let sourceId: number;
const SECRET = 'whsec_itest_0001';

function sign(body: string): string {
  return `sha256=${createHmac('sha256', SECRET).update(body, 'utf8').digest('hex')}`;
}

function req(id: string | number, body: string, headers: Record<string, string>): Request {
  return new Request(`http://localhost/api/discovery/webhook/${id}`, { method: 'POST', headers, body });
}
const params = (id: string | number) => ({ params: Promise.resolve({ sourceId: String(id) }) });

async function runsForSource(): Promise<number> {
  const r = await payload.find({
    collection: 'discovery-runs',
    where: { source: { equals: sourceId } },
    overrideAccess: true,
  });
  return r.totalDocs;
}

async function wipe() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipe();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'webhook-source',
      repo: 'digdir/ai-artifacts',
      tokenEnvVar: 'WEBHOOK_ITEST_NO_TOKEN', // intentionally unset → run fails fast, no network
      webhookSecret: SECRET,
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
}, 120000);

afterAll(async () => {
  if (payload) await wipe();
});

describe('discovery webhook (T014)', () => {
  const pushBody = JSON.stringify({ ref: 'refs/heads/main', repository: { full_name: 'digdir/ai-artifacts' } });

  it('rejects a request with a missing signature (401) and runs no discovery', async () => {
    const before = await runsForSource();
    const res = await POST(req(sourceId, pushBody, { 'x-github-event': 'push' }), params(sourceId));
    expect(res.status).toBe(401);
    expect(await runsForSource()).toBe(before);
  });

  it('rejects a request with an invalid signature (401) and runs no discovery', async () => {
    const before = await runsForSource();
    const res = await POST(
      req(sourceId, pushBody, { 'x-github-event': 'push', 'x-hub-signature-256': 'sha256=deadbeef' }),
      params(sourceId),
    );
    expect(res.status).toBe(401);
    expect(await runsForSource()).toBe(before);
  });

  it('acknowledges a valid ping without running discovery (204)', async () => {
    const before = await runsForSource();
    const body = JSON.stringify({ zen: 'Design for failure.' });
    const res = await POST(
      req(sourceId, body, { 'x-github-event': 'ping', 'x-hub-signature-256': sign(body) }),
      params(sourceId),
    );
    expect(res.status).toBe(204);
    expect(await runsForSource()).toBe(before);
  });

  it('accepts a validly-signed push (202) and records a webhook run', async () => {
    const before = await runsForSource();
    const res = await POST(
      req(sourceId, pushBody, { 'x-github-event': 'push', 'x-hub-signature-256': sign(pushBody) }),
      params(sourceId),
    );
    expect(res.status).toBe(202);
    expect(await runsForSource()).toBe(before + 1);

    const latest = await payload.find({
      collection: 'discovery-runs',
      where: { source: { equals: sourceId } },
      sort: '-startedAt',
      limit: 1,
      overrideAccess: true,
    });
    expect(latest.docs[0]!.trigger).toBe('webhook');
  });

  it('returns 404 for an unknown source id and runs nothing', async () => {
    const res = await POST(req(999999, pushBody, { 'x-github-event': 'push', 'x-hub-signature-256': sign(pushBody) }), params(999999));
    expect(res.status).toBe(404);
  });
});
