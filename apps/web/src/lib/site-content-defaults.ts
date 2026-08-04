/**
 * 011 frontpage — seeded default content for the `site-chrome` and `frontpage` globals (FR-012,
 * contracts/site-content-globals.md). Pure constants, single source of truth for BOTH the Payload
 * `defaultValue`s (so the admin form starts pre-filled) and the per-section fallback merge in
 * `lib/site-content.ts` (so a fresh environment renders a complete frontpage before editors touch
 * anything). Norwegian content mirrors the old KI HUB site, retargeted at routes that exist in
 * this portal (e.g. no `/om` or `/prosjekter` yet — editors add such links when the pages exist).
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterContent {
  contactLabel: string;
  contactEmail: string;
  links: NavItem[];
}

export interface SiteChrome {
  nav: NavItem[];
  footer: FooterContent;
}

export interface Cta {
  label: string;
  href: string;
}

export interface HeroContent {
  eyebrow: string;
  heading: string;
  accentWord?: string;
  lead: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
}

export interface Tile {
  tag: string;
  title: string;
  href: string;
  variant: 'tinted' | 'accent';
}

export interface Chip {
  name: string;
  href?: string;
}

export interface SubscriptionsContent {
  eyebrow: string;
  heading: string;
  description: string;
  chips: Chip[];
}

export interface FrontpageContent {
  hero: HeroContent;
  tiles: Tile[];
  subscriptions: SubscriptionsContent;
}

export const DEFAULT_SITE_CHROME: SiteChrome = {
  nav: [
    { label: 'Hjem', href: '/' },
    { label: 'Verktøy', href: '/registry' },
    { label: 'Nyheter', href: '/news' },
    { label: 'Arrangementer', href: '/events' },
  ],
  footer: {
    contactLabel: 'Kontakt oss:',
    contactEmail: 'kitt@digdir.no',
    links: [
      { label: 'Verktøy', href: '/registry' },
      { label: 'Nyheter', href: '/news' },
      { label: 'Arrangementer', href: '/events' },
    ],
  },
};

export const DEFAULT_FRONTPAGE: FrontpageContent = {
  hero: {
    eyebrow: 'Digdir / BOD / KITT-teamet',
    heading: 'Kunstig intelligens i BOD',
    accentWord: 'BOD',
    lead: 'Vi hjelper deg og ditt team i gang med verktøy og veiledning for en trygg og innovativ bruk av KI i offentlig sektor.',
    primaryCta: { label: 'Se verktøy', href: '/registry' },
    secondaryCta: { label: 'Hva skjer i BOD', href: '/events' },
  },
  tiles: [
    { tag: 'Katalog', title: 'Verktøy', href: '/registry', variant: 'tinted' },
    { tag: 'Oversikt', title: 'KI Prosjekter i BOD', href: '/registry', variant: 'accent' },
  ],
  subscriptions: {
    eyebrow: 'Tilgjengelige abonnementer',
    heading: 'Støttede KI-abonnementer i Digdir',
    description:
      'Disse abonnementene er godkjent og tilgjengelig for BOD-ansatte. Ta kontakt med KITT for tilgang.',
    chips: [{ name: 'GitHub Copilot' }, { name: 'Claude Teams' }],
  },
};
