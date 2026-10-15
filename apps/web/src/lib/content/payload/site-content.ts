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
  type SubscriptionsContent,
  type SubscriptionsDefaults,
  type Tile,
} from '@/lib/site-content-defaults';
import type { FrontpageSource, SiteChromeSource } from '../ports';
import { type LexicalDocument, lexicalContent } from '../rich-text';
import { payloadClient } from './client';

/**
 * 011 frontpage — the ONLY read path for the `site-chrome` and `frontpage` globals
 * (contracts/site-content-globals.md), moved into the Payload content source by 023. The per-section
 * fallback merge here is what guarantees a fresh environment renders a complete frontpage (FR-012).
 * Merge rule: a section that has been saved with content is used as stored ("you own all of it"); an
 * unset/empty section falls back to the seeded defaults wholesale. The merge functions are pure and
 * exported for the tests.
 *
 * 023: rich text leaves this module format-tagged (`RichTextContent`), for stored AND defaulted
 * sections alike (research R12).
 */

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
    doc?.footer && (doc.footer.contacts?.length || doc.footer.links?.length)
      ? {
          contactLabel: doc.footer.contactLabel ?? '',
          contacts: (doc.footer.contacts ?? []).map((c) => ({ name: c.name, email: c.email })),
          links: (doc.footer.links ?? []).map((l) => ({ label: l.label, href: l.href })),
        }
      : DEFAULT_SITE_CHROME.footer;
  return { nav, footer };
}

/** The seeded subscriptions section with its rich text format-tagged. */
function defaultSubscriptions(defaults: SubscriptionsDefaults): SubscriptionsContent {
  return {
    eyebrow: defaults.eyebrow,
    heading: defaults.heading,
    description: defaults.description,
    chips: defaults.chips.map(
      (c): Chip => ({
        name: c.name,
        description: c.description ? lexicalContent(c.description) : undefined,
      }),
    ),
    requestAccess: {
      label: defaults.requestAccess.label,
      body: lexicalContent(defaults.requestAccess.body),
    },
  };
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
            (c): Chip => ({
              name: c.name,
              description: c.description
                ? lexicalContent(c.description as LexicalDocument)
                : undefined,
            }),
          ),
          requestAccess: {
            label:
              doc.subscriptions.requestAccess?.label ??
              DEFAULT_FRONTPAGE.subscriptions.requestAccess.label,
            body: lexicalContent(
              (doc.subscriptions.requestAccess?.body as LexicalDocument | null | undefined) ??
                DEFAULT_FRONTPAGE.subscriptions.requestAccess.body,
            ),
          },
        }
      : defaultSubscriptions(DEFAULT_FRONTPAGE.subscriptions);

  return { hero, tiles, subscriptions };
}

export const payloadSiteChromeSource: SiteChromeSource = {
  /** Header nav + footer content for the shared chrome (SiteHeader/SiteFooter). */
  async getSiteChrome() {
    const payload = await payloadClient();
    const doc = await payload.findGlobal({ slug: 'site-chrome', overrideAccess: true });
    return mergeSiteChrome(doc);
  },
};

export const payloadFrontpageSource: FrontpageSource = {
  /** Hero, tiles and subscriptions banner content for the frontpage. */
  async getFrontpage() {
    const payload = await payloadClient();
    const doc = await payload.findGlobal({ slug: 'frontpage', overrideAccess: true });
    return mergeFrontpage(doc);
  },
};
