import { ARTIFACT_TYPES } from '@kihub/artifact-schema';
import { describe, expect, it } from 'vitest';
import {
  ARTIFACT_TYPE_LABELS,
  REVIEW_DECISION_LABELS,
  artifactTypeLabel,
  artifactTypeOptions,
  labelFor,
  lifecycleTags,
  parseRegistrySearchParams,
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

describe('lifecycleTags (026)', () => {
  it('shows the lifecycle state alone when nothing else adds information', () => {
    expect(lifecycleTags({ lifecycleState: 'experimental', approvalState: 'not-approved' })).toEqual([
      { label: 'Eksperimentell', color: 'info' },
    ]);
  });

  it('never repeats "Godkjent" for an approved artifact with approval state approved', () => {
    expect(lifecycleTags({ lifecycleState: 'approved', approvalState: 'approved' })).toEqual([
      { label: 'Godkjent', color: 'success' },
    ]);
  });

  it('adds approval and the recommended flag when they differ from the state', () => {
    expect(
      lifecycleTags({ lifecycleState: 'in-review', approvalState: 'approved', recommended: true }).map((t) => t.label),
    ).toEqual(['Til vurdering', 'Godkjent', 'Anbefalt']);
    expect(
      lifecycleTags({ lifecycleState: 'recommended', approvalState: 'not-approved', recommended: true }).map(
        (t) => t.label,
      ),
    ).toEqual(['Anbefalt']);
  });
});

describe('labelFor (026)', () => {
  it('translates known values and falls back to the raw value or a dash', () => {
    expect(labelFor(REVIEW_DECISION_LABELS, 'changes-requested')).toBe('Endringer ønsket');
    expect(labelFor(REVIEW_DECISION_LABELS, 'something-new')).toBe('something-new');
    expect(labelFor(REVIEW_DECISION_LABELS, null)).toBe('—');
  });
});

describe('parseRegistrySearchParams (026 GET forms)', () => {
  it('treats the "Alle" radio (empty type) as no type filter', () => {
    expect(parseRegistrySearchParams({ type: '' }).type).toBeUndefined();
    expect(parseRegistrySearchParams({ type: 'agent' }).type).toBe('agent');
  });

  it('reads one or many tags, deduplicated and without blanks', () => {
    expect(parseRegistrySearchParams({ tag: 'kode' }).tags).toEqual(['kode']);
    expect(parseRegistrySearchParams({ tag: ['kode', 'kode', ' ', 'tekst'] }).tags).toEqual(['kode', 'tekst']);
  });

  it('trims the query and keeps it alongside filters', () => {
    expect(parseRegistrySearchParams({ q: '  copilot ', type: 'skill', tag: 'kode' })).toEqual({
      type: 'skill',
      tags: ['kode'],
      query: 'copilot',
    });
  });
});
