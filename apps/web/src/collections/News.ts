import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';
import { slugify } from '../lib/slug';

/**
 * Phase 7 — News. A native platform-content collection (Constitution Principle II): articles are
 * authored and published in the `/cms` back-office and read by all employees in the app. News has
 * no Git source and is NOT an artifact; its only relationship is `author → users`.
 *
 * Authoring is gated to Contributor+ (the same posture as the Phase 6 admin gate); News is
 * intentionally NOT wired into `@kihub/governance-core`'s Registry permission matrix (research §3).
 * Employees only ever see `published` articles — enforced both here (the `read` access rule
 * constrains non-editors) and in `lib/news.ts` (the read queries filter `status: published`).
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const News: CollectionConfig = {
  slug: 'news',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'publishDate', 'featured', 'author'],
  },
  access: {
    // Contributor+ read everything (drafts + published) in the back-office/API; everyone else is
    // constrained to published — API-path defense in depth for the "no draft leaks" invariant (US3).
    read: ({ req }) => (isEditor(req.user) ? true : { status: { equals: 'published' } }),
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Derive a URL-safe slug from the title when the editor leaves it blank (FR-013); keep any
        // explicit slug so it stays stable across title edits.
        if (data && !data.slug && typeof data.title === 'string' && data.title.trim()) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        // Attribute authorship to the creating user by default (FR-011); editable afterwards.
        if (operation === 'create' && !data.author && req.user) {
          data.author = req.user.id;
        }
        // Stamp the publish date on first publish so the list can order newest-first (FR-004/010).
        if (data.status === 'published' && !data.publishDate) {
          data.publishDate = new Date().toISOString();
        }
        return data;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      // Not API-required: always populated by the `beforeValidate` hook from the (required) title.
      // Uniqueness — the FR-013 guarantee — comes from `unique`, not from requiredness.
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'URL handle (/news/<slug>); auto-derived from the title when left blank.' },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: { description: 'Short preview shown in the employee news list.' },
    },
    { name: 'body', type: 'richText', required: true },
    { name: 'author', type: 'relationship', relationTo: 'users' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'published'],
    },
    { name: 'publishDate', type: 'date' },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'heroImageUrl', type: 'text', label: 'Hero image URL' },
    { name: 'featured', type: 'checkbox', defaultValue: false },
  ],
};
