import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';
import { slugify } from '../lib/slug';

/**
 * 014 — Læringsside, the unit employees read at `/laering/<slug>`.
 *
 * Access is copied from `News.ts` rather than reinvented (FR-031/032): Contributor+ reads everything
 * including drafts, everyone else is constrained to `published`. That access rule is the SECOND line
 * of defence — `lib/learning.ts` also filters `status: published` in every query — so a draft cannot
 * leak through either the employee pages or the REST/GraphQL path (research §7, the 007 posture).
 *
 * Addresses are flat: `/laering/<slug>`, with the category NOT in the URL, so moving a page between
 * categories or subcategories never breaks a link a colleague already shared (FR-010).
 *
 * "Sist oppdatert" (FR-018) uses Payload's built-in `updatedAt`; there is deliberately no
 * `publishDate` field, because nothing on the surface asks a second date question (data-model.md).
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const LearningPage: CollectionConfig = {
  slug: 'learning-pages',
  labels: { singular: 'Læringsside', plural: 'Læringssider' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'category', 'order', 'updatedAt'],
    group: 'KI Læring',
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
        // FR-011 — derive a URL-safe handle from the title when the editor leaves it blank, reusing
        // `lib/slug.ts` (which already maps æ/ø/å). Any explicit slug is kept, so the address stays
        // stable across title edits.
        //
        // This is load-bearing for the READ side, not just for authoring: pages are addressed by
        // handle, and `buildLearningTree` drops a page it cannot link, so a page without a slug is
        // invisible to employees.
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
      // Not API-required: the beforeValidate hook always derives it from the (required) title.
      // Uniqueness — the FR-011 guarantee — comes from `unique`, not from requiredness.
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: 'Adresse',
      admin: {
        description:
          'URL-håndtak (/laering/<adresse>). Utledes fra tittelen når feltet står tomt, og endres ikke når tittelen endres.',
      },
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'learning-categories',
      hasMany: false,
      required: true,
      index: true,
      label: 'Kategori',
    },
    {
      name: 'subcategory',
      type: 'relationship',
      relationTo: 'learning-subcategories',
      hasMany: false,
      index: true,
      label: 'Underkategori',
      admin: {
        description: 'Valgfritt. Kun underkategorier som hører til den valgte kategorien.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Sammendrag',
      admin: { description: 'Kort ingress øverst på siden.' },
    },
    { name: 'body', type: 'richText', required: true, label: 'Innhold' },
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
        description: 'Lav verdi først innenfor kategorien/underkategorien; like verdier alfabetisk.',
      },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Forfatter',
      admin: { position: 'sidebar' },
    },
  ],
};
