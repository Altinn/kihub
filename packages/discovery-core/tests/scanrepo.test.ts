import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalReader, type RepoReader, scan, scanRepo } from '../src/scan';

const VALID = `id: digdir.security-review
type: skill
name: Security Review
version: 1.0.0
description: Reviews security.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: skills/security-review
visibility: internal
lifecycle:
  status: experimental
`;

const INVALID = 'id: NotReverseDNS\ntype: banana\n';

let root: string;

function writeArtifact(rel: string, manifest: string, readme?: string) {
  const dir = path.join(root, rel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'artifact.yaml'), manifest);
  if (readme !== undefined) writeFileSync(path.join(dir, 'README.md'), readme);
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'kihub-scanrepo-'));
  writeArtifact('skills/security-review', VALID, '# Security Review');
  writeArtifact('prompts/bad', INVALID); // invalid, no README
  mkdirSync(path.join(root, 'skills/not-an-artifact'), { recursive: true }); // no artifact.yaml
  // 015: an agent and a type↔dir mismatch — the parity test proves scanRepo matches scan on both.
  writeArtifact('agents/support-agent', VALID.replace('type: skill', 'type: agent').replace('id: digdir.security-review', 'id: digdir.support-agent'));
  writeArtifact('skills/misplaced-agent', VALID.replace('type: skill', 'type: agent').replace('id: digdir.security-review', 'id: digdir.misplaced'));
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

/** An in-memory reader with the identical fixture set, to prove parity without touching disk. */
function fakeReader(): RepoReader {
  const files: Record<string, string> = {
    'skills/security-review/artifact.yaml': VALID,
    'skills/security-review/README.md': '# Security Review',
    'prompts/bad/artifact.yaml': INVALID,
  };
  return {
    async listArtifactDirs() {
      return ['skills/security-review', 'prompts/bad', 'skills/not-an-artifact'];
    },
    async readFile(relPath) {
      return files[relPath];
    },
  };
}

/** Sort for order-independent comparison (scan walks TYPE_DIRS; scanRepo follows reader order). */
const byPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);

describe('scanRepo', () => {
  it('over a local reader produces the same result as the synchronous scan', async () => {
    const viaScan = scan(root).sort(byPath);
    const viaRepo = (await scanRepo(createLocalReader(root))).sort(byPath);
    expect(viaRepo).toEqual(viaScan);
  });

  it('over a fake reader matches scan, including the invalid-manifest case and skipping no-manifest dirs', async () => {
    const results = (await scanRepo(fakeReader())).sort(byPath);

    const ok = results.find((r) => r.path === 'skills/security-review');
    expect(ok?.valid).toBe(true);
    expect(ok?.manifest?.id).toBe('digdir.security-review');
    expect(ok?.readme).toBe('# Security Review');

    const bad = results.find((r) => r.path === 'prompts/bad');
    expect(bad?.valid).toBe(false);
    expect(bad?.errors?.length).toBeGreaterThan(0);
    expect(bad?.readme).toBeUndefined();

    // A dir the reader lists but which has no artifact.yaml is skipped, not errored.
    expect(results.some((r) => r.path === 'skills/not-an-artifact')).toBe(false);
  });
});
