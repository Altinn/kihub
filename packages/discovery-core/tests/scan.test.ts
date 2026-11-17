import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { artifactDirectoryDigest, gitBlobOid } from '../src/digest';
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

describe('configured local scan', () => {
  function withRepo(run: (repo: string) => void) {
    const repo = mkdtempSync(path.join(tmpdir(), 'kihub-configured-scan-'));
    try {
      run(repo);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  }

  function writeRepoArtifact(repo: string, rel: string, manifest: string) {
    const dir = path.join(repo, rel);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, 'artifact.yaml'), manifest);
  }

  it('discovers only exact <root>/<type>/<slug> paths under every configured root', () => {
    withRepo((repo) => {
      writeFileSync(
        path.join(repo, 'kihub.yaml'),
        'schemaVersion: 1\ndiscovery:\n  artifactRoots: [src, services/forms]\n',
      );
      const nestedSkill = VALID.replace('digdir.security-review', 'digdir.nested')
        .replace('Security Review', 'Nested')
        .replace('path: skills/security-review', 'path: src/skills/nested');
      const formPrompt = VALID.replace('digdir.security-review', 'digdir.form-tone')
        .replace('type: skill', 'type: prompt')
        .replace('Security Review', 'Form Tone')
        .replace('path: skills/security-review', 'path: services/forms/prompts/tone');
      writeRepoArtifact(repo, 'src/skills/nested', nestedSkill);
      writeRepoArtifact(repo, 'services/forms/prompts/tone', formPrompt);
      writeRepoArtifact(repo, 'skills/root-ignored', VALID.replaceAll('security-review', 'root-ignored'));
      writeRepoArtifact(repo, 'src/deeper/skills/too-deep', nestedSkill.replaceAll('nested', 'too-deep'));

      expect(scan(repo).map((artifact) => artifact.path).sort()).toEqual([
        'services/forms/prompts/tone',
        'src/skills/nested',
      ]);
    });
  });

  it('fails before enumeration when a configured local root is missing', () => {
    withRepo((repo) => {
      writeFileSync(
        path.join(repo, 'kihub.yaml'),
        'schemaVersion: 1\ndiscovery:\n  artifactRoots: [missing]\n',
      );
      expect(() => scan(repo)).toThrow('does not exist');
    });
  });

  it('reports actual source.path and expected-repository mismatches on the artifact', () => {
    withRepo((repo) => {
      writeRepoArtifact(
        repo,
        'skills/wrong-source',
        VALID.replace('digdir.security-review', 'digdir.wrong-source')
          .replace('repository: digdir/ai-artifacts', 'repository: other/repository')
          .replace('path: skills/security-review', 'path: skills/not-the-real-path'),
      );
      const artifact = scan(repo, { expectedRepository: 'Digdir/AI-Artifacts.git' })[0];
      expect(artifact?.valid).toBe(false);
      expect(artifact?.errors).toEqual([
        "source.path: 'skills/not-the-real-path' does not match discovered path 'skills/wrong-source'",
        "source.repository: 'other/repository' does not match discovery source 'Digdir/AI-Artifacts.git'",
      ]);
    });
  });

  it('in a Git checkout digests only tracked files, exactly like the GitHub tree for that commit', () => {
    withRepo((repo) => {
      const git = (...args: string[]) =>
        execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], {
          encoding: 'utf8',
        });
      git('init', '-q');
      const rel = 'skills/tracked';
      const manifest = VALID.replace('digdir.security-review', 'digdir.tracked')
        .replace('Security Review', 'Tracked')
        .replace('path: skills/security-review', `path: ${rel}`);
      writeRepoArtifact(repo, rel, manifest);
      writeFileSync(path.join(repo, rel, 'SKILL.md'), '# Tracked\n');
      git('add', '.');
      git('commit', '-q', '-m', 'init');
      const committed = scan(repo)[0]?.contentDigest;

      // Untracked and ignored clutter must not move the digest.
      writeFileSync(path.join(repo, rel, '.DS_Store'), 'junk');
      writeFileSync(path.join(repo, '.gitignore'), 'node_modules/\n');
      mkdirSync(path.join(repo, rel, 'node_modules'));
      writeFileSync(path.join(repo, rel, 'node_modules', 'x.js'), 'x');
      expect(scan(repo)[0]?.contentDigest).toBe(committed);

      // Same digest the GitHub reader computes from the commit's tree blob shas.
      const treeEntries = git('ls-tree', '-r', 'HEAD', '--', rel)
        .trim()
        .split('\n')
        .map((line) => {
          const [meta, file] = line.split('\t') as [string, string];
          return { path: file.slice(rel.length + 1), blobOid: meta.split(' ')[2]! };
        });
      expect(committed).toBe(artifactDirectoryDigest(treeEntries));
    });
  });

  it('digests every file recursively, hashes symlink target bytes, and notices SKILL.md-only changes', () => {
    withRepo((repo) => {
      const rel = 'skills/digest-fixture';
      const manifest = VALID.replace('digdir.security-review', 'digdir.digest-fixture')
        .replace('Security Review', 'Digest Fixture')
        .replace('path: skills/security-review', `path: ${rel}`);
      writeRepoArtifact(repo, rel, manifest);
      const dir = path.join(repo, rel);
      writeFileSync(path.join(dir, 'SKILL.md'), '# First\n');
      mkdirSync(path.join(dir, 'instructions'));
      writeFileSync(path.join(dir, 'instructions', 'notes.txt'), 'nested\n');
      symlinkSync('SKILL.md', path.join(dir, 'skill-link'));

      const first = scan(repo)[0]?.contentDigest;
      expect(first).toBe(
        artifactDirectoryDigest([
          { path: 'artifact.yaml', blobOid: gitBlobOid(manifest) },
          { path: 'instructions/notes.txt', blobOid: gitBlobOid('nested\n') },
          { path: 'SKILL.md', blobOid: gitBlobOid('# First\n') },
          { path: 'skill-link', blobOid: gitBlobOid('SKILL.md') },
        ]),
      );

      writeFileSync(path.join(dir, 'SKILL.md'), '# Second\n');
      expect(scan(repo)[0]?.contentDigest).not.toBe(first);
    });
  });

  it('treats a manifest symlink as Git link bytes instead of following it', () => {
    withRepo((repo) => {
      const outside = path.join(repo, 'outside-manifest.yaml');
      writeFileSync(outside, VALID);
      const artifactDir = path.join(repo, 'skills', 'linked-manifest');
      mkdirSync(artifactDir, { recursive: true });
      symlinkSync(outside, path.join(artifactDir, 'artifact.yaml'));

      const artifact = scan(repo).find((result) => result.path === 'skills/linked-manifest');
      expect(artifact?.valid).toBe(false);
      expect(artifact?.errors?.join('\n')).toContain('expected object, received string');
      expect(artifact?.contentDigest).toBe(
        artifactDirectoryDigest([
          { path: 'artifact.yaml', blobOid: gitBlobOid(outside) },
        ]),
      );
    });
  });
});
