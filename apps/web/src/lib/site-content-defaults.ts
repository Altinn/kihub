/**
 * 011 frontpage — seeded default content for the `site-chrome` and `frontpage` globals (FR-012,
 * contracts/site-content-globals.md). Pure constants, single source of truth for BOTH the Payload
 * `defaultValue`s (so the admin form starts pre-filled) and the per-section fallback merge in
 * `lib/site-content.ts` (so a fresh environment renders a complete frontpage before editors touch
 * anything). Norwegian content mirrors the old KI HUB site, retargeted at routes that exist in
 * this portal (e.g. no `/om` yet — editors add such links when the pages exist).
 */

export interface NavItem {
  label: string;
  href: string;
}

export interface FooterContact {
  name: string;
  email: string;
}

export interface FooterContent {
  contactLabel: string;
  contacts: FooterContact[];
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

/**
 * Minimal lexical rich-text document shape — matches what `@payloadcms/richtext-lexical` generates
 * for every `richText` field (e.g. `Project['body']` in payload-types.ts). Declared by hand rather
 * than imported from the generated types so this file keeps its zero-framework-dependency contract
 * (see file header): the shape is dictated by lexical's data model, not by Payload's codegen.
 */
export interface RichTextValue {
  root: {
    type: string;
    children: { type: string; version: number; [k: string]: unknown }[];
    direction: 'ltr' | 'rtl' | null;
    format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
    indent: number;
    version: number;
  };
  [k: string]: unknown;
}

/** Wraps plain text in a single-paragraph lexical document, for seed/fallback content — editors
 * can add bold, links, and extra paragraphs on top of this once they open the CMS (Altinn/kihub#148). */
function richText(text: string): RichTextValue {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          children: [
            { type: 'text', version: 1, detail: 0, format: 0, mode: 'normal', style: '', text },
          ],
        },
      ],
    },
  };
}

export interface Chip {
  name: string;
  description?: RichTextValue;
}

export interface RequestAccess {
  label: string;
  body: RichTextValue;
}

export interface SubscriptionsContent {
  eyebrow: string;
  heading: string;
  description: string;
  chips: Chip[];
  requestAccess: RequestAccess;
}

export interface FrontpageContent {
  hero: HeroContent;
  tiles: Tile[];
  subscriptions: SubscriptionsContent;
}

export const DEFAULT_SITE_CHROME: SiteChrome = {
  // 014: "KI Læring" is part of the seeded defaults, so a FRESH environment links to the module out
  // of the box. 016 adds "Prosjekter" the same way. NOTE: `mergeSiteChrome` treats a SAVED nav
  // section as authoritative wholesale, so an environment where an editor has already customised
  // the navigation will NOT gain either entry automatically — an editor adds it in /cms (research
  // §11, quickstart.md §6.1). Nothing here writes to editor-owned content.
  nav: [
    { label: 'Hjem', href: '/' },
    { label: 'Verktøy', href: '/registry' },
    { label: 'Prosjekter', href: '/prosjekter' },
    { label: 'KI Læring', href: '/laering' },
    { label: 'Nyheter', href: '/news' },
    { label: 'Arrangementer', href: '/events' },
  ],
  footer: {
    // Altinn/kihub#149 — no seeded contacts: the old default address (kitt@digdir.no) doesn't
    // exist, and the team's names/addresses are editor-owned content entered in /cms.
    contactLabel: 'Kontakt Team KITT:',
    contacts: [],
    links: [
      { label: 'Verktøy', href: '/registry' },
      { label: 'Prosjekter', href: '/prosjekter' },
      { label: 'KI Læring', href: '/laering' },
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
    { tag: 'Oversikt', title: 'KI Prosjekter i BOD', href: '/prosjekter', variant: 'accent' },
  ],
  subscriptions: {
    eyebrow: 'Tilgjengelige abonnementer',
    heading: 'Støttede KI-abonnementer i Digdir',
    description:
      'Disse abonnementene er godkjent og tilgjengelig for BOD-ansatte. Ta kontakt med KITT for tilgang.',
    chips: [
      {
        name: 'GitHub Copilot',
        description: richText(
          'KI-basert kodeassistent som gir forslag til kode, forklaringer og dokumentasjon direkte i utviklerverktøyet ditt.',
        ),
      },
      {
        name: 'Claude Teams',
        description: richText(
          'Claude er en KI-assistent for tekst, analyse og produktivitet, tilgjengelig som abonnement for team i Digdir.',
        ),
      },
    ],
    requestAccess: {
      label: 'Hvordan bestille tilgang?',
      body: richText(
        'Ta kontakt med KITT-teamet på kitt@digdir.no for å be om tilgang. Oppgi hvilket abonnement du ønsker og hvilken avdeling du tilhører, så hjelper vi deg videre.',
      ),
    },
  },
};
