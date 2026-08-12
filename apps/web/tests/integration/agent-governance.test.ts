import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * 015 US2 / T024 — governance is type-blind: an agent-typed artifact runs the identical full
 * cycle as review-approval-flow.test.ts proves for a skill — submit, typed review, approval,
 * lifecycle transition — with role gating enforced and every step audited (SC-004).
 */
let payload: Payload;
const testId = 'agent-gov-0001';
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
    await payload.delete({ collection: 'reviews', where: { artifact: { in: artifactIds } }, overrideAccess: true });
    await payload.delete({ collection: 'catalog-entries', where: { artifact: { in: artifactIds } }, overrideAccess: true });
  }
  if (userIds.length) {
    await payload.delete({ collection: 'users', where: { id: { in: userIds } }, overrideAccess: true });
  }
  if (artifactIds.length) {
    await payload.delete({ collection: 'artifacts', where: { id: { in: artifactIds } }, overrideAccess: true });
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
      type: 'agent',
      name: 'Governed agent fixture',
      description: 'Agent-typed fixture for the governance-parity cycle.',
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

describe('agents get the identical governance cycle (015 T024)', () => {
  it('role gating holds for agents: a Reader cannot review or approve', async () => {
    await expect(
      payload.create({
        collection: 'reviews',
        data: { artifact: artifactId, type: 'security', expiryDate: '2027-01-01T00:00:00.000Z' },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('runs submit → typed review → approve → lifecycle transition, fully audited', async () => {
    const entry = await payload.create({
      collection: 'catalog-entries',
      data: { artifact: artifactId, lifecycleState: 'draft' },
      overrideAccess: true,
    });

    await payload.update({
      collection: 'catalog-entries',
      id: entry.id,
      data: { lifecycleState: 'experimental' },
      overrideAccess: false,
      user: users.contributor,
    });
    const submitted = await payload.update({
      collection: 'catalog-entries',
      id: entry.id,
      data: { lifecycleState: 'in-review', reviewStatus: 'in-review' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(submitted.lifecycleState).toBe('in-review');

    const review = await payload.create({
      collection: 'reviews',
      data: {
        artifact: artifactId,
        type: 'responsible-ai',
        decision: 'approved',
        comments: 'Agent behaviour documented and bounded.',
        riskLevel: 'medium',
        expiryDate: '2027-01-01T00:00:00.000Z',
      },
      overrideAccess: false,
      user: users.reviewer,
    });
    expect(review.decision).toBe('approved');

    const approved = await payload.update({
      collection: 'catalog-entries',
      id: entry.id,
      data: { approvalState: 'approved' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(approved.approvalState).toBe('approved');

    const promoted = await payload.update({
      collection: 'catalog-entries',
      id: entry.id,
      data: { lifecycleState: 'approved' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(promoted.lifecycleState).toBe('approved');

    const audit = await payload.find({
      collection: 'audit-log',
      where: { artifact: { equals: artifactId } },
      overrideAccess: true,
      limit: 100,
    });
    const actions = audit.docs.map((d) => d.action);
    expect(actions).toContain('lifecycle-transition');
    expect(actions).toContain('review-recorded');
    expect(actions).toContain('approval-decision');
  });
});
