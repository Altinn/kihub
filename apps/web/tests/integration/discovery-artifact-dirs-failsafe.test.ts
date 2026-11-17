import config from '@payload-config';
import {
  buildLayout,
  matchArtifactDirs,
  missingDirMessage,
  type RepoReader,
} from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery } from '@/lib/discovery';
import { wipeArtifacts } from '../helpers/wipe';

/**
 * 028 US2 — a typo or an ambiguous `kihub.yaml` can never silently drop, add or retype catalog
 * artifacts: every whole-scan fault records a FAILED run and leaves the source's active artifacts
 * (and their governance) untouched. The empty-source guard still protects a dirs-only source.
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

/** Mirrors the GitHub reader: required directories must exist in the file list. */
function readerFor(files: Record<string, string>): RepoReader {
  return {
    async listArtifactDirs(layout) {
      const resolved = layout ?? buildLayout({ artifactRoots: ['.'] });
      for (const dir of resolved.requiredDirs) {
        if (!Object.keys(files).some((p) => p.startsWith(`${dir}/`))) {
          throw new Error(missingDirMessage(dir, 'itest@main'));
        }
      }
      return matchArtifactDirs(resolved, Object.keys(files));
    },
    async readFile(relPath) {
      return files[relPath];
    },
  };
}

const DIRS_CONFIG = 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill:\n      - agents/_skills\n';
const GOOD_FILES = {
  'kihub.yaml': DIRS_CONFIG,
  'agents/_skills/keeper/artifact.yaml': manifest('keeper', 'agents/_skills/keeper'),
  'agents/_skills/keeper/SKILL.md': '# keeper',
};

async function wipeDiscovery() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
}

const activeOwned = () =>
  payload.find({
    collection: 'artifacts',
    where: { and: [{ active: { equals: true } }, { discoverySource: { equals: sourceId } }] },
    overrideAccess: true,
  });

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts(payload);
  await wipeDiscovery();
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'itest-028-failsafe',
      repo: 'digdir/ai-artifacts',
      ref: 'main',
      tokenEnvVar: 'ITEST_UNUSED_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
  const seeded = await runDiscovery(payload, sourceId, 'manual', { createReader: () => readerFor(GOOD_FILES) });
  expect(seeded.outcome).toBe('success');
}, 120000);

afterAll(async () => {
  if (payload) {
    await wipeArtifacts(payload);
    await wipeDiscovery();
  }
});

const FAULTS: [string, Record<string, string>, string][] = [
  [
    'plural type key',
    { ...GOOD_FILES, 'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skills: [agents/_skills]\n' },
    'artifactDirs: unknown type',
  ],
  [
    'directory listed that does not exist',
    { ...GOOD_FILES, 'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill: [agents/_skils]\n' },
    'Configured artifact directory does not exist',
  ],
  [
    'same directory under two types',
    {
      ...GOOD_FILES,
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill: [agents/_skills]\n    agent: [agents/_skills]\n',
    },
    'is listed for both',
  ],
  [
    'directory the root layout reads as another type',
    {
      ...GOOD_FILES,
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactRoots: [.]\n  artifactDirs:\n    agent: [skills]\n',
      'skills/x/artifact.yaml': manifest('x', 'skills/x'),
    },
    'but the root layout reads it as',
  ],
  [
    'artifact folder nested inside another',
    {
      ...GOOD_FILES,
      'kihub.yaml': 'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill: [agents/_skills, agents/_skills/keeper]\n',
      'agents/_skills/keeper/inner/artifact.yaml': manifest('inner', 'agents/_skills/keeper/inner'),
    },
    'Artifact folders overlap',
  ],
  ['discovery names neither key', { ...GOOD_FILES, 'kihub.yaml': 'schemaVersion: 1\ndiscovery: {}\n' }, 'set artifactRoots, artifactDirs or both'],
];

describe('artifactDirs fail-closed scans (028 US2)', () => {
  it.each(FAULTS)('%s: records a failed run and leaves the catalog unchanged', async (_name, files, fragment) => {
    const before = await activeOwned();
    expect(before.totalDocs).toBe(1);

    const result = await runDiscovery(payload, sourceId, 'manual', { createReader: () => readerFor(files) });
    expect(result.outcome).toBe('failure');
    expect(result.failureReason).toContain(fragment);

    const after = await activeOwned();
    expect(after.docs.map((a) => a.artifactId ?? a.id)).toEqual(before.docs.map((a) => a.artifactId ?? a.id));
    expect(after.docs[0]?.contentDigest).toBe(before.docs[0]?.contentDigest);
  });

  it('refuses a dirs-only scan that yields zero valid artifacts, then honours the one-shot override', async () => {
    const emptyFiles = { 'kihub.yaml': DIRS_CONFIG, 'agents/_skills/README.md': 'nothing registered yet\n' };
    const before = await activeOwned();
    expect(before.totalDocs).toBe(1);

    const refused = await runDiscovery(payload, sourceId, 'manual', { createReader: () => readerFor(emptyFiles) });
    expect(refused.outcome).toBe('failure');
    expect(refused.failureReason).toContain('Refusing empty scan');
    expect((await activeOwned()).totalDocs).toBe(1);

    await payload.update({
      collection: 'discovery-sources',
      id: sourceId,
      data: { allowDestructiveReconcile: true },
      overrideAccess: true,
    });
    const allowed = await runDiscovery(payload, sourceId, 'manual', { createReader: () => readerFor(emptyFiles) });
    expect(allowed.outcome).toBe('success');
    expect(allowed.report?.deactivated).toHaveLength(1);
    expect((await activeOwned()).totalDocs).toBe(0);

    const source = await payload.findByID({ collection: 'discovery-sources', id: sourceId, overrideAccess: true });
    expect(source.allowDestructiveReconcile).toBe(false);
  });
});
