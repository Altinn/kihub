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

const VALID_AGENT = `id: digdir.support-agent
type: agent
name: Support Agent
version: 1.0.0
description: Answers support questions.
owner:
  team: AI Enablement
  contact: ai-team@digdir.no
source:
  provider: github
  repository: digdir/ai-artifacts
  path: agents/support-agent
visibility: internal
lifecycle:
  status: experimental
`;

/** A type↔directory mismatch: declares agent but lives under skills/. */
const MISPLACED_AGENT = VALID_AGENT.replace('path: agents/support-agent', 'path: skills/misplaced-agent');

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
  writeArtifact('agents/support-agent', VALID_AGENT, '# Support Agent'); // 015: agents/ type dir
  writeArtifact('skills/misplaced-agent', MISPLACED_AGENT); // 015: type↔dir mismatch
  writeArtifact('agents/misplaced-skill', VALID.replace('id: digdir.security-review', 'id: digdir.misplaced-skill')); // skill under agents/
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

  it('discovers agents under the agents/ type dir (015 US2)', () => {
    const agent = scan(root).find((r) => r.path === 'agents/support-agent');
    expect(agent?.valid).toBe(true);
    expect(agent?.manifest?.type).toBe('agent');
  });

  it('reports a type↔directory mismatch as invalid, in both directions (015 US2-3)', () => {
    const results = scan(root);
    const misplacedAgent = results.find((r) => r.path === 'skills/misplaced-agent');
    expect(misplacedAgent?.valid).toBe(false);
    expect(misplacedAgent?.errors?.some((e) => e.includes("'agent'") && e.includes("'skills/'"))).toBe(true);

    const misplacedSkill = results.find((r) => r.path === 'agents/misplaced-skill');
    expect(misplacedSkill?.valid).toBe(false);
    expect(misplacedSkill?.errors?.some((e) => e.includes("'skill'") && e.includes("'agents/'"))).toBe(true);
  });
});
