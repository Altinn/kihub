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

  it('fetches agent-card.json only for valid agents; 404 is fine; a bad card never invalidates the artifact (015 US3)', async () => {
    const AGENT = VALID.replace('type: skill', 'type: agent').replace(
      'id: digdir.security-review',
      'id: digdir.carded',
    );
    const files: Record<string, string> = {
      'agents/carded/artifact.yaml': AGENT,
      'agents/carded/agent-card.json': JSON.stringify({ name: 'Carded Agent' }),
      'agents/cardless/artifact.yaml': AGENT.replace('digdir.carded', 'digdir.cardless'),
      'agents/badcard/artifact.yaml': AGENT.replace('digdir.carded', 'digdir.badcard'),
      'agents/badcard/agent-card.json': '{not json',
      'skills/security-review/artifact.yaml': VALID,
      // A card next to a NON-agent must be ignored (never fetched/stored — FR-014).
      'skills/security-review/agent-card.json': JSON.stringify({ name: 'Should be ignored' }),
    };
    const requested: string[] = [];
    const reader: RepoReader = {
      async listArtifactDirs() {
        return ['agents/carded', 'agents/cardless', 'agents/badcard', 'skills/security-review'];
      },
      async readFile(relPath) {
        requested.push(relPath);
        return files[relPath];
      },
    };

    const results = await scanRepo(reader);
    const byPathMap = new Map(results.map((r) => [r.path, r]));

    const carded = byPathMap.get('agents/carded');
    expect(carded?.valid).toBe(true);
    expect(carded?.agentCard).toEqual({ name: 'Carded Agent' });
    expect(carded?.agentCardErrors).toBeUndefined();

    const cardless = byPathMap.get('agents/cardless');
    expect(cardless?.valid).toBe(true);
    expect(cardless?.agentCard).toBeUndefined();
    expect(cardless?.agentCardErrors).toBeUndefined();

    const badcard = byPathMap.get('agents/badcard');
    expect(badcard?.valid).toBe(true); // the artifact itself still registers (FR-012)
    expect(badcard?.agentCard).toBeUndefined();
    expect(badcard?.agentCardErrors?.length).toBeGreaterThan(0);

    const skill = byPathMap.get('skills/security-review');
    expect(skill?.valid).toBe(true);
    expect(skill?.agentCard).toBeUndefined();
    // The non-agent's card file was never even requested.
    expect(requested).not.toContain('skills/security-review/agent-card.json');
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
