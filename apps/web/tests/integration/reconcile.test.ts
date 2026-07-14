import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import config from '@payload-config';
import { reconcile, scan } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * T010 — scan + reconcile against a live Payload+Postgres. Uses a temp ai-artifacts fixture and a
 * clean-slate artifacts collection (the catalog is rebuildable from Git, so wiping is safe).
 */
let payload: Payload;
let root: string;

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

function writeArtifact(slug: string, manifestText: string, readme = `# ${slug}`) {
  const dir = path.join(root, 'skills', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'artifact.yaml'), manifestText);
  writeFileSync(path.join(dir, 'README.md'), readme);
}

async function wipeArtifacts() {
  await payload.delete({ collection: 'artifacts', where: { id: { exists: true } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeArtifacts();
  root = mkdtempSync(path.join(tmpdir(), 'kihub-reconcile-'));
}, 120000);

afterAll(async () => {
  if (payload) await wipeArtifacts();
  if (root) rmSync(root, { recursive: true, force: true });
});

describe('scan + reconcile against live Payload (T010)', () => {
  it('creates one record per valid artifact, keyed by artifactId, with metadata only', async () => {
    writeArtifact('itest-a', manifest('digdir.itest-a', 'itest-a'));
    writeArtifact('itest-b', manifest('digdir.itest-b', 'itest-b'));

    const report = await reconcile(payload, scan(root));
    expect(report.created.sort()).toEqual(['digdir.itest-a', 'digdir.itest-b']);

    const a = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.itest-a' } },
      overrideAccess: true,
    });
    const doc = a.docs[0] as unknown as Record<string, unknown>;
    expect(doc.type).toBe('skill');
    expect(doc.installCommand).toBe('apm install digdir/itest-a');
    expect(doc.active).toBe(true);
    // metadata only — no artifact-body field exists on the record
    expect(doc).not.toHaveProperty('body');
    expect(doc).not.toHaveProperty('content');
  });

  it('updates in place on re-run (no duplicate) and reflects manifest changes', async () => {
    writeArtifact('itest-a', manifest('digdir.itest-a', 'itest-a', '2.0.0'));
    const report = await reconcile(payload, scan(root));
    expect(report.updated).toContain('digdir.itest-a');
    expect(report.created).not.toContain('digdir.itest-a');

    const a = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.itest-a' } },
      overrideAccess: true,
    });
    expect(a.totalDocs).toBe(1);
    expect((a.docs[0] as unknown as Record<string, unknown>).version).toBe('2.0.0');
  });

  it('soft-deactivates an artifact removed from the repo', async () => {
    rmSync(path.join(root, 'skills', 'itest-b'), { recursive: true, force: true });
    const report = await reconcile(payload, scan(root));
    expect(report.deactivated).toContain('digdir.itest-b');

    const b = await payload.find({
      collection: 'artifacts',
      where: { artifactId: { equals: 'digdir.itest-b' } },
      overrideAccess: true,
    });
    expect((b.docs[0] as unknown as Record<string, unknown>).active).toBe(false);
  });
});
