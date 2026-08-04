import config from '@payload-config';
import { reconcile, scan } from '@kihub/discovery-core';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * T017 — re-indexing (Phase 2) must never touch governance state (FR-010, SC-003). The indexer
 * (`@kihub/discovery-core`) only ever writes to the `artifacts` collection; this test proves a
 * `catalog-entries` doc survives byte-for-byte across a re-index run of its artifact.
 */
let payload: Payload;
let root: string;
const testSlug = 'reindex-preserves-0001';
const artifactId = `digdir.${testSlug}`;

function manifest(version = '1.0.0') {
  return `id: ${artifactId}
type: skill
name: ${testSlug}
version: ${version}
description: Test artifact for T017.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/${testSlug}
install:
  apm:
    package: digdir/${testSlug}
visibility: internal
lifecycle:
  status: experimental
`;
}

async function cleanup() {
  const artifacts = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    limit: 1,
    overrideAccess: true,
  });
  const artifactDocId = artifacts.docs[0]?.id;
  if (artifactDocId) {
    await payload.delete({
      collection: 'catalog-entries',
      where: { artifact: { equals: artifactDocId } },
      overrideAccess: true,
    });
    await payload.delete({ collection: 'artifacts', id: artifactDocId, overrideAccess: true });
  }
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
  root = mkdtempSync(path.join(tmpdir(), 'kihub-reindex-preserves-'));
  const dir = path.join(root, 'skills', testSlug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'artifact.yaml'), manifest());
  writeFileSync(path.join(dir, 'README.md'), `# ${testSlug}`);
  await reconcile(payload, scan(root));
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('re-indexing preserves governance state (T017, FR-010, SC-003)', () => {
  it('leaves an existing catalog-entries doc byte-for-byte unchanged after a re-index run', async () => {
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
        internalNotes: 'Should survive re-indexing untouched.',
      },
      overrideAccess: true,
    });

    // Re-run the Phase 2 indexer, including a manifest edit (version bump) — technical metadata
    // updates, governance must not.
    writeFileSync(path.join(root, 'skills', testSlug, 'artifact.yaml'), manifest('2.0.0'));
    const report = await reconcile(payload, scan(root));
    expect(report.updated).toContain(artifactId);

    const after = await payload.findByID({
      collection: 'catalog-entries',
      id: entry.id,
      overrideAccess: true,
    });
    expect(after.lifecycleState).toBe('in-review');
    expect(after.businessOwner).toBe('AI Enablement');
    expect(after.riskLevel).toBe('medium');
    expect(after.internalNotes).toBe('Should survive re-indexing untouched.');
    expect(after.updatedAt).toBe(entry.updatedAt);
  });
});
