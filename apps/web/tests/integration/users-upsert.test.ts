import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { IdentityClaims } from '@/auth/claims';
import { upsertUserFromClaims } from '@/auth/upsert-user';

/**
 * T016b — integration test for the only Phase 1 Payload write path: the session -> Users upsert.
 * Requires a live Postgres (DATABASE_URI). Payload's postgres adapter pushes the schema in dev.
 */
let payload: Payload;

const claims: IdentityClaims = {
  oid: 'test-oid-upsert-0001',
  email: 'upsert.test@digdir.no',
  name: 'Upsert Test',
  tid: process.env.ORG_TENANT_ID ?? '00000000-0000-0000-0000-000000000000',
  idtyp: 'member',
};

async function cleanup() {
  await payload.delete({
    collection: 'users',
    where: { entraOid: { equals: claims.oid } },
    overrideAccess: true,
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('Users upsert write path (T016b)', () => {
  it('creates a Users doc on first sign-in, keyed by entraOid with baseline role', async () => {
    const doc = await upsertUserFromClaims(payload, claims);
    expect(doc.entraOid).toBe(claims.oid);
    expect(doc.email).toBe(claims.email);
    expect(doc.role).toBe('reader');
    expect(doc.lastLoginAt).toBeTruthy();
  });

  it('updates the same doc on repeat login (no duplicate)', async () => {
    const first = await upsertUserFromClaims(payload, claims);
    await new Promise((r) => setTimeout(r, 10));
    const second = await upsertUserFromClaims(payload, { ...claims, name: 'Renamed' });

    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Renamed');

    const all = await payload.find({
      collection: 'users',
      where: { entraOid: { equals: claims.oid } },
      overrideAccess: true,
    });
    expect(all.totalDocs).toBe(1);
  });
});
