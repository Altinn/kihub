import { describe, expect, it } from 'vitest';
import {
  DiscoveryConfigError,
  MAX_ARTIFACT_ROOTS,
  normalizeArtifactRoot,
  normalizeRepository,
  resolveDiscoveryConfig,
} from '../src/config';

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
