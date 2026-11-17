import type { Artifact, CatalogEntry } from '@/payload-types';
import { lifecycleBadgeView } from '@/lib/governance-view';
import { reviewIsOlderRevision, toGovernance } from '@/lib/governance-view';
import { describe, expect, it } from 'vitest';

function artifact(version = '1.0.0', digest: string | null = 'sha256:current'): Artifact {
  return { version, contentDigest: digest } as Artifact;
}

function entry(overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    lifecycleState: 'approved',
    approvalState: 'approved',
    approvalArtifactVersion: '1.0.0',
    approvalArtifactDigest: 'sha256:current',
    recommended: true,
    ...overrides,
  } as CatalogEntry;
}

describe('revision-bound governance projection', () => {
  it('treats an exact version+digest match as current and keeps recommendation effective', () => {
    const governance = toGovernance(entry(), artifact());
    expect(governance.approvalCurrent).toBe(true);
    expect(governance.recommended).toBe(true);
    expect(lifecycleBadgeView(governance)).toMatchObject({
      lifecycleColor: 'success',
      showApproved: true,
      showStaleWarning: false,
      showRecommended: true,
    });
  });

  it.each([
    ['version changed', artifact('2.0.0')],
    ['digest changed', artifact('1.0.0', 'sha256:changed')],
    ['digest not indexed', artifact('1.0.0', null)],
    ['legacy approval snapshot', artifact('1.0.0')],
  ])('marks approval stale when %s', (caseName, currentArtifact) => {
    const currentEntry =
      caseName === 'legacy approval snapshot'
        ? entry({ approvalArtifactVersion: null, approvalArtifactDigest: null })
        : entry();
    const governance = toGovernance(currentEntry, currentArtifact);
    expect(governance.approvalCurrent).toBe(false);
    expect(governance.recommended).toBe(false);
    expect(lifecycleBadgeView(governance)).toMatchObject({
      lifecycleColor: 'warning',
      lifecycleLabel: 'Approved (outdated)',
      showApproved: false,
      showStaleWarning: true,
      showRecommended: false,
    });
  });

  it('keeps a rejected decision from leaving an approved lifecycle looking current', () => {
    const governance = toGovernance(entry({ approvalState: 'rejected' }), artifact());
    expect(governance.approvalCurrent).toBe(false);
    expect(lifecycleBadgeView(governance)).toMatchObject({
      lifecycleColor: 'warning',
      lifecycleLabel: 'Approved (outdated)',
      showApproved: false,
      showStaleWarning: true,
      showRecommended: false,
    });
  });

  it('labels null or different review digests as older revisions', () => {
    expect(reviewIsOlderRevision('sha256:current', 'sha256:current')).toBe(false);
    expect(reviewIsOlderRevision('sha256:old', 'sha256:current')).toBe(true);
    expect(reviewIsOlderRevision(null, 'sha256:current')).toBe(true);
    expect(reviewIsOlderRevision('sha256:current', null)).toBe(true);
  });
});
