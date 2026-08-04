import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { scan } from '../src/scan';

let root: string;

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

function writeArtifact(rel: string, manifest: string, readme?: string) {
  const dir = path.join(root, rel);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'artifact.yaml'), manifest);
  if (readme !== undefined) writeFileSync(path.join(dir, 'README.md'), readme);
}

beforeAll(() => {
  root = mkdtempSync(path.join(tmpdir(), 'kihub-scan-'));
  writeArtifact('skills/security-review', VALID, '# Security Review');
  writeArtifact('prompts/bad', 'id: NotReverseDNS\ntype: banana\n'); // invalid, no README
  mkdirSync(path.join(root, 'skills/not-an-artifact'), { recursive: true }); // no artifact.yaml
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('scan', () => {
  it('finds valid artifacts with manifest + README', () => {
    const results = scan(root);
    const ok = results.find((r) => r.path === 'skills/security-review');
    expect(ok?.valid).toBe(true);
    expect(ok?.manifest?.id).toBe('digdir.security-review');
    expect(ok?.readme).toBe('# Security Review');
  });

  it('marks an invalid manifest as invalid with errors (not thrown), README optional', () => {
    const bad = scan(root).find((r) => r.path === 'prompts/bad');
    expect(bad?.valid).toBe(false);
    expect(bad?.errors?.length).toBeGreaterThan(0);
    expect(bad?.readme).toBeUndefined();
  });

  it('ignores folders without an artifact.yaml', () => {
    expect(scan(root).some((r) => r.path === 'skills/not-an-artifact')).toBe(false);
  });
});
