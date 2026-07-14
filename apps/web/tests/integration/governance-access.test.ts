import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * T013 — proves role-gated access is enforced server-side (FR-003) by calling the Payload
 * Local API directly with `overrideAccess: false` + an explicit `user`, exactly the pattern
 * `lib/governance.ts`'s Server Actions use (research.md §2/§8) — never via the UI (SC-001, SC-002).
 */
let payload: Payload;
const testId = 'gov-access-0001';
type Doc = { id: number; role: Role };
const users: Record<Role, Doc> = {} as never;
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

// Delete order matters: audit-log rows hold FK references to both the test users and the test
// artifact (written by the CatalogEntry/Review/Users hooks), so they must go first.
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
  users.admin = await makeUser('admin');

  const artifact = await payload.create({
    collection: 'artifacts',
    data: {
      artifactId: `digdir.${testId}`,
      type: 'skill',
      name: 'Governance access test artifact',
      description: 'Fixture for T013.',
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

describe('role x action access matrix (T013, SC-001, SC-002)', () => {
  it('Reader cannot create a catalog-entries doc (edit-metadata)', async () => {
    await expect(
      payload.create({
        collection: 'catalog-entries',
        data: { artifact: artifactId, lifecycleState: 'draft' },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('Contributor can create a catalog-entries doc (edit-metadata)', async () => {
    const doc = await payload.create({
      collection: 'catalog-entries',
      data: { artifact: artifactId, lifecycleState: 'draft', businessOwner: 'AI Enablement' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(doc.lifecycleState).toBe('draft');
  });

  it('Contributor can move Draft -> Experimental but not In Review -> Approved', async () => {
    const entry = await payload.find({
      collection: 'catalog-entries',
      where: { artifact: { equals: artifactId } },
      overrideAccess: true,
      limit: 1,
    });
    const id = entry.docs[0]!.id;

    const experimental = await payload.update({
      collection: 'catalog-entries',
      id,
      data: { lifecycleState: 'experimental' },
      overrideAccess: false,
      user: users.contributor,
    });
    expect(experimental.lifecycleState).toBe('experimental');

    await payload.update({
      collection: 'catalog-entries',
      id,
      data: { lifecycleState: 'in-review' },
      overrideAccess: false,
      user: users.contributor,
    });

    await expect(
      payload.update({
        collection: 'catalog-entries',
        id,
        data: { lifecycleState: 'approved' },
        overrideAccess: false,
        user: users.contributor,
      }),
    ).rejects.toThrow(/role-not-permitted/);
  });

  it('Approver can perform In Review -> Approved', async () => {
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
      data: { lifecycleState: 'approved' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(approved.lifecycleState).toBe('approved');
  });

  it('Reader and Contributor cannot record a review; Reviewer and Approver can', async () => {
    const base = {
      artifact: artifactId,
      type: 'security' as const,
      expiryDate: '2027-01-01T00:00:00.000Z',
    };

    await expect(
      payload.create({
        collection: 'reviews',
        data: base,
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();

    await expect(
      payload.create({
        collection: 'reviews',
        data: base,
        overrideAccess: false,
        user: users.contributor,
      }),
    ).rejects.toThrow();

    const byReviewer = await payload.create({
      collection: 'reviews',
      data: base,
      overrideAccess: false,
      user: users.reviewer,
    });
    expect(byReviewer.type).toBe('security');

    const byApprover = await payload.create({
      collection: 'reviews',
      data: { ...base, type: 'technical' },
      overrideAccess: false,
      user: users.approver,
    });
    expect(byApprover.type).toBe('technical');
  });

  it('only an Admin may change another user\'s role (FR-004)', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: users.reader.id,
        data: { role: 'admin' },
        overrideAccess: false,
        user: users.approver,
      }),
    ).rejects.toThrow();

    const updated = await payload.update({
      collection: 'users',
      id: users.reader.id,
      data: { role: 'contributor' },
      overrideAccess: false,
      user: users.admin,
    });
    expect(updated.role).toBe('contributor');
  });
});
