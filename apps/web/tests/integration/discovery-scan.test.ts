import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { POST } from '@/app/api/discovery/scan/route';
import { runAllEnabledSources } from '@/lib/discovery';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * T016 — the scheduled scan: the route is key-gated (FR-006, 401 on a bad key with no run), and a
 * scan converges the catalog to the source's true state (FR-007, SC-004). Route auth is tested via
 * direct handler invocation; convergence is tested via `runAllEnabledSources` with a fake reader so
 * it is hermetic (no real GitHub).
 */
let payload: Payload;
const SCAN_KEY = 'scan_itest_key_0001';

const MANIFEST = `id: digdir.scan-converge
type: skill
name: scan-converge
version: 1.0.0
description: Convergence test artifact.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/scan-converge
visibility: internal
lifecycle:
  status: experimental
`;

const convergeReader: RepoReader = {
  async listArtifactDirs() {
    return ['skills/scan-converge'];
  },
  async readFile(relPath) {
    return relPath.endsWith('artifact.yaml') ? MANIFEST : undefined;
  },
};

function scanReq(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/discovery/scan', { method: 'POST', headers });
}

async function wipe() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await wipeArtifacts(payload);
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  process.env.DISCOVERY_SCAN_KEY = SCAN_KEY;
  await wipe();
  await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'scan-source',
      repo: 'digdir/ai-artifacts',
      tokenEnvVar: 'SCAN_ITEST_NO_TOKEN', // unset → route path fails fast, no network
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'scan-source-disabled',
      repo: 'digdir/other',
      tokenEnvVar: 'SCAN_ITEST_NO_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: false,
    },
    overrideAccess: true,
  });
}, 120000);

afterAll(async () => {
  if (payload) await wipe();
});

describe('scheduled scan (T016)', () => {
  it('rejects a missing or wrong scan key (401) and runs nothing', async () => {
    expect((await POST(scanReq({}))).status).toBe(401);
    expect((await POST(scanReq({ 'x-discovery-scan-key': 'wrong' }))).status).toBe(401);
    const runs = await payload.find({ collection: 'discovery-runs', overrideAccess: true });
    expect(runs.totalDocs).toBe(0);
  });

  it('with a valid key scans only enabled sources and records a run for each', async () => {
    const res = await POST(scanReq({ 'x-discovery-scan-key': SCAN_KEY }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { scanned: number };
    expect(body.scanned).toBe(1); // the disabled source is excluded

    const runs = await payload.find({ collection: 'discovery-runs', overrideAccess: true });
    expect(runs.totalDocs).toBe(1);
    expect(runs.docs[0]!.trigger).toBe('scheduled');
  });

  it('converges the catalog to the source true state (FR-007, SC-004)', async () => {
    const missing = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.scan-converge' } },
      overrideAccess: true,
    });
    expect(missing.totalDocs).toBe(0); // drift: artifact exists in the source but not the catalog

    const results = await runAllEnabledSources(payload, 'scheduled', { createReader: () => convergeReader });
    expect(results.every((r) => r.result.outcome === 'success')).toBe(true);

    const after = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.scan-converge' } },
      overrideAccess: true,
    });
    expect(after.totalDocs).toBe(1); // converged
  });
});
