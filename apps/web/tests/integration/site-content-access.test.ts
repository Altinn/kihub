import type { Role } from '@kihub/governance-core';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  getFrontpageContent,
  getSiteChrome,
  mergeFrontpage,
  mergeSiteChrome,
} from '@/lib/site-content';
import { DEFAULT_FRONTPAGE, DEFAULT_SITE_CHROME } from '@/lib/site-content-defaults';

/**
 * T011 (011 foundational, FR-011/012, contracts/site-content-globals.md) — the access matrix and
 * seeded-defaults merge for the two new globals, exercised through the Payload local API with
 * `overrideAccess: false` + an explicit `user` (the same enforcement path the admin/REST API
 * takes). Globals are singletons, so the merge obligations ("unset section → defaults") are
 * asserted through the exported pure merge functions, and the stored globals are restored to the
 * seeded defaults afterwards.
 */
let payload: Payload;
const testId = 'site-content-0001';
type Doc = { id: number; role: Role };
const users: Record<'reader' | 'contributor', Doc> = {} as never;

async function makeUser(role: Doc['role']): Promise<Doc> {
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

async function cleanupUsers() {
  const existing = await payload.find({
    collection: 'users',
    where: { entraOid: { like: `test-oid-${testId}%` } },
    limit: 100,
    overrideAccess: true,
  });
  if (existing.docs.length) {
    await payload.delete({
      collection: 'users',
      where: { id: { in: existing.docs.map((d) => d.id) } },
      overrideAccess: true,
    });
  }
}

/** Reset both globals to the seeded defaults so tests leave no editor content behind. */
async function restoreDefaults() {
  await payload.updateGlobal({
    slug: 'site-chrome',
    data: DEFAULT_SITE_CHROME as never,
    overrideAccess: true,
  });
  await payload.updateGlobal({
    slug: 'frontpage',
    data: DEFAULT_FRONTPAGE as never,
    overrideAccess: true,
  });
}

beforeAll(async () => {
  payload = await getPayload({ config });
  await cleanupUsers();
  users.reader = await makeUser('reader');
  users.contributor = await makeUser('contributor');
}, 120000);

afterAll(async () => {
  if (payload) {
    await restoreDefaults();
    await cleanupUsers();
  }
});

describe('globals access matrix (FR-011, Principle VIII)', () => {
  it('refuses a reader updating site-chrome', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'site-chrome',
        data: { nav: [{ label: 'Hacked', href: '/x' }] },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('refuses a reader updating frontpage', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'frontpage',
        data: { hero: { heading: 'Hacked' } },
        overrideAccess: false,
        user: users.reader,
      }),
    ).rejects.toThrow();
  });

  it('lets a contributor update site-chrome, and the read lib returns the stored value', async () => {
    await payload.updateGlobal({
      slug: 'site-chrome',
      data: { nav: [{ label: `Testnav ${testId}`, href: '/registry' }] },
      overrideAccess: false,
      user: users.contributor,
    });
    const chrome = await getSiteChrome();
    expect(chrome.nav.map((n) => n.label)).toContain(`Testnav ${testId}`);
  });

  it('lets a contributor update frontpage, and the read lib returns the stored value', async () => {
    await payload.updateGlobal({
      slug: 'frontpage',
      data: { hero: { heading: `Testheading ${testId}` } },
      overrideAccess: false,
      user: users.contributor,
    });
    const content = await getFrontpageContent();
    expect(content.hero.heading).toBe(`Testheading ${testId}`);
  });
});

describe('seeded-defaults merge (FR-012)', () => {
  it('returns the complete defaults when nothing is stored', () => {
    expect(mergeSiteChrome(null)).toEqual(DEFAULT_SITE_CHROME);
    expect(mergeFrontpage(null)).toEqual(DEFAULT_FRONTPAGE);
  });

  it('merges per-section: a stored nav leaves the footer defaults intact', () => {
    const merged = mergeSiteChrome({ nav: [{ label: 'Custom', href: '/custom' }] });
    expect(merged.nav).toEqual([{ label: 'Custom', href: '/custom' }]);
    expect(merged.footer).toEqual(DEFAULT_SITE_CHROME.footer);
  });

  it('merges per-section: a stored footer leaves the nav defaults intact', () => {
    const merged = mergeSiteChrome({
      footer: { contactLabel: 'Skriv til oss:', contactEmail: 'x@digdir.no', links: [] },
    });
    expect(merged.nav).toEqual(DEFAULT_SITE_CHROME.nav);
    expect(merged.footer.contactLabel).toBe('Skriv til oss:');
    expect(merged.footer.contactEmail).toBe('x@digdir.no');
  });

  it('merges per-section on the frontpage: stored hero, default tiles + subscriptions', () => {
    const merged = mergeFrontpage({ hero: { heading: 'Egen tittel' } });
    expect(merged.hero.heading).toBe('Egen tittel');
    expect(merged.tiles).toEqual(DEFAULT_FRONTPAGE.tiles);
    expect(merged.subscriptions).toEqual(DEFAULT_FRONTPAGE.subscriptions);
  });

  it('falls back to default tiles unless exactly two stored tiles exist', () => {
    const one = mergeFrontpage({
      tiles: [{ tag: 'T', title: 'Ett', href: '/a', variant: 'tinted' }],
    });
    expect(one.tiles).toEqual(DEFAULT_FRONTPAGE.tiles);
  });

  it('every section is non-empty through the real read path (fresh env or stored)', async () => {
    const chrome = await getSiteChrome();
    const content = await getFrontpageContent();
    expect(chrome.nav.length).toBeGreaterThan(0);
    expect(chrome.footer.contactEmail).toBeTruthy();
    expect(content.hero.heading).toBeTruthy();
    expect(content.tiles).toHaveLength(2);
    expect(content.subscriptions.chips.length).toBeGreaterThan(0);
  });
});
