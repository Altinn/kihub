import type { Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig } from 'payload';

/**
 * 014 — Læringsunderkategori, the SECOND AND FINAL level of grouping (FR-013).
 *
 * The hierarchy depth is enforced structurally, not by validation: this collection has no
 * `subcategory` field, so there is nothing to nest into. That absence is the requirement — a rule
 * could be bypassed on the API path, a missing field cannot be.
 *
 * Like categories, deliberately no `slug`: nothing addresses a subcategory (data-model.md).
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const LearningSubcategory: CollectionConfig = {
  slug: 'learning-subcategories',
  labels: { singular: 'Læringsunderkategori', plural: 'Læringsunderkategorier' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'order'],
    group: 'KI Læring',
  },
  access: {
    read: () => true,
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    beforeDelete: [
      async ({ id, req }) => {
        // FR-016 — same guard as the category: refuse while pages still point here.
        const pages = await req.payload.count({
          collection: 'learning-pages',
          where: { subcategory: { equals: id } },
          req,
        });
        if (pages.totalDocs > 0) {
          throw new APIError(
            `Underkategorien har ${pages.totalDocs} ${pages.totalDocs === 1 ? 'side' : 'sider'} — flytt eller slett innholdet først.`,
            400,
          );
        }
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tittel' },
    {
      // Required and single-valued: a subcategory belongs to exactly one category (FR-013).
      name: 'category',
      type: 'relationship',
      relationTo: 'learning-categories',
      hasMany: false,
      required: true,
      index: true,
      label: 'Kategori',
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      label: 'Rekkefølge',
      admin: {
        position: 'sidebar',
        description: 'Lav verdi først; like verdier sorteres alfabetisk.',
      },
    },
  ],
};
