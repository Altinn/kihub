import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * 015 US1 — source-scoped reconciliation end-to-end against live Payload (acceptance scenarios
 * US1-1..5 + the source-deletion edge case; SC-001/002/003). Two fake-reader sources with
 * disjoint artifacts prove a scan never touches the other source's rows; ownership follows the
 * most recent sighting (adoption/reassignment) with governance rows intact.
 */
let payload: Payload;
let srcA: number;
let srcB: number;

function manifest(id: string, slug: string, version = '1.0.0') {
  return `id: ${id}
type: skill
name: ${slug}
version: ${version}
description: Multi-source test artifact ${slug}.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/multi-source-test
  path: skills/${slug}
visibility: internal
lifecycle:
  status: experimental
`;
}

/** In-memory reader over a { slug: manifestText } map (skills/<slug>/artifact.yaml). */
function fakeReader(artifacts: Record<string, string>): RepoReader {
  return {
    async listArtifactDirs() {
      return Object.keys(artifacts).map((slug) => `skills/${slug}`);
    },
    async readFile(relPath) {
      const slug = /^skills\/([^/]+)\/artifact\.yaml$/.exec(relPath)?.[1];
      if (slug && artifacts[slug]) return artifacts[slug];
      return undefined;
    },
  };
}

const scanWith = (sourceId: number, artifacts: Record<string, string>) =>
  runDiscovery(payload, sourceId, 'manual', { createReader: () => fakeReader(artifacts) });

/** Artifact row at depth 0 so `discoverySource` is a scalar id (or null). */
async function artifactRow(artifactId: string) {
  const res = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  return res.docs[0];
}

async function wipeDiscovery() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts(payload);
  await wipeDiscovery();
  const a = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'msrc-a',
      repo: 'digdir/msrc-a',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  const b = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'msrc-b',
      repo: 'digdir/msrc-b',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  srcA = a.id;
  srcB = b.id;
}, 120000);

afterAll(async () => {
  if (payload) {
    await wipeArtifacts(payload);
    await wipeDiscovery();
  }
});

const A1 = 'digdir.ms-a-one';
const A2 = 'digdir.ms-a-two';
const B1 = 'digdir.ms-b-one';
const LEGACY = 'digdir.ms-legacy';
const MOVER = 'digdir.ms-mover';
const DUPE = 'digdir.ms-dupe';

const readerA = {
  'ms-a-one': manifest(A1, 'ms-a-one'),
  'ms-a-two': manifest(A2, 'ms-a-two'),
};
const readerB = { 'ms-b-one': manifest(B1, 'ms-b-one') };

describe('multi-source discovery is source-scoped (015 US1)', () => {
  it('scans of disjoint sources never touch each other (US1-1, SC-001)', async () => {
    const first = await scanWith(srcA, readerA);
    expect(first.outcome).toBe('success');
    expect(first.report?.created.sort()).toEqual([A1, A2]);

    const second = await scanWith(srcB, readerB);
    expect(second.outcome).toBe('success');
    expect(second.report?.created).toEqual([B1]);
    expect(second.report?.deactivated).toEqual([]); // A's artifacts are not B's to deactivate

    // Re-scan A in the other order too — still zero cross-damage.
    const third = await scanWith(srcA, readerA);
    expect(third.report?.deactivated).toEqual([]);
    expect(third.report?.updated.sort()).toEqual([A1, A2]);

    for (const id of [A1, A2, B1]) {
      expect((await artifactRow(id))?.active).toBe(true);
    }
    expect((await artifactRow(A1))?.discoverySource).toBe(srcA);
    expect((await artifactRow(B1))?.discoverySource).toBe(srcB);
  });

  it('removing one artifact deactivates exactly it, on its own source’s next scan (US1-2, SC-002)', async () => {
    const result = await scanWith(srcA, { 'ms-a-one': readerA['ms-a-one'] }); // a2 removed
    expect(result.report?.deactivated).toEqual([A2]);
    expect((await artifactRow(A2))?.active).toBe(false);
    expect((await artifactRow(A1))?.active).toBe(true);
    expect((await artifactRow(B1))?.active).toBe(true); // untouched (US1-1)
  });

  it('adopts a legacy row with no recorded origin instead of ever deactivating it (US1-3, SC-003)', async () => {
    // A pre-015 artifact: exists, active, no discoverySource.
    await payload.create({
      collection: 'artifacts',
      data: {
        artifactId: LEGACY,
        type: 'skill',
        name: 'ms-legacy',
        description: 'Legacy row without origin.',
        version: '1.0.0',
        visibility: 'internal',
        lifecycleStatus: 'experimental',
        active: true,
      },
      overrideAccess: true,
    });

    // A scan that does NOT contain the legacy id must not deactivate it.
    const unrelated = await scanWith(srcB, readerB);
    expect(unrelated.report?.deactivated).toEqual([]);
    expect((await artifactRow(LEGACY))?.active).toBe(true);
    expect((await artifactRow(LEGACY))?.discoverySource ?? null).toBeNull();

    // The first scan that finds the id adopts it.
    const adopting = await scanWith(srcB, {
      ...readerB,
      'ms-legacy': manifest(LEGACY, 'ms-legacy'),
    });
    expect(adopting.report?.adopted).toEqual([LEGACY]);
    expect((await artifactRow(LEGACY))?.discoverySource).toBe(srcB);
  });

  it('an artifact moves between repos with its governance intact (US1-4)', async () => {
    // MOVER starts in A…
    await scanWith(srcA, { ...readerA, 'ms-mover': manifest(MOVER, 'ms-mover') });
    const moverDoc = await artifactRow(MOVER);
    expect(moverDoc?.discoverySource).toBe(srcA);

    const entry = await payload.create({
      collection: 'catalog-entries',
      data: {
        artifact: moverDoc!.id,
        lifecycleState: 'in-review',
        businessOwner: 'AI Enablement',
        internalNotes: 'Survives the repo move.',
      },
      overrideAccess: true,
    });

    // …then appears in B (moved). B's scan takes ownership…
    const bScan = await scanWith(srcB, {
      ...readerB,
      'ms-legacy': manifest(LEGACY, 'ms-legacy'),
      'ms-mover': manifest(MOVER, 'ms-mover', '2.0.0'),
    });
    expect(bScan.report?.reassigned).toEqual([MOVER]);
    expect((await artifactRow(MOVER))?.discoverySource).toBe(srcB);

    // …and A's next scan (without it) no longer touches it.
    const aScan = await scanWith(srcA, readerA);
    expect(aScan.report?.deactivated).toEqual([]);
    expect((await artifactRow(MOVER))?.active).toBe(true);

    const after = await payload.findByID({ collection: 'catalog-entries', id: entry.id, overrideAccess: true });
    expect(after.lifecycleState).toBe('in-review');
    expect(after.internalNotes).toBe('Survives the repo move.');
    expect(after.updatedAt).toBe(entry.updatedAt);
  });

  it('an id present in two sources at once flip-flops ownership (flagged) but is never deactivated (US1-5)', async () => {
    const withDupeA = { ...readerA, 'ms-dupe': manifest(DUPE, 'ms-dupe') };
    const withDupeB = {
      ...readerB,
      'ms-legacy': manifest(LEGACY, 'ms-legacy'),
      'ms-mover': manifest(MOVER, 'ms-mover', '2.0.0'),
      'ms-dupe': manifest(DUPE, 'ms-dupe'),
    };

    const first = await scanWith(srcA, withDupeA);
    expect(first.report?.created).toContain(DUPE);

    const second = await scanWith(srcB, withDupeB);
    expect(second.report?.reassigned).toEqual([DUPE]); // flagged on B's run
    expect(second.report?.deactivated).toEqual([]);

    const third = await scanWith(srcA, withDupeA);
    expect(third.report?.reassigned).toEqual([DUPE]); // flagged again on A's run
    expect(third.report?.deactivated).toEqual([]);
    expect((await artifactRow(DUPE))?.active).toBe(true);
  });

  it('deleting a source leaves its artifacts active and unowned, adoptable later (edge case)', async () => {
    await payload.delete({ collection: 'discovery-runs', where: { source: { equals: srcB } }, overrideAccess: true });
    await payload.delete({ collection: 'discovery-sources', id: srcB, overrideAccess: true });

    const b1 = await artifactRow(B1);
    expect(b1?.active).toBe(true);
    expect(b1?.discoverySource ?? null).toBeNull(); // FK ON DELETE SET NULL

    // A later scan of another source containing the id adopts it.
    const adopting = await scanWith(srcA, { ...readerA, 'ms-b-one': manifest(B1, 'ms-b-one') });
    expect(adopting.report?.adopted).toContain(B1);
    expect((await artifactRow(B1))?.discoverySource).toBe(srcA);
  });
});
