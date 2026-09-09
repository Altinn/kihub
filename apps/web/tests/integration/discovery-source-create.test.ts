import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import type { RequiredDataFromCollectionSlug } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Regression (surfaced in production 2026-09-09): `webhookSecret` is required but hidden AND
 * unreadable, so the /cms create form can never supply it — every admin-UI create failed with
 * "The following field is invalid: Webhook Secret". The field now auto-generates on create.
 */
let payload: Payload;
const NAME = 'itest-autogen-secret-source';

async function wipeOwn() {
  await payload.delete({
    collection: 'discovery-sources',
    where: { name: { equals: NAME } },
    overrideAccess: true,
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await wipeOwn();
}, 120000);

afterAll(async () => {
  await wipeOwn();
});

describe('discovery-source create', () => {
  it('auto-generates webhookSecret when absent (the admin-form path)', async () => {
    // The admin form omits hidden fields entirely — the cast simulates exactly that payload.
    const data = {
      name: NAME,
      repo: 'digdir/ai-artifacts',
      tokenEnvVar: 'ITEST_NO_TOKEN',
      enabled: false,
    } as RequiredDataFromCollectionSlug<'discovery-sources'>;
    const created = await payload.create({ collection: 'discovery-sources', data, overrideAccess: true });

    // Server-side (overrideAccess, as the webhook route reads it): generated with real entropy.
    const stored = await payload.findByID({
      collection: 'discovery-sources',
      id: created.id,
      overrideAccess: true,
    });
    expect(stored.webhookSecret).toMatch(/^[0-9a-f]{64}$/);

    // Collection access still refuses a non-admin read outright (research §5 unchanged).
    const visible = await payload.findByID({
      collection: 'discovery-sources',
      id: created.id,
      overrideAccess: false,
      user: null,
      disableErrors: true,
    });
    expect(visible).toBeNull();
  });

  it('keeps an explicitly provided webhookSecret', async () => {
    await wipeOwn();
    const created = await payload.create({
      collection: 'discovery-sources',
      data: {
        name: NAME,
        repo: 'digdir/ai-artifacts',
        tokenEnvVar: 'ITEST_NO_TOKEN',
        webhookSecret: 'explicit-itest-secret',
        enabled: false,
      },
      overrideAccess: true,
    });
    const stored = await payload.findByID({
      collection: 'discovery-sources',
      id: created.id,
      overrideAccess: true,
    });
    expect(stored.webhookSecret).toBe('explicit-itest-secret');
  });
});
