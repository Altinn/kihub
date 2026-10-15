import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GLOBALS, EMPTY, FULL, STORED_GLOBALS } from '../helpers/content-fixtures';
import type { FixtureSet } from '../helpers/fake-payload';
import { fake } from '../helpers/parity-fake';

/**
 * 023 — the parity harness (specs/023-content-source-seam/research.md R8, tasks T004).
 *
 * Renders every employee-facing editorial surface from fixed fixtures through a fake Payload and
 * compares the HTML (and the Payload queries each surface issued) with goldens in `__parity__/`.
 * The goldens were captured on the code BEFORE the content-source seam existed, so a passing run
 * means the refactor changed nothing an employee can see and no query the pages make.
 *
 * NEVER run this file with `-u`: a mismatch means the change is wrong, not the golden.
 */

vi.mock('payload', async () => {
  const { fake: shared } = await import('../helpers/parity-fake');
  return { getPayload: async () => shared };
});
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/auth', () => ({ auth: async () => ({ user: { email: 'ada@digdir.no' } }) }));
// Outside the app router `usePathname()` is null; pin it so `SiteNav` renders as on the frontpage.
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  usePathname: () => '/',
}));

const NOW = new Date('2026-10-15T08:00:00.000Z');

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterAll(() => {
  vi.useRealTimers();
});
beforeEach(() => {
  fake.useFixtures(FULL);
  fake.resetCalls();
});

async function toHtml(element: React.ReactNode): Promise<string> {
  const { renderToReadableStream } = await import('react-dom/server');
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  const html = await new Response(stream).text();
  // One tag per line, so a golden diff is reviewable. Deterministic, so byte-identity is preserved.
  return `${html.replace(/></g, '>\n<')}\n`;
}

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const search = (sp: Record<string, string>) => ({ searchParams: Promise.resolve(sp) });

interface Surface {
  name: string;
  fixtures?: FixtureSet;
  render: () => Promise<string>;
}

const surfaces: Surface[] = [
  {
    name: 'frontpage-defaults',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/page');
      return toHtml(await Page());
    },
  },
  {
    name: 'frontpage-stored',
    fixtures: STORED_GLOBALS,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/page');
      return toHtml(await Page());
    },
  },
  {
    name: 'frontpage-empty',
    fixtures: EMPTY,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/page');
      return toHtml(await Page());
    },
  },
  ...(['1', '2', '99'] as const).map((page) => ({
    name: `news-p${page}`,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/news/page');
      return toHtml(await Page(search({ page })));
    },
  })),
  {
    name: 'news-empty',
    fixtures: EMPTY,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/news/page');
      return toHtml(await Page(search({})));
    },
  },
  ...(
    [
      ['news-article-upload', 'ki-strategi-lansert'],
      ['news-article-legacy', 'legacy-hero'],
      ['news-article-none', 'nyhet-6'],
      ['news-article-bare-id', 'bare-id'],
      ['news-article-small', 'lite-bilde'],
      ['news-article-ungenerated', 'ugenererte-storrelser'],
    ] as const
  ).map(([name, slug]) => ({
    name,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/news/[slug]/page');
      return toHtml(await Page(params(slug)));
    },
  })),
  {
    name: 'events-list',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/events/page');
      return toHtml(await Page(search({})));
    },
  },
  {
    name: 'events-list-filtered',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/events/page');
      return toHtml(await Page(search({ type: 'webinar', form: 'digitalt' })));
    },
  },
  {
    name: 'events-calendar',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/events/page');
      return toHtml(await Page(search({ view: 'kalender', month: '2026-10' })));
    },
  },
  {
    name: 'events-empty',
    fixtures: EMPTY,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/events/page');
      return toHtml(await Page(search({})));
    },
  },
  {
    name: 'event-detail',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/events/[slug]/page');
      return toHtml(await Page(params('webinar-ki-offentlig')));
    },
  },
  {
    name: 'event-past',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/events/[slug]/page');
      return toHtml(await Page(params('avholdt-webinar')));
    },
  },
  {
    name: 'projects-list',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/prosjekter/page');
      return toHtml(await Page());
    },
  },
  {
    name: 'projects-empty',
    fixtures: EMPTY,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/prosjekter/page');
      return toHtml(await Page());
    },
  },
  {
    name: 'project-detail',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/prosjekter/[slug]/page');
      return toHtml(await Page(params('ki-assistent')));
    },
  },
  {
    name: 'laering-index',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/laering/page');
      return toHtml(await Page());
    },
  },
  {
    name: 'laering-empty',
    fixtures: EMPTY,
    render: async () => {
      const { default: Page } = await import('@/app/(app)/laering/page');
      return toHtml(await Page());
    },
  },
  {
    name: 'laering-page',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/laering/[slug]/page');
      return toHtml(await Page(params('introduksjon')));
    },
  },
  {
    name: 'laering-page-subcategory',
    render: async () => {
      const { default: Page } = await import('@/app/(app)/laering/[slug]/page');
      return toHtml(await Page(params('copilot')));
    },
  },
  {
    name: 'site-header',
    render: async () => {
      const { SiteHeader } = await import('@/components/SiteHeader');
      return toHtml(await SiteHeader());
    },
  },
  {
    name: 'site-footer',
    render: async () => {
      const { SiteFooter } = await import('@/components/SiteFooter');
      return toHtml(await SiteFooter());
    },
  },
  {
    name: 'site-header-defaults',
    fixtures: DEFAULT_GLOBALS,
    render: async () => {
      const { SiteHeader } = await import('@/components/SiteHeader');
      return toHtml(await SiteHeader());
    },
  },
  {
    name: 'site-footer-defaults',
    fixtures: DEFAULT_GLOBALS,
    render: async () => {
      const { SiteFooter } = await import('@/components/SiteFooter');
      return toHtml(await SiteFooter());
    },
  },
];

// The first surface pays for importing every page module (~6 s cold), hence the generous timeout.
describe('023 parity — editorial surfaces render byte-identically (research R8)', { timeout: 60_000 }, () => {
  it.each(surfaces)('$name', async ({ name, fixtures, render }) => {
    if (fixtures) fake.useFixtures(fixtures);
    const html = await render();
    await expect(html).toMatchFileSnapshot(`./__parity__/${name}.html`);
    await expect(`${JSON.stringify(fake.calls, null, 2)}\n`).toMatchFileSnapshot(
      `./__parity__/${name}.queries.json`,
    );
  });

  it('event-ics', async () => {
    const { GET } = await import('@/app/(app)/events/[slug]/ics/route');
    const res = await GET(
      new Request('http://kihub.test/events/webinar-ki-offentlig/ics'),
      params('webinar-ki-offentlig'),
    );
    const head = ['Content-Type', 'Content-Disposition']
      .map((h) => `${h}: ${res.headers.get(h)}`)
      .join('\n');
    await expect(`${res.status}\n${head}\n\n${await res.text()}`).toMatchFileSnapshot(
      './__parity__/event-ics.ics',
    );
    await expect(`${JSON.stringify(fake.calls, null, 2)}\n`).toMatchFileSnapshot(
      './__parity__/event-ics.queries.json',
    );
  });
});

describe('023 parity — drafts and unknown slugs are 404 (FR-001, FR-014)', { timeout: 60_000 }, () => {
  const notFound = expect.objectContaining({ digest: expect.stringContaining('404') });

  it.each([
    ['news', 'utkast'],
    ['news', 'finnes-ikke'],
    ['events', 'utkast-arrangement'],
    ['prosjekter', 'utkast-prosjekt'],
    ['laering', 'utkast-side'],
    ['laering', 'finnes-ikke'],
  ])('%s/%s', async (section, slug) => {
    const pages = {
      news: () => import('@/app/(app)/news/[slug]/page'),
      events: () => import('@/app/(app)/events/[slug]/page'),
      prosjekter: () => import('@/app/(app)/prosjekter/[slug]/page'),
      laering: () => import('@/app/(app)/laering/[slug]/page'),
    } as const;
    const { default: Page } = await pages[section as keyof typeof pages]();
    await expect(Page(params(slug))).rejects.toEqual(notFound);
  });

  it('ics for a draft is a 404 response', async () => {
    const { GET } = await import('@/app/(app)/events/[slug]/ics/route');
    const res = await GET(
      new Request('http://kihub.test/events/utkast-arrangement/ics'),
      params('utkast-arrangement'),
    );
    expect(res.status).toBe(404);
  });
});
