import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';

/**
 * T013 — the Phase 3 re-index-preservation guarantee holds for the automated path: an artifact's
 * `catalog-entries` governance doc survives byte-for-byte across an automated `runDiscovery`
 * re-scan (FR-004, SC-003). `runDiscovery` reuses the unchanged `reconcile`, which only writes
 * `artifacts` — this asserts that end-to-end via the automated trigger, not just scan+reconcile.
 */
let payload: Payload;
let sourceId: number;
const slug = 'auto-preserve-0001';
const artifactId = `digdir.${slug}`;

function manifest(version = '1.0.0') {
  return `id: ${artifactId}
type: skill
name: ${slug}
version: ${version}
description: Automated-preservation test.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/${slug}
visibility: internal
lifecycle:
  status: experimental
`;
}

function reader(version: string): RepoReader {
  return {
    async listArtifactDirs() {
      return [`skills/${slug}`];
    },
    async readFile(relPath) {
      return relPath.endsWith('artifact.yaml') ? manifest(version) : undefined;
    },
  };
}

async function wipe() {
  const artifacts = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    overrideAccess: true,
  });
  const docId = artifacts.docs[0]?.id;
  if (docId) {
    await payload.delete({
      collection: 'catalog-entries',
      where: { artifact: { equals: docId } },
      overrideAccess: true,
    });
  }
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'artifacts', where: { artifactId: { equals: artifactId } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { name: { equals: 'preserve-source' } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipe();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'preserve-source',
      repo: 'digdir/ai-artifacts',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
  await runDiscovery(payload, sourceId, 'manual', { createReader: () => reader('1.0.0') });
}, 120000);

afterAll(async () => {
  if (payload) await wipe();
});

describe('automated discovery preserves governance (T013)', () => {
  it('leaves the catalog-entries governance doc unchanged after an automated re-scan', async () => {
    const artifact = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: artifactId } },
      limit: 1,
      overrideAccess: true,
    });
    const artifactDocId = artifact.docs[0]!.id;

    const entry = await payload.create({
      collection: 'catalog-entries',
      data: {
        artifact: artifactDocId,
        lifecycleState: 'in-review',
        businessOwner: 'AI Enablement',
        riskLevel: 'medium',
        internalNotes: 'Survives automated discovery.',
      },
      overrideAccess: true,
    });

    // Automated re-scan with a manifest change (version bump): artifacts update, governance must not.
    const result = await runDiscovery(payload, sourceId, 'webhook', { createReader: () => reader('2.0.0') });
    expect(result.outcome).toBe('success');
    expect(result.report?.updated).toContain(artifactId);

    const after = await payload.findByID({ collection: 'catalog-entries', id: entry.id, overrideAccess: true });
    expect(after.lifecycleState).toBe('in-review');
    expect(after.businessOwner).toBe('AI Enablement');
    expect(after.riskLevel).toBe('medium');
    expect(after.internalNotes).toBe('Survives automated discovery.');
    expect(after.updatedAt).toBe(entry.updatedAt);
  });
});
