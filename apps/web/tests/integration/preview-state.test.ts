import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolvePreviewActive } from '@/lib/preview-access';

/**
 * 027 T021 — contracts/preview-route.md §D, research R5. Preview is active only with draft mode on
 * AND a FRESH contributor+ role; everything else fails closed. The role is read from the `users`
 * collection on every call, so a role removed mid-preview takes effect on the next request.
 */
let payload: Payload;
const testId = 'preview-state-0001';
const users: Record<'reader' | 'contributor', { id: number; role: Role }> = {} as never;

async function makeUser(role: Role) {
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
  return { id: doc.id, role: doc.role as Role };
}

async function cleanup() {
  const existing = await payload.find({
    collection: 'users',
    where: { entraOid: { like: `test-oid-${testId}%` } },
    limit: 100,
    overrideAccess: true,
  });
  const ids = existing.docs.map((d) => d.id);
  if (!ids.length) return;
  // The role downgrade below writes an audit-log row whose `actor` is NOT NULL, so it must go first.
  await payload.delete({
    collection: 'audit-log',
    where: { or: [{ actor: { in: ids } }, { targetUser: { in: ids } }] },
    overrideAccess: true,
  });
  await payload.delete({ collection: 'users', where: { id: { in: ids } }, overrideAccess: true });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanup();
  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');
}, 120000);

afterAll(async () => {
  if (payload) await cleanup();
});

describe('resolvePreviewActive', () => {
  it('is false when draft mode is off, even for a contributor', async () => {
    expect(
      await resolvePreviewActive({ draftModeEnabled: false, userId: users.contributor.id }, payload),
    ).toBe(false);
  });

  it('is true for a contributor with draft mode on (string id from the session works)', async () => {
    expect(
      await resolvePreviewActive({ draftModeEnabled: true, userId: String(users.contributor.id) }, payload),
    ).toBe(true);
  });

  it('is false for a reader holding a draft-mode cookie', async () => {
    expect(
      await resolvePreviewActive({ draftModeEnabled: true, userId: users.reader.id }, payload),
    ).toBe(false);
  });

  it.each([null, undefined, '', '999999999', 'not-a-number'])(
    'is false for a missing/unknown user id %j (fail closed)',
    async (userId) => {
      expect(await resolvePreviewActive({ draftModeEnabled: true, userId }, payload)).toBe(false);
    },
  );

  it('stops on the next call once the role is downgraded to reader', async () => {
    const editor = await makeUser('approver');
    const admin = await makeUser('admin');
    expect(await resolvePreviewActive({ draftModeEnabled: true, userId: editor.id }, payload)).toBe(true);
    // Only an Admin may change a role (Users hook), so the downgrade is made as one.
    await payload.update({
      collection: 'users',
      id: editor.id,
      data: { role: 'reader' },
      overrideAccess: true,
      user: { ...admin, collection: 'users' } as never,
    });
    expect(await resolvePreviewActive({ draftModeEnabled: true, userId: editor.id }, payload)).toBe(false);
  });

  it('is false when the lookup throws', async () => {
    const broken = {
      findByID: () => {
        throw new Error('db down');
      },
    } as unknown as Payload;
    expect(await resolvePreviewActive({ draftModeEnabled: true, userId: 1 }, broken)).toBe(false);
  });
});
