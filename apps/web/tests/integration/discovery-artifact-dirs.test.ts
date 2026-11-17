import config from '@payload-config';
import {
  buildLayout,
  matchArtifactDirs,
  resolveDiscoveryConfig,
  type RepoReader,
} from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * 028 US1 — a repository that keeps skills in its own folder (`agents/_skills/<slug>/`) is
 * discovered through `kihub.yaml` `artifactDirs`, and each successful run records the resolved
 * mapping next to the roots (FR-015). Hermetic: an in-memory reader, no real GitHub.
 */
let payload: Payload;
let sourceId: number;

const manifest = (slug: string, sourcePath: string) => `id: digdir.${slug}
type: skill
name: ${slug}
version: 1.0.0
description: Test artifact ${slug}.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: ${sourcePath}
visibility: internal
lifecycle:
  status: experimental
`;

/** A reader over a { path: content } map that enumerates through the shared layout rules. */
function readerFor(files: Record<string, string>): RepoReader {
  return {
    async listArtifactDirs(layout) {
      const resolved = layout ?? buildLayout({ artifactRoots: ['.'] });
      return matchArtifactDirs(resolved, Object.keys(files));
    },
    async readFile(relPath) {
      return files[relPath];
    },
  };
}

async function wipeDiscovery() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

const DIRS_CONFIG = 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill:\n      - agents/_skills\n';

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts(payload);
  await wipeDiscovery();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'itest-028-source',
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

describe('artifactDirs discovery run (028 US1)', () => {
  it('registers skills from a custom folder and records the resolved mapping on the run', async () => {
    const files = {
      'kihub.yaml': DIRS_CONFIG,
      'agents/_skills/alpha/artifact.yaml': manifest('alpha', 'agents/_skills/alpha'),
      'agents/_skills/alpha/SKILL.md': '# alpha',
      'agents/_skills/beta/artifact.yaml': manifest('beta', 'agents/_skills/beta'),
      'agents/_skills/gamma/SKILL.md': '# no manifest, ignored',
      'skills/unlisted/artifact.yaml': manifest('unlisted', 'skills/unlisted'),
    };
    const result = await runDiscovery(payload, sourceId, 'manual', { createReader: () => readerFor(files) });

    expect(result.outcome).toBe('success');
    expect(result.report?.created.sort()).toEqual(['digdir.alpha', 'digdir.beta']);

    const artifacts = await payload.find({ collection: 'artifacts', overrideAccess: true, limit: 10 });
    expect(artifacts.docs.map((a) => a.source?.path).sort()).toEqual([
      'agents/_skills/alpha',
      'agents/_skills/beta',
    ]);

    const run = (
      await payload.find({
        collection: 'discovery-runs',
        where: { source: { equals: sourceId } },
        sort: '-createdAt',
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]!;
    expect(run.outcome).toBe('success');
    expect(run.configPath).toBe('kihub.yaml');
    expect(run.configDigest).toBe(resolveDiscoveryConfig(DIRS_CONFIG).configDigest);
    expect(run.artifactRoots ?? []).toEqual([]);
    expect(run.artifactDirs).toEqual({ skill: ['agents/_skills'] });
  });

  it('records no artifactDirs for a roots-only run, exactly as before', async () => {
    const files = {
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactRoots: [src]\n',
      'src/skills/rooted/artifact.yaml': manifest('rooted', 'src/skills/rooted'),
    };
    const result = await runDiscovery(payload, sourceId, 'manual', { createReader: () => readerFor(files) });
    // the previous source-scoped run's artifacts are not in this scan; the guard does not apply
    // because this scan still yields one valid artifact
    expect(result.outcome).toBe('success');

    const run = (
      await payload.find({
        collection: 'discovery-runs',
        where: { source: { equals: sourceId } },
        sort: '-createdAt',
        limit: 1,
        overrideAccess: true,
      })
    ).docs[0]!;
    expect(run.artifactRoots).toEqual(['src']);
    expect(run.artifactDirs ?? null).toBeNull();
  });
});
