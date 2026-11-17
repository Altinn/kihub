import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  DiscoveryConfigError,
  MAX_ARTIFACT_DIRS,
  MAX_ARTIFACT_ROOTS,
  normalizeArtifactRoot,
  normalizeRepository,
  resolveDiscoveryConfig,
} from '../src/config';
import { DISCOVERY_FAILURE_MARKERS, MARKERS } from '../src/messages';

describe('resolveDiscoveryConfig', () => {
  it('uses the backward-compatible repository root when kihub.yaml is absent', () => {
    expect(resolveDiscoveryConfig(undefined)).toEqual({
      schemaVersion: 1,
      artifactRoots: ['.'],
      configPath: null,
      configDigest: null,
    });
  });

  it('normalizes root order and produces a stable canonical digest', () => {
    const a = resolveDiscoveryConfig(`schemaVersion: 1
discovery:
  artifactRoots: [src, ., services/forms]
`);
    const b = resolveDiscoveryConfig(`discovery:
  artifactRoots:
    - services/forms
    - src
    - .
schemaVersion: 1
`);
    expect(a.artifactRoots).toEqual(['.', 'services/forms', 'src']);
    expect(a.configPath).toBe('kihub.yaml');
    expect(a.configDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(a.configDigest).toBe(b.configDigest);
  });

  it.each([
    ['', 'root must be a mapping'],
    ['- one\n- two\n', 'root must be a mapping'],
    ['schemaVersion: 2\ndiscovery:\n  artifactRoots: [.]\n', 'schemaVersion'],
    ['schemaVersion: "1"\ndiscovery:\n  artifactRoots: [.]\n', 'schemaVersion'],
    ['schemaVersion: 1\nunknown: true\ndiscovery:\n  artifactRoots: [.]\n', 'unknown key'],
    ['schemaVersion: 1\ndiscovery:\n  artifactRoots: []\n', 'must contain'],
    ['schemaVersion: 1\ndiscovery:\n  roots: [.]\n', 'unknown key'],
    ['schemaVersion: 1\ndiscovery:\n  artifactRoots: [src, src]\n', 'duplicates'],
    ['schemaVersion: 1\ndiscovery:\n  artifactRoots: [*missing]\n', 'invalid YAML'],
    ['schemaVersion: 1\ndiscovery:\n  artifactRoots: &roots [src]\nother: *roots\n', 'invalid YAML'],
    ['schemaVersion: 1\ndiscovery:\n  artifactRoots: [!thing src]\n', 'invalid YAML'],
    ['schemaVersion: 1\ndiscovery:\n  artifactRoots: [.]\n---\nextra: true\n', 'invalid YAML'],
  ])('rejects invalid config %#', (text, message) => {
    expect(() => resolveDiscoveryConfig(text)).toThrow(message);
  });

  it('enforces the root-count bound', () => {
    const roots = Array.from({ length: MAX_ARTIFACT_ROOTS + 1 }, (_, i) => `root-${i}`);
    expect(() =>
      resolveDiscoveryConfig(`schemaVersion: 1\ndiscovery:\n  artifactRoots: [${roots.join(', ')}]\n`),
    ).toThrow(`1-${MAX_ARTIFACT_ROOTS}`);
  });
});

describe('path and repository normalization', () => {
  it.each(['.', 'src', '.kihub', 'services/forms', 'src_2/skill-roots'])('accepts safe root %s', (root) => {
    expect(normalizeArtifactRoot(root)).toBe(root);
  });

  it.each([
    '',
    ' src',
    'src ',
    '/src',
    'src/',
    'src//nested',
    'src\\nested',
    'src/../other',
    'src/./other',
    'https://example.test/repo',
    'src:other',
  ])('rejects unsafe root %j', (root) => {
    expect(() => normalizeArtifactRoot(root)).toThrow(DiscoveryConfigError);
  });

  it('normalizes owner/repo case and an optional .git suffix', () => {
    expect(normalizeRepository(' Digdir/AI-Artifacts.git ')).toBe('digdir/ai-artifacts');
  });

  it.each(['repo', 'a/b/c', 'https://github.com/a/b', 'a/'])('rejects malformed repository %s', (repo) => {
    expect(() => normalizeRepository(repo)).toThrow('owner/repo');
  });
});

describe('artifactDirs (028)', () => {
  const dirs = (body: string) => `schemaVersion: 1\ndiscovery:\n${body}`;

  it('resolves a dirs-only config without an implicit repository root', () => {
    const resolved = resolveDiscoveryConfig(
      dirs('  artifactDirs:\n    skill:\n      - agents/_skills\n'),
    );
    expect(resolved.artifactRoots).toEqual([]);
    expect(resolved.artifactDirs).toEqual({ skill: ['agents/_skills'] });
    expect(resolved.configPath).toBe('kihub.yaml');
    expect(resolved.configDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('combines roots and dirs, ordering types by ARTIFACT_TYPES and entries by UTF-8 bytes', () => {
    const resolved = resolveDiscoveryConfig(
      dirs(
        '  artifactRoots: [src]\n  artifactDirs:\n    agent: [custom/bots]\n    skill: [docs/skills, agents/_skills]\n',
      ),
    );
    expect(resolved.artifactRoots).toEqual(['src']);
    expect(Object.keys(resolved.artifactDirs ?? {})).toEqual(['skill', 'agent']);
    expect(resolved.artifactDirs?.skill).toEqual(['agents/_skills', 'docs/skills']);
    expect(resolved.artifactDirs?.agent).toEqual(['custom/bots']);
  });

  it('keeps artifactDirs absent from the resolved config when it is not used', () => {
    expect(resolveDiscoveryConfig(dirs('  artifactRoots: [src]\n'))).not.toHaveProperty('artifactDirs');
  });

  it('is independent of entry and key order in the digest, and changes when the mapping changes', () => {
    const a = resolveDiscoveryConfig(dirs('  artifactDirs:\n    skill: [b, a]\n    agent: [c]\n'));
    const b = resolveDiscoveryConfig(dirs('  artifactDirs:\n    agent: [c]\n    skill: [a, b]\n'));
    const c = resolveDiscoveryConfig(dirs('  artifactDirs:\n    skill: [a, b]\n    agent: [d]\n'));
    expect(a.configDigest).toBe(b.configDigest);
    expect(a.configDigest).not.toBe(c.configDigest);
  });

  it('hashes the documented canonical form for a dirs-only file', () => {
    const resolved = resolveDiscoveryConfig(dirs('  artifactDirs:\n    skill: [agents/_skills]\n'));
    const canonical = '{"schemaVersion":1,"discovery":{"artifactRoots":[],"artifactDirs":{"skill":["agents/_skills"]}}}';
    expect(resolved.configDigest).toBe(`sha256:${createHash('sha256').update(canonical).digest('hex')}`);
  });

  // FR-013 / SC-002: roots-only digests must be byte-identical to what 026 produced. The expected
  // values hash the literal 026 canonical strings, never the code under test.
  it.each([
    ['[src, .]', '{"schemaVersion":1,"discovery":{"artifactRoots":[".","src"]}}'],
    ['[src]', '{"schemaVersion":1,"discovery":{"artifactRoots":["src"]}}'],
    ['[services/forms]', '{"schemaVersion":1,"discovery":{"artifactRoots":["services/forms"]}}'],
  ])('keeps the 026 digest for roots-only config %s', (roots, canonical) => {
    const resolved = resolveDiscoveryConfig(dirs(`  artifactRoots: ${roots}\n`));
    expect(resolved.configDigest).toBe(`sha256:${createHash('sha256').update(canonical).digest('hex')}`);
  });

  it('fails when discovery names neither artifactRoots nor artifactDirs', () => {
    expect(() => resolveDiscoveryConfig(dirs('  {}\n'))).toThrow('artifactRoots, artifactDirs');
  });

  it('exposes the entry limit', () => {
    expect(MAX_ARTIFACT_DIRS).toBe(32);
  });
});

describe('artifactDirs failures (028 US2)', () => {
  const yamlWith = (artifactDirs: unknown, extra = '') =>
    `schemaVersion: 1\ndiscovery:\n  artifactDirs: ${JSON.stringify(artifactDirs)}\n${extra}`;

  it.each([
    ['plural directory name', { skills: ['agents/_skills'] }, MARKERS.unknownType, "did you mean 'skill'"],
    ['plural agents', { agents: ['a'] }, MARKERS.unknownType, "did you mean 'agent'"],
    ['wrong case', { Skill: ['a'] }, MARKERS.unknownType, 'valid: skill, prompt'],
    ['not a manifest type', { evaluation: ['a'] }, MARKERS.unknownType, 'valid: skill, prompt'],
    ['string instead of list', { skill: 'agents/_skills' }, MARKERS.notAList, undefined],
    ['empty list', { skill: [] }, MARKERS.notAList, undefined],
    ['null list', { skill: null }, MARKERS.notAList, undefined],
    ['non-string entry', { skill: [1] }, MARKERS.unsafeDir, undefined],
    ['absolute path', { skill: ['/abs'] }, MARKERS.unsafeDir, undefined],
    ['double slash', { skill: ['a//b'] }, MARKERS.unsafeDir, undefined],
    ['backslash', { skill: ['a\\b'] }, MARKERS.unsafeDir, undefined],
    ['parent segment', { skill: ['../x'] }, MARKERS.unsafeDir, undefined],
    ['dot segment', { skill: ['./x'] }, MARKERS.unsafeDir, undefined],
    ['trailing slash', { skill: ['x/'] }, MARKERS.unsafeDir, undefined],
    ['colon', { skill: ['a:b'] }, MARKERS.unsafeDir, undefined],
    ['surrounding space', { skill: [' x'] }, MARKERS.unsafeDir, undefined],
    ['glob', { skill: ['agents/*'] }, MARKERS.unsafeDir, undefined],
    ['repository root', { skill: ['.'] }, MARKERS.dotNotAllowed, 'artifactRoots'],
    ['duplicate in a type', { skill: ['a', 'a'] }, MARKERS.duplicateDir, undefined],
    ['empty mapping', {}, 'at least one type', undefined],
    ['a list instead of a mapping', ['skill'], 'must map an artifact type', undefined],
  ])('rejects %s', (_name, artifactDirs, marker, extra) => {
    let message = '';
    try {
      resolveDiscoveryConfig(yamlWith(artifactDirs));
    } catch (error) {
      expect(error).toBeInstanceOf(DiscoveryConfigError);
      message = (error as Error).message;
    }
    expect(message).toContain(marker);
    if (extra) expect(message).toContain(extra);
  });

  it('rejects more than 32 entries in total across types', () => {
    const skill = Array.from({ length: 17 }, (_, i) => `s${i}`);
    const agent = Array.from({ length: 16 }, (_, i) => `a${i}`);
    expect(() => resolveDiscoveryConfig(yamlWith({ skill, agent }))).toThrow(MARKERS.tooMany);
    // exactly 32 is fine
    expect(() =>
      resolveDiscoveryConfig(yamlWith({ skill, agent: agent.slice(0, 15) })),
    ).not.toThrow();
  });

  it('still rejects an empty artifactRoots list, and unknown keys, when artifactDirs is present', () => {
    expect(() =>
      resolveDiscoveryConfig(
        'schemaVersion: 1\ndiscovery:\n  artifactRoots: []\n  artifactDirs: {skill: [a]}\n',
      ),
    ).toThrow('must contain');
    expect(() =>
      resolveDiscoveryConfig('schemaVersion: 1\ndiscovery:\n  artifactDirs: {skill: [a]}\n  extra: true\n'),
    ).toThrow('unknown key');
  });

  it('rejects YAML aliases inside artifactDirs', () => {
    expect(() =>
      resolveDiscoveryConfig(
        'schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skill: &dirs [a]\n    agent: *dirs\n',
      ),
    ).toThrow('invalid YAML');
  });

  it('exposes every fixed failure fragment for the guide to explain', () => {
    expect(DISCOVERY_FAILURE_MARKERS).toEqual(Object.values(MARKERS));
    expect(new Set(DISCOVERY_FAILURE_MARKERS).size).toBe(DISCOVERY_FAILURE_MARKERS.length);
  });
});
