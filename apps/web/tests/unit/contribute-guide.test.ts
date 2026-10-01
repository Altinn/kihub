import { ARTIFACT_TYPES, validateAgentCard, validateManifest } from '@kihub/artifact-schema';
import { describe, expect, it } from 'vitest';
import {
  EXAMPLE_AGENT_CARD,
  EXAMPLE_AGENT_MANIFEST,
  EXAMPLE_MINIMAL_MANIFEST,
  EXAMPLE_SKILL_MANIFEST,
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
