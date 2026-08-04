import config from '@payload-config';
import type { RepoReader } from '@kihub/discovery-core';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runDiscovery, triggerDiscovery } from '@/lib/discovery';
import type { User } from '@/payload-types';

/**
 * T019 — discovery operations are Admin-only, enforced server-side (FR-013, SC-008): a non-Admin
 * cannot trigger a run, cannot create/update a source, and cannot read runs; an Admin can.
 */
let payload: Payload;
let sourceId: number;
let admin: User;
let contributor: User;

const reader: RepoReader = {
  async listArtifactDirs() {
    return [];
  },
  async readFile() {
    return undefined;
  },
};

async function wipe() {
  await payload.delete({ collection: 'discovery-runs', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({ collection: 'discovery-sources', where: { id: { exists: true } }, overrideAccess: true });
  await payload.delete({
    collection: 'users',
    where: { email: { in: ['disc-admin@digdir.no', 'disc-contrib@digdir.no'] } },
    overrideAccess: true,
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipe();
  admin = await payload.create({
    collection: 'users',
    data: { entraOid: 'disc-admin-oid', email: 'disc-admin@digdir.no', role: 'admin' },
    overrideAccess: true,
  });
  contributor = await payload.create({
    collection: 'users',
    data: { entraOid: 'disc-contrib-oid', email: 'disc-contrib@digdir.no', role: 'contributor' },
    overrideAccess: true,
  });
  const source = await payload.create({
    collection: 'discovery-sources',
    data: {
      name: 'access-source',
      repo: 'digdir/ai-artifacts',
      tokenEnvVar: 'ACCESS_ITEST_NO_TOKEN',
      webhookSecret: 'itest-secret',
      enabled: true,
    },
    overrideAccess: true,
  });
  sourceId = source.id;
}, 120000);

afterAll(async () => {
  if (payload) await wipe();
});

describe('discovery access control (T019)', () => {
  it('refuses a manual trigger by a non-Admin, and allows an Admin', async () => {
    await expect(triggerDiscovery(payload, sourceId, contributor)).rejects.toThrow(/Admin/);
    await expect(triggerDiscovery(payload, sourceId, null)).rejects.toThrow(/Admin/);

    const result = await triggerDiscovery(payload, sourceId, admin, { createReader: () => reader });
    expect(result.outcome).toBe('success'); // empty reader → clean run
  });

  it('refuses a non-Admin creating or updating a discovery source (Payload access)', async () => {
    await expect(
      payload.create({
        collection: 'discovery-sources',
        data: {
          name: 'sneaky',
          repo: 'x/y',
          tokenEnvVar: 'T',
          webhookSecret: 's',
          enabled: true,
        },
        overrideAccess: false,
        user: contributor,
      }),
    ).rejects.toThrow();

    await expect(
      payload.update({
        collection: 'discovery-sources',
        id: sourceId,
        data: { enabled: false },
        overrideAccess: false,
        user: contributor,
      }),
    ).rejects.toThrow();
  });

  it('refuses a non-Admin reading discovery runs, and allows an Admin', async () => {
    await runDiscovery(payload, sourceId, 'scheduled', { createReader: () => reader });

    // A non-Admin read is refused outright (Payload throws Forbidden), not silently emptied.
    await expect(
      payload.find({ collection: 'discovery-runs', overrideAccess: false, user: contributor }),
    ).rejects.toThrow();

    const asAdmin = await payload.find({
      collection: 'discovery-runs',
      overrideAccess: false,
      user: admin,
    });
    expect(asAdmin.totalDocs).toBeGreaterThan(0);
  });
});
