import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { auth } from '@/auth';
import type { CatalogEntry, Review, User } from '@/payload-types';
import { defaultGovernance, toGovernance, type Governance } from './governance-view';

export {
  isApprovalCurrent,
  reviewIsOlderRevision,
  toGovernance,
  type Governance,
} from './governance-view';

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

async function findCatalogEntry(payload: Payload, artifactDocId: number): Promise<CatalogEntry | null> {
  const result = await payload.find({
    collection: 'catalog-entries',
    where: { artifact: { equals: artifactDocId } },
    limit: 1,
    overrideAccess: true,
  });
  return result.docs[0] ?? null;
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
  return entry ? toGovernance(entry, artifact) : defaultGovernance(artifact);
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
