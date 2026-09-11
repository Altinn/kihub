import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';
import { slugify } from '../lib/slug';

/**
 * 016 — Prosjekt. Native platform content (Constitution Principle II) shown to employees at
 * `/prosjekter`: a flat, editor-authored list of AI projects underway in BOD (Altinn/kihub#135).
 * No Git source, no relationship to `Artifact` — a project is not an AI asset (Principle III).
 *
 * Access and the auto-slug hook are copied from `News.ts`/`LearningPage.ts` rather than
 * reinvented: Contributor+ read everything (drafts + published); everyone else is constrained to
 * `published` — the second line of defence alongside `lib/projects.ts`'s own status filter, so a
 * draft cannot leak through the employee pages or the REST/GraphQL path.
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const Project: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Prosjekt', plural: 'Prosjekter' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'order'],
  },
  access: {
    read: ({ req }) => (isEditor(req.user) ? true : { status: { equals: 'published' } }),
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Derive a URL-safe slug from the title when the editor leaves it blank; keep any
        // explicit slug so it stays stable across title edits (same pattern as News/LearningPage).
        if (data && !data.slug && typeof data.title === 'string' && data.title.trim()) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tittel' },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: 'Adresse',
      admin: {
        description: 'URL-håndtak (/prosjekter/<adresse>); utledes fra tittelen når feltet står tomt.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Sammendrag',
      admin: { description: 'Kort ingress vist i prosjektlisten.' },
    },
    { name: 'body', type: 'richText', required: true, label: 'Beskrivelse' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      label: 'Status',
      options: [
        { label: 'Utkast', value: 'draft' },
        { label: 'Publisert', value: 'published' },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      label: 'Rekkefølge',
      admin: {
        position: 'sidebar',
        description: 'Lav verdi vises først; like verdier alfabetisk.',
      },
    },
  ],
};
