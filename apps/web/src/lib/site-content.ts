import config from '@payload-config';
import { getPayload } from 'payload';
import type {
  Frontpage as FrontpageGlobal,
  SiteChrome as SiteChromeGlobal,
} from '@/payload-types';
import {
  DEFAULT_FRONTPAGE,
  DEFAULT_SITE_CHROME,
  type Chip,
  type FrontpageContent,
  type NavItem,
  type SiteChrome,
  type Tile,
} from './site-content-defaults';

export type { Cta, FrontpageContent, NavItem, SiteChrome, Tile } from './site-content-defaults';

/**
 * 011 frontpage — the ONLY read path for the `site-chrome` and `frontpage` globals
 * (contracts/site-content-globals.md). Components/pages never call `findGlobal` directly: the
 * per-section fallback merge here is what guarantees a fresh environment renders a complete
 * frontpage (FR-012). Merge rule: a section that has been saved with content is used as stored
 * ("you own all of it"); an unset/empty section falls back to the seeded defaults wholesale.
 * The merge functions are pure and exported for the integration test.
 */
async function payloadClient() {
  return getPayload({ config });
}

type StoredChrome = Partial<Pick<SiteChromeGlobal, 'nav' | 'footer'>> | null | undefined;
type StoredFrontpage =
  | Partial<Pick<FrontpageGlobal, 'hero' | 'tiles' | 'subscriptions'>>
  | null
  | undefined;

/** Merge a stored `site-chrome` doc (or nothing) with the seeded defaults, per section. */
export function mergeSiteChrome(doc: StoredChrome): SiteChrome {
  const nav: NavItem[] = doc?.nav?.length
    ? doc.nav.map((item) => ({ label: item.label, href: item.href }))
    : DEFAULT_SITE_CHROME.nav;
  const footer =
    doc?.footer && (doc.footer.contactEmail || doc.footer.links?.length)
      ? {
          contactLabel: doc.footer.contactLabel ?? '',
          contactEmail: doc.footer.contactEmail ?? '',
          links: (doc.footer.links ?? []).map((l) => ({ label: l.label, href: l.href })),
        }
      : DEFAULT_SITE_CHROME.footer;
  return { nav, footer };
}

/** Merge a stored `frontpage` doc (or nothing) with the seeded defaults, per section. */
export function mergeFrontpage(doc: StoredFrontpage): FrontpageContent {
  const hero = doc?.hero?.heading
    ? {
        eyebrow: doc.hero.eyebrow ?? '',
        heading: doc.hero.heading,
        accentWord: doc.hero.accentWord ?? undefined,
        lead: doc.hero.lead ?? '',
        primaryCta: doc.hero.primaryCta?.label
          ? { label: doc.hero.primaryCta.label, href: doc.hero.primaryCta.href ?? '/' }
          : undefined,
        secondaryCta: doc.hero.secondaryCta?.label
          ? { label: doc.hero.secondaryCta.label, href: doc.hero.secondaryCta.href ?? '/' }
          : undefined,
      }
    : DEFAULT_FRONTPAGE.hero;

  // The design is a fixed two-up; anything other than exactly two stored tiles means the section
  // is not (validly) authored yet, so the seeded pair renders instead.
  const tiles: Tile[] =
    doc?.tiles?.length === 2
      ? doc.tiles.map((t, index) => ({
          tag: t.tag ?? '',
          title: t.title,
          href: t.href,
          variant: t.variant ?? (index === 0 ? 'tinted' : 'accent'),
        }))
      : DEFAULT_FRONTPAGE.tiles;

  const subscriptions =
    doc?.subscriptions && (doc.subscriptions.heading || doc.subscriptions.chips?.length)
      ? {
          eyebrow: doc.subscriptions.eyebrow ?? '',
          heading: doc.subscriptions.heading ?? '',
          description: doc.subscriptions.description ?? '',
          chips: (doc.subscriptions.chips ?? []).map(
            (c): Chip => ({ name: c.name, href: c.href ?? undefined }),
          ),
        }
      : DEFAULT_FRONTPAGE.subscriptions;

  return { hero, tiles, subscriptions };
}

/** Header nav + footer content for the shared chrome (SiteHeader/SiteFooter). */
export async function getSiteChrome(): Promise<SiteChrome> {
  const payload = await payloadClient();
  const doc = await payload.findGlobal({ slug: 'site-chrome', overrideAccess: true });
  return mergeSiteChrome(doc);
}

/** Hero, tiles and subscriptions banner content for the frontpage. */
export async function getFrontpageContent(): Promise<FrontpageContent> {
  const payload = await payloadClient();
  const doc = await payload.findGlobal({ slug: 'frontpage', overrideAccess: true });
  return mergeFrontpage(doc);
}
