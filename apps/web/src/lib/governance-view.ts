import type { LifecycleState } from '@kihub/governance-core';

export interface Governance {
  id: number | null;
  lifecycleState: LifecycleState;
  reviewStatus: 'not-submitted' | 'in-review';
  approvalState: 'not-approved' | 'approved' | 'rejected';
  recommended: boolean;
  featured: boolean;
  businessOwner: string | null;
  technicalOwner: string | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  internalNotes: string | null;
  approvalCurrent: boolean;
  approvalArtifactVersion: string | null;
  approvalArtifactDigest: string | null;
  approvalDecidedAt: string | null;
  currentArtifactVersion: string;
  currentArtifactDigest: string | null;
}

export interface RevisionArtifactView {
  version: string;
  lifecycleStatus?: string | null;
  contentDigest?: string | null;
}

export interface RevisionCatalogEntryView {
  id: number;
  lifecycleState: LifecycleState;
  reviewStatus?: 'not-submitted' | 'in-review' | null;
  approvalState?: 'not-approved' | 'approved' | 'rejected' | null;
  recommended?: boolean | null;
  featured?: boolean | null;
  businessOwner?: string | null;
  technicalOwner?: string | null;
  riskLevel?: 'low' | 'medium' | 'high' | null;
  internalNotes?: string | null;
  approvalArtifactVersion?: string | null;
  approvalArtifactDigest?: string | null;
  approvalDecidedAt?: string | null;
}

export function isApprovalCurrent(
  entry: RevisionCatalogEntryView,
  artifact: RevisionArtifactView,
): boolean {
  return (
    entry.approvalState === 'approved' &&
    Boolean(artifact.contentDigest) &&
    entry.approvalArtifactVersion === artifact.version &&
    entry.approvalArtifactDigest === artifact.contentDigest
  );
}

export function reviewIsOlderRevision(
  reviewDigest: string | null | undefined,
  currentDigest: string | null | undefined,
): boolean {
  return !reviewDigest || !currentDigest || reviewDigest !== currentDigest;
}

export function toGovernance(
  entry: RevisionCatalogEntryView,
  artifact: RevisionArtifactView,
): Governance {
  const approvalCurrent = isApprovalCurrent(entry, artifact);
  return {
    id: entry.id,
    lifecycleState: entry.lifecycleState,
    reviewStatus: entry.reviewStatus ?? 'not-submitted',
    approvalState: entry.approvalState ?? 'not-approved',
    recommended: Boolean(entry.recommended && approvalCurrent),
    featured: entry.featured ?? false,
    businessOwner: entry.businessOwner ?? null,
    technicalOwner: entry.technicalOwner ?? null,
    riskLevel: entry.riskLevel ?? null,
    internalNotes: entry.internalNotes ?? null,
    approvalCurrent,
    approvalArtifactVersion: entry.approvalArtifactVersion ?? null,
    approvalArtifactDigest: entry.approvalArtifactDigest ?? null,
    approvalDecidedAt: entry.approvalDecidedAt ?? null,
    currentArtifactVersion: artifact.version,
    currentArtifactDigest: artifact.contentDigest ?? null,
  };
}

export function defaultGovernance(artifact: RevisionArtifactView): Governance {
  return {
    id: null,
    lifecycleState: (artifact.lifecycleStatus as LifecycleState | undefined) ?? 'draft',
    reviewStatus: 'not-submitted',
    approvalState: 'not-approved',
    recommended: false,
    featured: false,
    businessOwner: null,
    technicalOwner: null,
    riskLevel: null,
    internalNotes: null,
    approvalCurrent: false,
    approvalArtifactVersion: null,
    approvalArtifactDigest: null,
    approvalDecidedAt: null,
    currentArtifactVersion: artifact.version,
    currentArtifactDigest: artifact.contentDigest ?? null,
  };
}

const LABELS: Record<Governance['lifecycleState'], string> = {
  draft: 'Draft',
  experimental: 'Experimental',
  'in-review': 'In Review',
  approved: 'Approved',
  recommended: 'Recommended',
  deprecated: 'Deprecated',
  archived: 'Archived',
};

const COLORS: Record<Governance['lifecycleState'], 'neutral' | 'info' | 'success' | 'warning' | 'danger'> = {
  draft: 'neutral',
  experimental: 'info',
  'in-review': 'info',
  approved: 'success',
  recommended: 'success',
  deprecated: 'warning',
  archived: 'danger',
};

export function lifecycleBadgeView(governance: Governance) {
  const staleApproval = governance.approvalState === 'approved' && !governance.approvalCurrent;
  const staleGovernedLifecycle =
    !governance.approvalCurrent &&
    (governance.lifecycleState === 'approved' || governance.lifecycleState === 'recommended');
  return {
    lifecycleColor: staleGovernedLifecycle ? ('warning' as const) : COLORS[governance.lifecycleState],
    lifecycleLabel: staleGovernedLifecycle
      ? `${LABELS[governance.lifecycleState]} (outdated)`
      : LABELS[governance.lifecycleState],
    showApproved: governance.approvalCurrent,
    showStaleWarning: staleApproval || staleGovernedLifecycle,
    showRecommended: governance.recommended,
  };
}
