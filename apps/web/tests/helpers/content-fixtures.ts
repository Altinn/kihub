/**
 * 023 — deterministic editorial content for the DB-free parity harness
 * (specs/023-content-source-seam/research.md R8, tasks T003).
 *
 * Everything is fixed: ids, timestamps, filenames, focal points. Documents are shaped exactly like
 * what Payload's local API returns for these collections (see `src/payload-types.ts`), with
 * relation fields stored as ids — `tests/helpers/fake-payload.ts` populates them when the query's
 * `depth` is not 0, as Payload does. Rich-text upload nodes are stored POPULATED, because every
 * read that renders a body uses a depth > 0.
 *
 * The harness clock is pinned to 2026-10-15T08:00:00Z, so dates here are chosen around it.
 */
import type { Doc, FixtureSet } from './fake-payload';

/* ---------- lexical builders ---------- */

const text = (value: string, format = 0) => ({
  type: 'text',
  text: value,
  format,
  style: '',
  mode: 'normal',
  detail: 0,
  version: 1,
});

const block = (type: string, children: unknown[], extra: Record<string, unknown> = {}) => ({
  type,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children,
  ...extra,
});

const paragraph = (...children: unknown[]) =>
  block('paragraph', children, { textFormat: 0, textStyle: '' });

const heading = (tag: string, value: string) => block('heading', [text(value)], { tag });

const link = (url: string, value: string) =>
  block('link', [text(value)], {
    fields: { url, newTab: false, linkType: 'custom' },
    id: `link-${value.length}`,
  });

const list = (...items: string[]) =>
  block(
    'list',
    items.map((item, index) => block('listitem', [text(item)], { value: index + 1 })),
    { listType: 'bullet', tag: 'ul', start: 1 },
  );

const blockNode = (fields: Record<string, unknown>) => ({
  type: 'block',
  format: '',
  version: 2,
  fields,
});

const uploadNode = (value: unknown, fields: Record<string, unknown> | null = null) => ({
  type: 'upload',
  format: '',
  version: 3,
  relationTo: 'media',
  value,
  fields,
});

export function lexical(...children: unknown[]) {
  return { root: block('root', children) };
}

/* ---------- media ---------- */

function size(filename: string, width: number, height: number) {
  return {
    url: `/payload-api/media/file/${filename}`,
    width,
    height,
    mimeType: 'image/png',
    filesize: width * height,
    filename,
  };
}

const mediaBase = {
  mimeType: 'image/png',
  thumbnailURL: null,
  createdAt: '2026-09-01T10:00:00.000Z',
};

/** A wide original with exact 16:10 card extracts — and a focal X of 0 (a real edge, `??`). */
export const mediaWide: Doc = {
  ...mediaBase,
  id: 101,
  alt: 'Vid illustrasjon av et nettverk',
  url: '/payload-api/media/file/hero-wide.png',
  filename: 'hero-wide.png',
  filesize: 512000,
  width: 2400,
  height: 1600,
  focalX: 0,
  focalY: 35,
  updatedAt: '2026-09-01T10:00:00.000Z',
  sizes: {
    card: size('hero-wide-800x500.png', 800, 500),
    card2x: size('hero-wide-1600x1000.png', 1600, 1000),
    content: size('hero-wide-1200x800.png', 1200, 800),
    content2x: size('hero-wide-2400x1600.png', 2400, 1600),
  },
};

/** A small original: every size is the same non-16:10 file (dedupe + reading-width fallback). */
export const mediaSmall: Doc = {
  ...mediaBase,
  id: 102,
  alt: 'Lite skjermbilde',
  url: '/payload-api/media/file/small.png',
  filename: 'small.png',
  filesize: 30720,
  width: 640,
  height: 480,
  focalX: null,
  focalY: null,
  updatedAt: '2026-09-02T09:30:00.000Z',
  sizes: {
    card: size('small.png', 640, 480),
    card2x: size('small.png', 640, 480),
    content: size('small.png', 640, 480),
    content2x: size('small.png', 640, 480),
  },
};

/** An inline learning/news body image with a content size. */
export const mediaDiagram: Doc = {
  ...mediaBase,
  id: 103,
  alt: 'Diagram over arbeidsflyt',
  url: '/payload-api/media/file/diagram.png',
  filename: 'diagram.png',
  filesize: 204800,
  width: 1800,
  height: 900,
  focalX: 50,
  focalY: 50,
  updatedAt: '2026-09-03T12:00:00.000Z',
  sizes: {
    content: size('diagram-1200x600.png', 1200, 600),
    content2x: size('diagram-1800x900.png', 1800, 900),
  },
};

/** Sizes not generated yet (all-null entries) — the original-file fallback. */
export const mediaUngenerated: Doc = {
  ...mediaBase,
  id: 104,
  alt: 'Bilde uten genererte størrelser',
  url: '/payload-api/media/file/raw.png',
  filename: 'raw.png',
  filesize: 102400,
  width: 1000,
  height: 625,
  focalX: 20,
  focalY: 80,
  updatedAt: '2026-09-04T08:15:00.000Z',
  sizes: {
    card: { url: null, width: null, height: null, mimeType: null, filesize: null, filename: null },
    content: { url: null, width: null, height: null, mimeType: null, filesize: null, filename: null },
  },
};

/* ---------- users ---------- */

export const users: Doc[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@digdir.no', role: 'editor' },
  { id: 2, name: null, email: 'grace@digdir.no', role: 'contributor' },
];

/* ---------- news ---------- */

const newsBase = {
  status: 'published',
  featured: false,
  heroImage: null,
  heroImageUrl: null,
  tags: null,
  author: null,
  summary: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const plainBody = (value: string) => lexical(paragraph(text(value)));

function filler(n: number): Doc {
  // News 6..14 — plain cards, one per day going back from 2026-10-09 to 2026-10-01.
  const day = String(15 - n).padStart(2, '0');
  return {
    ...newsBase,
    id: 200 + n,
    title: `Nyhet nummer ${n}`,
    slug: `nyhet-${n}`,
    summary: n % 2 === 0 ? `Kort ingress for nyhet ${n}.` : null,
    body: plainBody(`Brødtekst for nyhet ${n}.`),
    publishDate: `2026-10-${day}T09:00:00.000Z`,
  };
}

export const news: Doc[] = [
  {
    ...newsBase,
    id: 201,
    title: 'KI-strategi for Digdir lansert',
    slug: 'ki-strategi-lansert',
    summary: 'Den nye strategien setter retning for bruk av KI i etaten.',
    // 22:30 UTC — already the NEXT calendar day in Oslo (the timeZone edge).
    publishDate: '2026-10-14T22:30:00.000Z',
    heroImage: 101,
    author: 1,
    tags: ['KI', '', 'Strategi'],
    featured: true,
    body: lexical(
      heading('h2', 'Hvorfor en strategi'),
      paragraph(text('Les mer på '), link('https://www.digdir.no', 'digdir.no'), text('.')),
      paragraph(text('Viktig', 1), text(' og '), text('kursiv', 2)),
      uploadNode(mediaDiagram, null),
      list('Første punkt', 'Andre punkt'),
    ),
  },
  {
    ...newsBase,
    id: 202,
    title: 'Gammel artikkel med ekstern bilde-URL',
    slug: 'legacy-hero',
    summary: 'Artikkel fra før 020 med limt inn bilde-URL.',
    publishDate: '2026-10-13T08:00:00.000Z',
    heroImageUrl: '  https://example.org/legacy-hero.jpg  ',
    author: 2,
    body: plainBody('Legacy-brødtekst.'),
  },
  {
    ...newsBase,
    id: 203,
    title: 'Lite bilde på kortet',
    slug: 'lite-bilde',
    publishDate: '2026-10-12T08:00:00.000Z',
    heroImage: 102,
    body: plainBody('Artikkel med lite originalbilde.'),
  },
  {
    ...newsBase,
    id: 204,
    title: 'Bilde som ikke finnes lenger',
    slug: 'bare-id',
    summary: 'Hero-relasjonen peker på et slettet medieobjekt.',
    publishDate: '2026-10-11T08:00:00.000Z',
    heroImage: 9999,
    heroImageUrl: '   ',
    body: plainBody('Ingen hero.'),
  },
  {
    ...newsBase,
    id: 205,
    title: 'Bilde uten genererte størrelser',
    slug: 'ugenererte-storrelser',
    publishDate: '2026-10-10T08:00:00.000Z',
    heroImage: 104,
    body: plainBody('Originalfilen brukes.'),
  },
  ...Array.from({ length: 9 }, (_, i) => filler(i + 6)),
  {
    ...newsBase,
    id: 299,
    title: 'Utkast som aldri må vises',
    slug: 'utkast',
    status: 'draft',
    publishDate: '2026-10-15T07:00:00.000Z',
    body: plainBody('Utkast.'),
  },
];

/* ---------- events ---------- */

const eventBase = {
  status: 'published',
  featured: false,
  endDateTime: null,
  location: null,
  onlineUrl: null,
  organizer: null,
  channel: null,
  capacity: null,
  seatsTaken: null,
  tags: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const events: Doc[] = [
  {
    ...eventBase,
    id: 301,
    title: 'Webinar: KI i offentlig sektor',
    slug: 'webinar-ki-offentlig',
    description: lexical(paragraph(text('Et webinar om '), text('ansvarlig', 1), text(' KI.'))),
    startDateTime: '2026-10-20T08:00:00.000Z',
    endDateTime: '2026-10-20T09:30:00.000Z',
    onlineUrl: 'https://teams.example/webinar',
    organizer: 'KI-teamet',
    eventType: 'webinar',
    format: 'digitalt',
    channel: 'Teams',
    capacity: 50,
    seatsTaken: 10,
    featured: true,
  },
  {
    ...eventBase,
    id: 302,
    title: 'Verksted: promptdesign',
    slug: 'verksted-promptdesign',
    description: lexical(paragraph(text('Ta med egen PC.'))),
    startDateTime: '2026-10-16T11:00:00.000Z',
    endDateTime: '2026-10-16T14:00:00.000Z',
    location: 'Grev Wedels plass 9, Oslo',
    eventType: 'verksted',
    format: 'oppmote',
  },
  {
    ...eventBase,
    id: 303,
    title: 'Kurs: Copilot for utviklere',
    slug: 'kurs-copilot',
    description: lexical(paragraph(text('Fullt kurs.'))),
    startDateTime: '2026-11-03T07:30:00.000Z',
    location: 'Leikanger',
    onlineUrl: 'https://teams.example/kurs',
    eventType: 'kurs',
    format: 'hybrid',
    channel: 'Teams',
    capacity: 20,
    seatsTaken: 20,
  },
  {
    ...eventBase,
    id: 304,
    title: 'Konferanse: Digitaliseringskonferansen',
    slug: 'konferanse',
    description: lexical(paragraph(text('To dager.'))),
    startDateTime: '2026-12-01T07:00:00.000Z',
    endDateTime: '2026-12-02T15:00:00.000Z',
    location: 'Bergen',
    eventType: 'konferanse',
    format: 'oppmote',
    capacity: 300,
    seatsTaken: 120,
  },
  {
    ...eventBase,
    id: 305,
    title: 'Internt: KI-lunsj',
    slug: 'ki-lunsj',
    description: lexical(paragraph(text('Uformell prat.'))),
    startDateTime: '2026-10-22T10:00:00.000Z',
    organizer: 'Avdeling for digitale fellestjenester',
    eventType: 'internt',
    format: 'oppmote',
    location: 'Kantina',
  },
  {
    ...eventBase,
    id: 306,
    title: 'Avholdt webinar i oktober',
    slug: 'avholdt-webinar',
    description: lexical(paragraph(text('Allerede avholdt.'))),
    startDateTime: '2026-10-01T08:00:00.000Z',
    endDateTime: '2026-10-01T09:00:00.000Z',
    onlineUrl: 'https://teams.example/gammelt',
    eventType: 'webinar',
    format: 'digitalt',
  },
  {
    ...eventBase,
    id: 399,
    title: 'Utkast-arrangement',
    slug: 'utkast-arrangement',
    status: 'draft',
    description: lexical(paragraph(text('Utkast.'))),
    startDateTime: '2026-10-17T08:00:00.000Z',
    eventType: 'kurs',
    format: 'digitalt',
  },
];

/* ---------- projects ---------- */

const projectBase = {
  status: 'published',
  summary: null,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const projects: Doc[] = [
  {
    ...projectBase,
    id: 401,
    title: 'KI-assistent for saksbehandling',
    slug: 'ki-assistent',
    summary: 'Pilot i to avdelinger.',
    order: 10,
    body: lexical(
      heading('h2', 'Mål'),
      paragraph(text('Redusere saksbehandlingstid.')),
      list('Pilot', 'Evaluering'),
    ),
  },
  {
    ...projectBase,
    id: 402,
    title: 'Agentbibliotek',
    slug: 'agentbibliotek',
    order: 100,
    createdAt: '2026-09-02T00:00:00.000Z',
    body: plainBody('Felles agenter.'),
  },
  {
    ...projectBase,
    id: 403,
    title: 'Språkmodell-evaluering',
    slug: 'sprakmodell-evaluering',
    summary: 'Sammenligning av modeller.',
    order: 100,
    createdAt: '2026-09-03T00:00:00.000Z',
    body: plainBody('Evaluering.'),
  },
  {
    ...projectBase,
    id: 499,
    title: 'Hemmelig utkast-prosjekt',
    slug: 'utkast-prosjekt',
    status: 'draft',
    order: 1,
    body: plainBody('Utkast.'),
  },
];

/* ---------- KI Læring ---------- */

const learningStamp = {
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

export const learningCategories: Doc[] = [
  { ...learningStamp, id: 501, title: 'Kom i gang', description: 'Grunnleggende om KI.', order: 1 },
  { ...learningStamp, id: 502, title: 'Avansert', description: null, order: 2 },
];

export const learningSubcategories: Doc[] = [
  { ...learningStamp, id: 511, title: 'Verktøy', category: 501, order: 1 },
  { ...learningStamp, id: 512, title: 'Agenter', category: 502, order: 1 },
];

export const learningPages: Doc[] = [
  {
    id: 521,
    title: 'Introduksjon til KI',
    slug: 'introduksjon',
    category: 501,
    subcategory: null,
    summary: 'Alt du trenger for å komme i gang.',
    status: 'published',
    order: 1,
    author: 1,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-10-02T13:45:00.000Z',
    body: lexical(
      heading('h2', 'Hva er KI?'),
      paragraph(text('Se '), link('https://www.digdir.no/ki', 'veiledningen'), text('.')),
      list('Maskinlæring', 'Språkmodeller'),
      blockNode({
        id: 'code-1',
        blockName: '',
        blockType: 'Code',
        language: 'typescript',
        code: 'const greeting: string = "Hei";\nconsole.log(greeting);',
      }),
      blockNode({ id: 'code-2', blockName: '', blockType: 'Code', language: 'python', code: '   ' }),
      blockNode({
        id: 'yt-1',
        blockName: '',
        blockType: 'youtube',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42',
        title: 'Introduksjonsvideo',
        caption: 'Kort introduksjon',
      }),
      blockNode({
        id: 'yt-2',
        blockName: '',
        blockType: 'youtube',
        url: 'https://example.org/not-youtube',
        title: null,
        caption: null,
      }),
      uploadNode(mediaDiagram, { decorative: false }),
      uploadNode(mediaUngenerated, { decorative: true }),
      uploadNode(null, null),
      blockNode({ id: 'unknown-1', blockName: '', blockType: 'unknownWidget', foo: 'bar' }),
    ),
  },
  {
    id: 522,
    title: 'Copilot i hverdagen',
    slug: 'copilot',
    category: 501,
    subcategory: 511,
    summary: null,
    status: 'published',
    order: 1,
    author: 2,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-20T08:00:00.000Z',
    body: plainBody('Tips og triks.'),
  },
  {
    id: 523,
    title: 'Agentmønstre',
    slug: 'agentmonstre',
    category: 502,
    subcategory: 512,
    summary: 'Mønstre for agentdesign.',
    status: 'published',
    order: 1,
    author: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-21T08:00:00.000Z',
    body: plainBody('Mønstre.'),
  },
  {
    id: 529,
    title: 'Utkast-side',
    slug: 'utkast-side',
    category: 502,
    subcategory: null,
    summary: null,
    status: 'draft',
    order: 0,
    author: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-21T08:00:00.000Z',
    body: plainBody('Utkast.'),
  },
];

/* ---------- globals ---------- */

export const storedSiteChrome = {
  nav: [
    { id: 'n1', label: 'Hjem', href: '/' },
    { id: 'n2', label: 'Nyheter', href: '/news' },
    { id: 'n3', label: 'KI Læring', href: '/laering' },
  ],
  footer: {
    contactLabel: 'Kontakt KI-teamet',
    contacts: [{ id: 'c1', name: 'Ada Lovelace', email: 'ada@digdir.no' }],
    links: [{ id: 'l1', label: 'Personvern', href: '/personvern' }],
  },
};

export const storedFrontpage = {
  hero: {
    eyebrow: 'KI Hub',
    heading: 'KI for hele Digdir',
    accentWord: 'hele',
    lead: 'Alt om kunstig intelligens på ett sted.',
    primaryCta: { label: 'Utforsk verktøy', href: '/registry' },
    secondaryCta: { label: null, href: null },
  },
  tiles: [
    { id: 't1', tag: 'Verktøy', title: 'Finn KI-verktøy', href: '/registry', variant: 'tinted' },
    { id: 't2', tag: null, title: 'Se prosjekter', href: '/prosjekter', variant: null },
  ],
  subscriptions: {
    eyebrow: 'Abonnementer',
    heading: 'Støttede KI-abonnementer',
    description: 'Disse abonnementene er godkjent.',
    chips: [
      {
        id: 'ch1',
        name: 'GitHub Copilot',
        description: lexical(paragraph(text('For utviklere. '), link('https://github.com', 'Les mer'))),
      },
      { id: 'ch2', name: 'Claude Teams', description: null },
    ],
    // Label stored, body missing — the per-field fallback to the default body.
    requestAccess: { label: 'Slik får du tilgang', body: null },
  },
};

/* ---------- sets ---------- */

const media = [mediaWide, mediaSmall, mediaDiagram, mediaUngenerated];

function set(globals: FixtureSet['globals']): FixtureSet {
  return {
    collections: {
      news,
      events,
      projects,
      media,
      users,
      'learning-categories': learningCategories,
      'learning-subcategories': learningSubcategories,
      'learning-pages': learningPages,
    },
    globals,
  };
}

/** Default set: frontpage never saved (defaults path), site chrome saved. */
export const FULL: FixtureSet = set({ frontpage: null, 'site-chrome': storedSiteChrome });

/** Both globals saved. */
export const STORED_GLOBALS: FixtureSet = set({ frontpage: storedFrontpage, 'site-chrome': storedSiteChrome });

/** Nothing ever saved for the globals (defaults path for the header/footer too). */
export const DEFAULT_GLOBALS: FixtureSet = set({ frontpage: null, 'site-chrome': null });

/** No editorial content at all — every module's empty state. */
export const EMPTY: FixtureSet = {
  collections: {
    news: [],
    events: [],
    projects: [],
    media: [],
    users: [],
    'learning-categories': [],
    'learning-subcategories': [],
    'learning-pages': [],
  },
  globals: { frontpage: null, 'site-chrome': null },
};
