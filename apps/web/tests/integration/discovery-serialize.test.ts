import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';

/**
 * T012 — two overlapping `runDiscovery` calls for the same source must not both proceed: the
 * atomic per-source lock lets exactly one win, the other is skipped, and no duplicate catalog
 * entries result (FR-008, SC-005).
 */
let payload: Payload;
let sourceId: number;

const MANIFEST = `id: digdir.serialize-x
type: skill
name: serialize-x
version: 1.0.0
description: Serialization test artifact.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/serialize-x
visibility: internal
lifecycle:
  status: experimental
`;

const reader: RepoReader = {
  async listArtifactDirs() {
    return ['skills/serialize-x'];
  },
  async readFile(relPath) {
    return relPath.endsWith('artifact.yaml') ? MANIFEST : undefined;
  },
};

async function wipe() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'artifacts', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipe();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'serialize-source',
      repo: 'digdir/ai-artifacts',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
}, 120000);

afterAll(async () => {
  if (payload) await wipe();
});

describe('per-source run serialization (T012)', () => {
  it('runs one of two concurrent triggers and skips the other, with no duplicate entries', async () => {
    const [a, b] = await Promise.all([
      runDiscovery(payload, sourceId, 'webhook', { createReader: () => reader }),
      runDiscovery(payload, sourceId, 'webhook', { createReader: () => reader }),
    ]);

    const outcomes = [a.outcome, b.outcome].sort();
    expect(outcomes).toEqual(['skipped', 'success']);

    const runs = await payload.find({
      collection: 'discovery-runs',
      where: { source: { equals: sourceId } },
      overrideAccess: true,
    });
    expect(runs.totalDocs).toBe(1); // only the winner recorded a run

    const artifacts = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.serialize-x' } },
      overrideAccess: true,
    });
    expect(artifacts.totalDocs).toBe(1); // no duplicate catalog entry
  });
});
