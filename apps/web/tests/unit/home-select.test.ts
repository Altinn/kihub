import { describe, expect, it } from 'vitest';
import type { Governance } from '@/lib/governance';
import { type RecommendedArtifact, selectRecommendedArtifacts, takeTopN } from '@/lib/home-select';

/**
 * T001 (US1, FR-002/013) — the pure widget-selection logic behind the home dashboard. Pure functions
 * only: no Payload runtime is loaded (the underlying reads already order + gate visibility; these just
 * cap and curate). Written failing-first.
 */

describe('takeTopN', () => {
  it('returns the first n items in input order', () => {
    expect(takeTopN([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
  });

  it('returns all items when there are fewer than n', () => {
    expect(takeTopN([1, 2], 3)).toEqual([1, 2]);
  });

  it('returns an empty array for n <= 0 or empty input', () => {
    expect(takeTopN([1, 2, 3], 0)).toEqual([]);
    expect(takeTopN([1, 2, 3], -1)).toEqual([]);
    expect(takeTopN([], 3)).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3, 4];
    takeTopN(input, 2);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});

/** Build a Governance with the two flags that drive curation; the rest are inert defaults. */
function gov(flags: { featured?: boolean; recommended?: boolean }): Governance {
  return {
    id: 1,
    lifecycleState: 'approved',
    reviewStatus: 'not-submitted',
    approvalState: 'approved',
    recommended: flags.recommended ?? false,
    featured: flags.featured ?? false,
    businessOwner: null,
    technicalOwner: null,
    riskLevel: null,
    internalNotes: null,
  };
}

function entry(id: string, flags: { featured?: boolean; recommended?: boolean }): RecommendedArtifact {
  return {
    artifact: { artifactId: id, name: id, type: 'skill', description: '', tags: [] },
    governance: gov(flags),
  };
}

describe('selectRecommendedArtifacts', () => {
  it('keeps only featured or recommended artifacts', () => {
    const entries = [
      entry('plain', {}),
      entry('rec', { recommended: true }),
      entry('feat', { featured: true }),
    ];
    const result = selectRecommendedArtifacts(entries, 3).map((e) => e.artifact.artifactId);
    expect(result).toEqual(['feat', 'rec']); // 'plain' excluded; featured surfaced first
  });

  it('orders featured entries ahead of recommended-only ones, preserving input order within groups', () => {
    const entries = [
      entry('rec1', { recommended: true }),
      entry('feat1', { featured: true }),
      entry('rec2', { recommended: true }),
      entry('feat2', { featured: true, recommended: true }),
    ];
    const result = selectRecommendedArtifacts(entries, 4).map((e) => e.artifact.artifactId);
    expect(result).toEqual(['feat1', 'feat2', 'rec1', 'rec2']);
  });

  it('caps the result at n', () => {
    const entries = [
      entry('feat1', { featured: true }),
      entry('feat2', { featured: true }),
      entry('rec1', { recommended: true }),
    ];
    expect(selectRecommendedArtifacts(entries, 2)).toHaveLength(2);
  });

  it('returns an empty array when nothing qualifies', () => {
    const entries = [entry('a', {}), entry('b', {})];
    expect(selectRecommendedArtifacts(entries, 3)).toEqual([]);
  });
});
