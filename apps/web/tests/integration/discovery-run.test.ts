import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * T011 — one `runDiscovery` records exactly one `discovery-runs` doc, applies the reconcile, and
 * updates the source snapshot; the failure path records a failure and leaves `artifacts` intact
 * (FR-009, FR-010, SC-006). A fake `RepoReader` keeps the test hermetic (no real GitHub).
 */
let payload: Payload;
let sourceId: number;

function manifest(id: string, slug: string, version = '1.0.0') {
  return `id: ${id}
type: skill
name: ${slug}
version: ${version}
description: Test artifact ${slug}.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/${slug}
install:
  apm:
    package: digdir/${slug}
visibility: internal
lifecycle:
  status: experimental
`;
}

/** In-memory reader over a { slug: manifestText } map, emulating skills/<slug>/artifact.yaml. */
function fakeReader(artifacts: Record<string, string>): RepoReader {
  return {
    async listArtifactDirs() {
      return Object.keys(artifacts).map((slug) => `skills/${slug}`);
    },
    async readFile(relPath) {
      const slug = /^skills\/([^/]+)\/artifact\.yaml$/.exec(relPath)?.[1];
      if (slug && artifacts[slug]) return artifacts[slug];
      if (relPath.endsWith('README.md')) return `# ${relPath}`;
      return undefined;
    },
  };
}

async function wipeDiscovery() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts(payload);
  await wipeDiscovery();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'itest-source',
      repo: 'digdir/ai-artifacts',
      ref: 'main',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
}, 120000);

afterAll(async () => {
  if (payload) {
    await wipeArtifacts(payload);
    await wipeDiscovery();
  }
});

describe('runDiscovery against live Payload (T011)', () => {
  it('records one success run, reconciles, and updates the source snapshot', async () => {
    const createReader = () =>
      fakeReader({ 'run-a': manifest('digdir.run-a', 'run-a'), 'run-b': manifest('digdir.run-b', 'run-b') });

    const result = await runDiscovery(payload, sourceId, 'manual', { createReader });
    expect(result.outcome).toBe('success');
    expect(result.report?.created.sort()).toEqual(['digdir.run-a', 'digdir.run-b']);

    const runs = await payload.find({
      collection: 'discovery-runs',
      where: { source: { equals: sourceId } },
      overrideAccess: true,
    });
    expect(runs.totalDocs).toBe(1);
    const run = runs.docs[0]!;
    expect(run.trigger).toBe('manual');
    expect(run.outcome).toBe('success');
    expect(run.summary?.created).toBe(2);
    expect((run.createdIds ?? []).sort()).toEqual(['digdir.run-a', 'digdir.run-b']);
    // 015: ownership accounting is recorded on every run (zero here — fresh creates).
    expect(run.summary?.adopted).toBe(0);
    expect(run.summary?.reassigned).toBe(0);
    expect(run.adoptedIds ?? []).toEqual([]);
    expect(run.reassignedIds ?? []).toEqual([]);

    const source = await payload.findByID({ collection: 'discovery-sources', id: sourceId, overrideAccess: true });
    expect(source.lastRunOutcome).toBe('success');
    expect(source.lastRunSummary?.created).toBe(2);
    expect(source.runningSince ?? null).toBeNull();
  });

  it('records a failure run and does NOT deactivate existing artifacts when the source is unreachable', async () => {
    const before = await payload.find({
      collection: 'artifacts',
      where: { active: { equals: true } },
      overrideAccess: true,
    });
    const activeBefore = before.totalDocs;
    expect(activeBefore).toBeGreaterThan(0);

    const createReader = (): RepoReader => ({
      async listArtifactDirs() {
        throw new Error('source unreachable');
      },
      async readFile() {
        return undefined;
      },
    });

    const result = await runDiscovery(payload, sourceId, 'scheduled', { createReader });
    expect(result.outcome).toBe('failure');
    expect(result.failureReason).toContain('unreachable');

    const failed = await payload.find({
      collection: 'discovery-runs',
      where: { and: [{ source: { equals: sourceId } }, { outcome: { equals: 'failure' } }] },
      overrideAccess: true,
    });
    expect(failed.totalDocs).toBe(1);

    const after = await payload.find({
      collection: 'artifacts',
      where: { active: { equals: true } },
      overrideAccess: true,
    });
    expect(after.totalDocs).toBe(activeBefore); // nothing deactivated by the failure
  });
});
