import { ARTIFACT_TYPES, validateAgentCard, validateManifest } from '@kihub/artifact-schema';
import {
  buildLayout,
  DISCOVERY_FAILURE_MARKERS,
  matchArtifactDirs,
  resolveDiscoveryConfig,
} from '@kihub/discovery-core';
import { describe, expect, it } from 'vitest';
import {
  CHECKLIST,
  COMMON_MISTAKES,
  EXAMPLE_AGENT_CARD,
  EXAMPLE_AGENT_MANIFEST,
  EXAMPLE_CUSTOM_LAYOUT_MANIFEST,
  EXAMPLE_CUSTOM_LAYOUT_TREE,
  EXAMPLE_KIHUB_CONFIG,
  EXAMPLE_KIHUB_DIRS_CONFIG,
  EXAMPLE_MINIMAL_MANIFEST,
  EXAMPLE_NESTED_REPO_TREE,
  EXAMPLE_SKILL_MANIFEST,
  FAQ,
  GUIDE_ARTIFACT_TYPES,
  MANIFEST_FIELDS,
  TYPE_DIRECTORIES,
} from '@/lib/contribute-guide';

/**
 * 021 — the /bidra guide's examples are what external teams copy, so every one must pass the
 * REAL validators. A schema change that breaks an example fails here, not in another team's repo.
 */
describe('contribute-guide', () => {
  it.each([
    ['skill', EXAMPLE_SKILL_MANIFEST],
    ['minimal prompt', EXAMPLE_MINIMAL_MANIFEST],
    ['agent', EXAMPLE_AGENT_MANIFEST],
  ])('the %s example manifest is valid', (_label, manifest) => {
    const result = validateManifest(manifest);
    expect(result.valid ? [] : result.errors).toEqual([]);
  });

  it('each example sits under the directory its type requires', () => {
    for (const manifest of [EXAMPLE_SKILL_MANIFEST, EXAMPLE_MINIMAL_MANIFEST, EXAMPLE_AGENT_MANIFEST]) {
      const result = validateManifest(manifest);
      if (!result.valid) throw new Error('example manifest invalid');
      expect(result.data.source.path.split('/')[0]).toBe(TYPE_DIRECTORIES[result.data.type]);
    }
  });

  it('the example agent card is valid', () => {
    const result = validateAgentCard(EXAMPLE_AGENT_CARD);
    expect(result.valid ? [] : result.errors).toEqual([]);
  });

  it('the example kihub.yaml is valid and matches the nested example tree', () => {
    const { artifactRoots } = resolveDiscoveryConfig(EXAMPLE_KIHUB_CONFIG);
    expect(artifactRoots).toEqual(['services/skjema', 'src']);
    const paths = [...EXAMPLE_NESTED_REPO_TREE.matchAll(/source\.path: (\S+)/g)].map((m) => m[1]!);
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      const root = artifactRoots.find((r) => path.startsWith(`${r}/`));
      expect(root, path).toBeDefined();
      const [typeDir, slug, ...rest] = path.slice(root!.length + 1).split('/');
      expect(Object.values(TYPE_DIRECTORIES), path).toContain(typeDir);
      expect(slug && rest.length === 0, path).toBe(true);
    }
  });

  it('covers every artifact type exactly once', () => {
    expect(GUIDE_ARTIFACT_TYPES.map((t) => t.type)).toEqual([...ARTIFACT_TYPES]);
  });

  it('documents every top-level manifest field', () => {
    const documented = new Set(MANIFEST_FIELDS.map((f) => f.name.split('.')[0]));
    for (const key of ['id', 'type', 'name', 'version', 'description', 'owner', 'source', 'install', 'tags', 'visibility', 'lifecycle']) {
      expect(documented.has(key), key).toBe(true);
    }
  });
});

/**
 * 028 — the custom-layout example (`artifactDirs`) is run through the REAL parser and matcher, not
 * regex-checked, so the guide cannot describe a layout that discovery would not find.
 */
describe('contribute-guide: custom layouts (028)', () => {
  const annotated = (tree: string, label: string) =>
    [...tree.matchAll(new RegExp(`${label}: (\\S+)`, 'g'))].map((m) => m[1]!);

  it('the artifactDirs example resolves to the documented mapping, with no implicit root', () => {
    const config = resolveDiscoveryConfig(EXAMPLE_KIHUB_DIRS_CONFIG);
    expect(config.artifactRoots).toEqual([]);
    expect(config.artifactDirs).toEqual({ skill: ['agents/_skills'] });
  });

  it('the real matcher finds exactly the artifact folders the tree marks, and none of its decoys', () => {
    const layout = buildLayout(resolveDiscoveryConfig(EXAMPLE_KIHUB_DIRS_CONFIG));
    const artifacts = annotated(EXAMPLE_CUSTOM_LAYOUT_TREE, 'source\\.path');
    const ignored = annotated(EXAMPLE_CUSTOM_LAYOUT_TREE, 'ignoreres');
    expect(artifacts.length).toBeGreaterThanOrEqual(2);
    expect(ignored.length).toBeGreaterThanOrEqual(1);
    const manifestPaths = [...artifacts, ...ignored].map((dir) => `${dir}/artifact.yaml`);
    expect(matchArtifactDirs(layout, manifestPaths)).toEqual([...artifacts].sort());
  });

  it('the custom-layout manifest is valid, sits at a marked folder and has the configured type', () => {
    const result = validateManifest(EXAMPLE_CUSTOM_LAYOUT_MANIFEST);
    if (!result.valid) throw new Error(result.errors.join('\n'));
    const config = resolveDiscoveryConfig(EXAMPLE_KIHUB_DIRS_CONFIG);
    expect(annotated(EXAMPLE_CUSTOM_LAYOUT_TREE, 'source\\.path')).toContain(result.data.source.path);
    expect(config.artifactDirs?.[result.data.type]?.some((d) => result.data.source.path.startsWith(`${d}/`))).toBe(
      true,
    );
  });

  it('the nested root example is also checked by the real matcher', () => {
    const config = resolveDiscoveryConfig(EXAMPLE_KIHUB_CONFIG);
    const paths = annotated(EXAMPLE_NESTED_REPO_TREE, 'source\\.path');
    expect(matchArtifactDirs(buildLayout(config), paths.map((p) => `${p}/artifact.yaml`))).toEqual(
      [...paths].sort(),
    );
  });

  it('a plural directory-name key is rejected with a hint, as the guide warns', () => {
    expect(() =>
      resolveDiscoveryConfig('schemaVersion: 1\ndiscovery:\n  artifactDirs:\n    skills: [agents/_skills]\n'),
    ).toThrow("did you mean 'skill'");
  });

  it('every fixed scan-failure fragment has a troubleshooting entry that quotes it', () => {
    const quoted = new Set(COMMON_MISTAKES.flatMap((m) => m.errors ?? []));
    for (const fragment of DISCOVERY_FAILURE_MARKERS) {
      expect(quoted.has(fragment), `no troubleshooting entry quotes “${fragment}”`).toBe(true);
    }
  });

  it('quoted error fragments in the guide are real, current messages (no stale wording)', () => {
    const real = new Set<string>(DISCOVERY_FAILURE_MARKERS);
    // fragments that belong to per-artifact (not whole-scan) errors are listed explicitly
    const perArtifact = new Set(['does not match the type', 'does not match discovered path']);
    for (const fragment of COMMON_MISTAKES.flatMap((m) => m.errors ?? [])) {
      expect(real.has(fragment) || perArtifact.has(fragment), fragment).toBe(true);
    }
  });

  it('answers “do we have to move folders?” and covers mixing layouts', () => {
    const questions = FAQ.map((f) => f.question);
    expect(questions).toContain('Må vi flytte mapper?');
    expect(questions).toContain('Kan vi blande mapper og roter?');
    expect(questions).toContain('Hvorfor finner ikke KI Hub mappen min?');
    const move = FAQ.find((f) => f.question === 'Må vi flytte mapper?')!;
    expect(move.answer.startsWith('Nei')).toBe(true);
    expect(move.answer).toContain('artifactDirs');
  });

  it('the checklist mentions the configured folder and the full source.path', () => {
    expect(CHECKLIST.join('\n')).toContain('artifactDirs');
  });
});
