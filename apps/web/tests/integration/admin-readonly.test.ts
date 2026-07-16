import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * T008 (US2, FR-006a, Principle I) — proves the back-office read-only matrix holds via the
 * existing per-collection `access` rules, not any Phase 6 code. Even with an Admin `req.user`,
 * writes to the Git-derived/system collections (`artifacts`, `discovery-runs`, `audit-log`) are
 * rejected, while permitted writes to `catalog-entries`, `reviews`, and `discovery-sources`
 * succeed. Uses the Payload Local API with `overrideAccess: false` + explicit `user`, exactly the
 * enforcement path the admin's REST/GraphQL API takes — so a bypassed UI cannot escape it.
 */
let payload: Payload;
const testId = 'admin-ro-0001';
type Doc = { id: number; role: Role };
let admin: Doc;
let artifactId: number;

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
  await payload.delete({
    collection: 'discovery-sources',
    where: { name: { equals: `Source ${testId}` } },
    overrideAccess: true,
  });
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

  const adminDoc = await payload.create({
    collection: 'users',
    data: {
      entraOid: `test-oid-${testId}-admin`,
      email: `admin.${testId}@digdir.no`,
      name: 'Test Admin',
      tenantId: '00000000-0000-0000-0000-000000000000',
      role: 'admin',
    },
    overrideAccess: true,
  });
  admin = { id: adminDoc.id, role: adminDoc.role as Role };

  const artifact = await payload.create({
    collection: 'artifacts',
    data: {
      artifactId: `digdir.${testId}`,
      type: 'skill',
      name: 'Read-only matrix test artifact',
      description: 'Fixture for T008.',
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

describe('back-office read-only matrix (T008, FR-006a, Principle I)', () => {
  it('rejects create on artifacts even for an Admin (Git-owned, read-only)', async () => {
    await expect(
      payload.create({
        collection: 'artifacts',
        data: {
          artifactId: `digdir.${testId}.hand-added`,
          type: 'skill',
          name: 'Should not persist',
          description: 'x',
          version: '1.0.0',
          active: true,
        },
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow();
  });

  it('rejects update on artifacts even for an Admin', async () => {
    await expect(
      payload.update({
        collection: 'artifacts',
        id: artifactId,
        data: { name: 'Renamed by hand' },
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow();
  });

  it('rejects create on discovery-runs even for an Admin (append-only, server-side)', async () => {
    await expect(
      payload.create({
        collection: 'discovery-runs',
        data: { source: `Source ${testId}`, outcome: 'success' } as never,
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow();
  });

  it('rejects create on audit-log even for an Admin (immutable, server-side)', async () => {
    await expect(
      payload.create({
        collection: 'audit-log',
        data: { actor: admin.id, action: 'role-change' } as never,
        overrideAccess: false,
        user: admin,
      }),
    ).rejects.toThrow();
  });

  it('allows an Admin to create a catalog-entries record (editable)', async () => {
    const doc = await payload.create({
      collection: 'catalog-entries',
      data: { artifact: artifactId, lifecycleState: 'draft', businessOwner: 'AI Enablement' },
      overrideAccess: false,
      user: admin,
    });
    expect(doc.lifecycleState).toBe('draft');
  });

  it('allows an Admin to create a reviews record (editable)', async () => {
    const doc = await payload.create({
      collection: 'reviews',
      data: {
        artifact: artifactId,
        type: 'security',
        expiryDate: '2027-01-01T00:00:00.000Z',
      },
      overrideAccess: false,
      user: admin,
    });
    expect(doc.type).toBe('security');
  });

  it('allows an Admin to create a discovery-sources record (editable)', async () => {
    const doc = await payload.create({
      collection: 'discovery-sources',
      data: {
        name: `Source ${testId}`,
        repo: 'digdir/ai-artifacts',
        tokenEnvVar: 'GITHUB_TOKEN',
        webhookSecret: 'test-secret-value',
      },
      overrideAccess: false,
      user: admin,
    });
    expect(doc.name).toBe(`Source ${testId}`);
  });
});
