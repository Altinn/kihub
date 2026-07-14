import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * T025 — full submit → typed review → approve/reject flow (FR-013–FR-020, SC-006–SC-008),
 * exercised via the Payload layer exactly as `lib/governance.ts`'s Server Actions call it
 * (`overrideAccess: false` + an explicit `user`).
 */
let payload: Payload;
const testId = 'review-flow-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor' | 'reviewer' | 'approver', Doc> = {} as never;
let artifactId: number;

async function makeUser(role: Doc['role']) {
  const doc = await payload.create({
    collection: 'users',
    data: {
      entraOid: `test-oid-${testId}-${role}`,
      email: `${role}.${testId}@digdir.no`,
      name: `Test ${role}`,
      tenantId: '00000000-0000-0000-0000-000000000000',
      role,
    },
    overrideAccess: true,
  });
  return { id: doc.id, role: doc.role } as Doc;
}

async function cleanup() {
  const existingUsers = await payload.find({
    collection: 'users',
    where: { entraOid: { like: `test-oid-${testId}%` } },
    limit: 100,
    overrideAccess: true,
  });
  const userIds = existingUsers.docs.map((d) => d.id);

  const existingArtifacts = await payload.find({
    collection: 'artifacts',
    where: { artifactId: { equals: `digdir.${testId}` } },
    limit: 1,
    overrideAccess: true,
  });
  const artifactIds = existingArtifacts.docs.map((d) => d.id);

  if (userIds.length || artifactIds.length) {
    await payload.delete({
      collection: 'audit-log',
      where: {
        or: [
          ...(userIds.length ? [{ actor: { in: userIds } }, { targetUser: { in: userIds } }] : []),
          ...(artifactIds.length ? [{ artifact: { in: artifactIds } }] : []),
        ],
      },
      overrideAccess: true,
    });
  }
  if (artifactIds.length) {
    await payload.delete({
      collection: 'reviews',
      where: { artifact: { in: artifactIds } },
      overrideAccess: true,
    });
    await payload.delete({
      collection: 'catalog-entries',
      where: { artifact: { in: artifactIds } },
      overrideAccess: true,
    });
  }
  if (userIds.length) {
    await payload.delete({ collection: 'users', where: { id: { in: userIds } }, overrideAccess: true });
  }
  if (artifactIds.length) {
    await payload.delete({
      collection: 'artifacts',
      where: { id: { in: artifactIds } },
      overrideAccess: true,
    });
  }
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();

  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');
  users.reviewer = await makeUser('reviewer');
  users.approver = await makeUser('approver');

  const artifact = await payload.create({
    collection: 'artifacts',
    data: {
      artifactId: `digdir.${testId}`,
      type: 'skill',
      name: 'Review flow test artifact',
      description: 'Fixture for T025.',
      version: '1.0.0',
      active: true,
    },
    overrideAccess: true,
  });
  artifactId = artifact.id;
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('submit -> review -> approve/reject flow (T025)', () => {
  it('Reader cannot record a review or approve', async () => {
    await expect(
      payload.create({
        collection: 'reviews',
        data: { artifact: artifactId, type: 'security', expiryDate: '2027-01-01T00:00:00.000Z' },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();

    const entry = await payload.create({
      collection: 'catalog-entries',
      data: { artifact: artifactId, lifecycleState: 'draft' },
      overrideAccess: true,
    });
    await expect(
      payload.update({
        collection: 'catalog-entries',
        id: entry.id,
        data: { approvalState: 'approved' },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('Contributor submits for review, moving reviewStatus to in-review', async () => {
    const entry = await payload.find({
      collection: 'catalog-entries',
      where: { artifact: { equals: artifactId } },
      overrideAccess: true,
      limit: 1,
    });
    const id = entry.docs[0]!.id;

    await payload.update({
      collection: 'catalog-entries',
      id,
      data: { lifecycleState: 'experimental' },
      overrideAccess: false,
      user: users.contributor,
    });
    const submitted = await payload.update({
      collection: 'catalog-entries',
      id,
      data: { lifecycleState: 'in-review', reviewStatus: 'in-review' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(submitted.reviewStatus).toBe('in-review');
    expect(submitted.lifecycleState).toBe('in-review');
  });

  it('Reviewer records a typed review with a changes-requested decision, attributed + dated', async () => {
    const review = await payload.create({
      collection: 'reviews',
      data: {
        artifact: artifactId,
        type: 'security',
        decision: 'changes-requested',
        comments: 'Please add rate limiting.',
        requiredChanges: 'Add rate limiting to the public endpoint.',
        riskLevel: 'medium',
        expiryDate: '2027-01-01T00:00:00.000Z',
      },
      overrideAccess: false,
      user: users.reviewer,
    });
    expect(review.decision).toBe('changes-requested');
    expect((review.reviewer as { id: unknown }).id ?? review.reviewer).toBe(users.reviewer.id);
    expect(review.reviewDate).toBeTruthy();
  });

  it('Approver approves despite the changes-requested review (advisory policy, FR-017)', async () => {
    const entry = await payload.find({
      collection: 'catalog-entries',
      where: { artifact: { equals: artifactId } },
      overrideAccess: true,
      limit: 1,
    });
    const id = entry.docs[0]!.id;

    const approved = await payload.update({
      collection: 'catalog-entries',
      id,
      data: { approvalState: 'approved' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(approved.approvalState).toBe('approved');

    // Approved lifecycle transition now permitted for the Approver.
    const promoted = await payload.update({
      collection: 'catalog-entries',
      id,
      data: { lifecycleState: 'approved' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(promoted.lifecycleState).toBe('approved');
  });

  it('a rejected decision does not become approved and every step is audited', async () => {
    const entry = await payload.find({
      collection: 'catalog-entries',
      where: { artifact: { equals: artifactId } },
      overrideAccess: true,
      limit: 1,
    });
    const id = entry.docs[0]!.id;

    const rejected = await payload.update({
      collection: 'catalog-entries',
      id,
      data: { approvalState: 'rejected' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(rejected.approvalState).toBe('rejected');

    const auditEntries = await payload.find({
      collection: 'audit-log',
      where: { artifact: { equals: artifactId } },
      overrideAccess: true,
      limit: 100,
    });
    const actions = auditEntries.docs.map((d) => d.action);
    expect(actions).toContain('lifecycle-transition');
    expect(actions).toContain('review-recorded');
    expect(actions).toContain('approval-decision');
  });
});
