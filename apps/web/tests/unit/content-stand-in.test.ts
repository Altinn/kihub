import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { lexicalContent } from '@/lib/content/rich-text';
import type { ProjectItem } from '@/lib/content/types';
import type { ProjectsSource } from '@/lib/content/ports';

/**
 * 023 T037 (US3, SC-004) — the seam, proven: a different source for ONE module (here a stand-in
 * shaped like a future Umbraco source: GUID-style ids, its own content) is picked up by that
 * module's pages with no page or component change, while every other module keeps reading Payload.
 *
 * Only the registry's `projectsSource()` is replaced; Payload itself is the parity harness's fake.
 */

vi.mock('payload', async () => {
  const { fake } = await import('../helpers/parity-fake');
  return { getPayload: async () => fake };
});
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('@/auth', () => ({ auth: async () => ({ user: { email: 'ada@digdir.no' } }) }));

const paragraph = (text: string) => ({
  root: {
    type: 'root',
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        version: 1,
        format: '',
        indent: 0,
        direction: 'ltr',
        children: [{ type: 'text', version: 1, text, format: 0, style: '', mode: 'normal', detail: 0 }],
      },
    ],
  },
});

const STAND_IN_PROJECTS: ProjectItem[] = [
  {
    id: 'umb-6f1c2a9e-0b7d-4c43-9a51-2f4e8d1b7c30',
    slug: 'umbraco-pilot',
    title: 'Pilot fra stand-in-kilden',
    summary: 'Levert av en annen innholdskilde.',
    body: lexicalContent(paragraph('Brødtekst fra stand-in-kilden.')),
  },
  {
    id: 'umb-0d4a7b21-5e9f-4b8c-8f02-6a3c9e7d1f45',
    slug: 'umbraco-andre',
    title: 'Andre stand-in-prosjekt',
    summary: null,
    body: lexicalContent(paragraph('Mer innhold.')),
  },
];

const standIn: ProjectsSource = {
  listPublished: async () => STAND_IN_PROJECTS,
  getPublishedBySlug: async (slug) => STAND_IN_PROJECTS.find((p) => p.slug === slug) ?? null,
};

vi.mock('@/lib/content/registry', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/content/registry')>()),
  projectsSource: () => standIn,
}));

async function toHtml(element: React.ReactNode): Promise<string> {
  const { renderToReadableStream } = await import('react-dom/server');
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-15T08:00:00.000Z'));
});
afterAll(() => {
  vi.useRealTimers();
});

describe('023 US3 — one module served by a stand-in source, no page changed', { timeout: 60_000 }, () => {
  it('/prosjekter lists the stand-in projects, not the Payload ones', async () => {
    const { default: Page } = await import('@/app/(app)/prosjekter/page');
    const html = await toHtml(await Page());
    expect(html).toContain('Pilot fra stand-in-kilden');
    expect(html).toContain('Levert av en annen innholdskilde.');
    expect(html).toContain('href="/prosjekter/umbraco-pilot"');
    expect(html).toContain('Andre stand-in-prosjekt');
    // The Payload fixture projects are not shown.
    expect(html).not.toContain('KI-assistent for saksbehandling');
  });

  it('a project page renders the stand-in body through <RichTextBody>', async () => {
    const { default: Page } = await import('@/app/(app)/prosjekter/[slug]/page');
    const html = await toHtml(await Page({ params: Promise.resolve({ slug: 'umbraco-pilot' }) }));
    expect(html).toContain('Pilot fra stand-in-kilden');
    expect(html).toContain('Brødtekst fra stand-in-kilden.');
  });

  it('an unknown slug in the stand-in source is still a 404', async () => {
    const { default: Page } = await import('@/app/(app)/prosjekter/[slug]/page');
    await expect(Page({ params: Promise.resolve({ slug: 'ki-assistent' }) })).rejects.toEqual(
      expect.objectContaining({ digest: expect.stringContaining('404') }),
    );
  });

  it('other modules are unaffected: /news still reads Payload', async () => {
    const { default: Page } = await import('@/app/(app)/news/page');
    const html = await toHtml(await Page({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('KI-strategi for Digdir lansert');
    expect(html).not.toContain('stand-in');
  });
});
