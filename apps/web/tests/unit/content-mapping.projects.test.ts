import { describe, expect, it } from 'vitest';
import { toProjectItem } from '@/lib/content/payload/projects';
import type { Project } from '@/payload-types';

/** 023 T013 — Payload Project → ProjectItem (data-model.md). */

const body = {
  root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 },
} as Project['body'];

const project = (overrides: Partial<Project> = {}): Project => ({
  id: 42,
  title: 'Agentbibliotek',
  slug: 'agentbibliotek',
  summary: 'Felles agenter.',
  body,
  status: 'published',
  order: 100,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

describe('toProjectItem', () => {
  it('maps to the neutral shape with a stringified id and format-tagged body', () => {
    expect(toProjectItem(project())).toEqual({
      id: '42',
      slug: 'agentbibliotek',
      title: 'Agentbibliotek',
      summary: 'Felles agenter.',
      body: { format: 'lexical', document: body },
    });
  });

  it('maps a missing slug to "" (what the pages did inline) and a missing summary to null', () => {
    const item = toProjectItem(project({ slug: null, summary: undefined }));
    expect(item.slug).toBe('');
    expect(item.summary).toBeNull();
  });

  it('carries no CMS-internal fields', () => {
    const item = toProjectItem(project()) as unknown as Record<string, unknown>;
    for (const key of ['status', 'order', 'createdAt', 'updatedAt']) expect(item).not.toHaveProperty(key);
  });
});
