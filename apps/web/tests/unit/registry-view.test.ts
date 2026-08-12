import { ARTIFACT_TYPES } from '@kihub/artifact-schema';
import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_TYPE_LABELS,
  artifactTypeLabel,
  artifactTypeOptions,
} from '@/lib/registry-view';

/** 015 T019 — the Norwegian type-label map is exhaustive and feeds UI + admin identically. */
describe('registry-view', () => {
  it('has a label for every artifact type (exhaustive over ARTIFACT_TYPES)', () => {
    for (const type of ARTIFACT_TYPES) {
      expect(ARTIFACT_TYPE_LABELS[type], `label for ${type}`).toBeTruthy();
    }
    expect(Object.keys(ARTIFACT_TYPE_LABELS).sort()).toEqual([...ARTIFACT_TYPES].sort());
  });

  it('uses the agreed Norwegian labels', () => {
    expect(ARTIFACT_TYPE_LABELS).toEqual({
      skill: 'Ferdighet',
      prompt: 'Prompt',
      workflow: 'Arbeidsflyt',
      mcp: 'MCP-server',
      template: 'Mal',
      policy: 'Retningslinje',
      playbook: 'Dreiebok',
      agent: 'Agent',
    });
  });

  it('artifactTypeLabel falls back to the raw value for unknown types', () => {
    expect(artifactTypeLabel('agent')).toBe('Agent');
    expect(artifactTypeLabel('skill')).toBe('Ferdighet');
    expect(artifactTypeLabel('mystery')).toBe('mystery');
  });

  it('artifactTypeOptions emits {value,label} pairs in ARTIFACT_TYPES order', () => {
    const options = artifactTypeOptions();
    expect(options.map((o) => o.value)).toEqual([...ARTIFACT_TYPES]);
    expect(options.find((o) => o.value === 'agent')).toEqual({ value: 'agent', label: 'Agent' });
  });
});
