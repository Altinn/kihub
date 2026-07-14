import type { LifecycleState, ReviewType } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { auth } from '@/auth';
import type { Artifact, CatalogEntry, Review, User } from '@/payload-types';

/**
 * Resolve the acting user's *live* Payload doc (never the JWT-cached session claim) so every
 * governance access decision reads the current `role` — research.md §2. Returns `null` when
 * there is no established session (callers gated by `requireSession` should not normally hit this).
 */
export async function getCurrentActor(): Promise<User | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const payload = await getPayload({ config });
  try {
    return await payload.findByID({ collection: 'users', id: session.user.id, overrideAccess: true });
  } catch {
    return null;
  }
}

async function payloadClient() {
  return getPayload({ config });
}

async function requireArtifactDoc(payload: Payload, artifactId: string): Promise<Artifact> {
  const result = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    limit: 1,
    overrideAccess: true,
  });
  const doc = result.docs[0];
  if (!doc) throw new Error(`Unknown artifact: ${artifactId}`);
  return doc;
}

async function findCatalogEntry(payload: Payload, artifactDocId: number): Promise<CatalogEntry | null> {
  const result = await payload.find({
    collection: 'catalog-entries',
    where: { artifact: { equals: artifactDocId } },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
}

/** Create the `catalog-entries` row the first time it's actually needed (research.md §6). */
async function getOrCreateCatalogEntry(payload: Payload, artifact: Artifact, actor: User): Promise<CatalogEntry> {
  const existing = await findCatalogEntry(payload, artifact.id);
  if (existing) return existing;
  return payload.create({
    collection: 'catalog-entries',
    data: {
      artifact: artifact.id,
      lifecycleState: (artifact.lifecycleStatus as LifecycleState | undefined) ?? 'draft',
    },
    overrideAccess: false,
    user: actor,
  });
}

/** Governance state for one artifact — either a persisted record, or a computed default (SC-003). */
export interface Governance {
  /** `null` when no `catalog-entries` doc has been created yet — a default, not an error. */
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
}

function toGovernance(entry: CatalogEntry): Governance {
  return {
    id: entry.id,
    lifecycleState: entry.lifecycleState,
    reviewStatus: entry.reviewStatus ?? 'not-submitted',
    approvalState: entry.approvalState ?? 'not-approved',
    recommended: entry.recommended ?? false,
    featured: entry.featured ?? false,
    businessOwner: entry.businessOwner ?? null,
    technicalOwner: entry.technicalOwner ?? null,
    riskLevel: entry.riskLevel ?? null,
    internalNotes: entry.internalNotes ?? null,
  };
}

function defaultGovernance(artifact: Artifact): Governance {
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
  };
}

/**
 * Read governance state for an artifact, or `null` if the artifact itself is unknown/inactive.
 * Never creates a `catalog-entries` row — a never-governed artifact gets a computed default
 * (edge case "No governance record yet", research.md §6).
 */
export async function getGovernance(artifactId: string): Promise<Governance | null> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId }, active: { equals: true } },
    limit: 1,
    overrideAccess: true,
  });
  const artifact = result.docs[0];
  if (!artifact) return null;

  const entry = await findCatalogEntry(payload, artifact.id);
  return entry ? toGovernance(entry) : defaultGovernance(artifact);
}

/** Owners/risk/notes/featured — Contributor+ (edit-metadata). Creates the record lazily. */
export async function updateGovernanceMetadata(
  artifactId: string,
  patch: Partial<Pick<Governance, 'businessOwner' | 'technicalOwner' | 'riskLevel' | 'internalNotes' | 'featured'>>,
  actor: User,
): Promise<Governance> {
  const payload = await payloadClient();
  const artifact = await requireArtifactDoc(payload, artifactId);
  const entry = await getOrCreateCatalogEntry(payload, artifact, actor);
  const updated = await payload.update({
    collection: 'catalog-entries',
    id: entry.id,
    data: patch,
    overrideAccess: false,
    user: actor,
  });
  return toGovernance(updated);
}

/**
 * FR-013: move the artifact into "in review". Advances Draft→Experimental→In Review one step at
 * a time (each step re-validated by `canTransition` in the collection hook) rather than jumping
 * stages, so a Contributor's single "submit for review" action still respects the linear FSM.
 */
export async function submitForReview(artifactId: string, actor: User): Promise<Governance> {
  const payload = await payloadClient();
  const artifact = await requireArtifactDoc(payload, artifactId);
  let entry = await getOrCreateCatalogEntry(payload, artifact, actor);

  if (entry.lifecycleState === 'draft') {
    entry = await payload.update({
      collection: 'catalog-entries',
      id: entry.id,
      data: { lifecycleState: 'experimental' },
      overrideAccess: false,
      user: actor,
    });
  }
  if (entry.lifecycleState === 'experimental') {
    entry = await payload.update({
      collection: 'catalog-entries',
      id: entry.id,
      data: { lifecycleState: 'in-review', reviewStatus: 'in-review' },
      overrideAccess: false,
      user: actor,
    });
    return toGovernance(entry);
  }

  const updated = await payload.update({
    collection: 'catalog-entries',
    id: entry.id,
    data: { reviewStatus: 'in-review' },
    overrideAccess: false,
    user: actor,
  });
  return toGovernance(updated);
}

/** Generic lifecycle transition entry point (Approved/Recommended/Deprecated/Archived, etc.). */
export async function transitionLifecycle(
  artifactId: string,
  to: LifecycleState,
  actor: User,
): Promise<Governance> {
  const payload = await payloadClient();
  const artifact = await requireArtifactDoc(payload, artifactId);
  const entry = await getOrCreateCatalogEntry(payload, artifact, actor);
  const updated = await payload.update({
    collection: 'catalog-entries',
    id: entry.id,
    data: { lifecycleState: to },
    overrideAccess: false,
    user: actor,
  });
  return toGovernance(updated);
}

export interface ReviewInput {
  type: ReviewType;
  decision: 'approved' | 'changes-requested' | 'rejected';
  comments?: string | null;
  requiredChanges?: string | null;
  riskLevel?: 'low' | 'medium' | 'high' | null;
  expiryDate: string;
}

/** FR-014–FR-016: a Reviewer (or higher) records a typed review. */
export async function recordReview(artifactId: string, input: ReviewInput, actor: User): Promise<Review> {
  const payload = await payloadClient();
  const artifact = await requireArtifactDoc(payload, artifactId);
  return payload.create({
    collection: 'reviews',
    data: {
      artifact: artifact.id,
      type: input.type,
      status: 'completed',
      decision: input.decision,
      comments: input.comments ?? undefined,
      requiredChanges: input.requiredChanges ?? undefined,
      riskLevel: input.riskLevel ?? undefined,
      expiryDate: input.expiryDate,
    },
    overrideAccess: false,
    user: actor,
  });
}

/**
 * FR-016/FR-017: an Approver's final decision. Advisory with respect to typed reviews (clarified) —
 * proceeds regardless of the status of individual reviews; they inform but never hard-block it.
 */
export async function decideApproval(
  artifactId: string,
  decision: 'approved' | 'rejected',
  actor: User,
): Promise<Governance> {
  const payload = await payloadClient();
  const artifact = await requireArtifactDoc(payload, artifactId);
  const entry = await getOrCreateCatalogEntry(payload, artifact, actor);
  const updated = await payload.update({
    collection: 'catalog-entries',
    id: entry.id,
    data: { approvalState: decision },
    overrideAccess: false,
    user: actor,
  });
  return toGovernance(updated);
}

/** Review history for an artifact, newest first (FR-016 "visible in the artifact's review history"). */
export async function listReviews(artifactId: string): Promise<Review[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    limit: 1,
    overrideAccess: true,
  });
  const artifact = result.docs[0];
  if (!artifact) return [];

  const reviews = await payload.find({
    collection: 'reviews',
    where: { artifact: { equals: artifact.id } },
    sort: '-reviewDate',
    limit: 100,
    overrideAccess: true,
  });
  return reviews.docs;
}

export interface AuditEntry {
  id: number;
  actor: string;
  action: string;
  createdAt: string;
  details: unknown;
}

/** Audit history for an artifact, newest first (FR-019). */
export async function listAuditLog(artifactId: string): Promise<AuditEntry[]> {
  const payload = await payloadClient();
  const result = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: artifactId } },
    limit: 1,
    overrideAccess: true,
  });
  const artifact = result.docs[0];
  if (!artifact) return [];

  const entries = await payload.find({
    collection: 'audit-log',
    where: { artifact: { equals: artifact.id } },
    sort: '-createdAt',
    limit: 100,
    overrideAccess: true,
    depth: 1,
  });
  return entries.docs.map((d) => ({
    id: d.id,
    actor: typeof d.actor === 'object' && d.actor ? (d.actor.email ?? String(d.actor.id)) : String(d.actor),
    action: d.action,
    createdAt: d.createdAt,
    details: d.details,
  }));
}
