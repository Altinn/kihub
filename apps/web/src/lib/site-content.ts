import { payloadFrontpageSource, payloadSiteChromeSource } from '@/lib/content/payload/site-content';
import type { FrontpageContent, SiteChrome } from './site-content-defaults';

export type { Cta, FrontpageContent, NavItem, SiteChrome, Tile } from './site-content-defaults';

/**
 * 011 frontpage — the read path for the editor-managed site chrome and frontpage content. Since 023
 * a facade: the content source behind each is chosen per module (contracts/content-source.md §4).
 * Every source returns COMPLETE content, falling back to the seeded defaults per section (§3), so
 * a fresh environment always renders a full frontpage.
 */

/** Header nav + footer content for the shared chrome (SiteHeader/SiteFooter). */
export function getSiteChrome(): Promise<SiteChrome> {
  return payloadSiteChromeSource.getSiteChrome();
}

/** Hero, tiles and subscriptions banner content for the frontpage. */
export function getFrontpageContent(): Promise<FrontpageContent> {
  return payloadFrontpageSource.getFrontpage();
}
