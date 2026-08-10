import type { Role } from '@kihub/governance-core';
import { APIError, type CollectionConfig } from 'payload';

/**
 * 014 — Læringskategori, the top level of the KI Læring library (Constitution v3.1.0's fourth
 * Product Module). Native platform content owned by Payload, NOT an artifact, so the Registry
 * principles do not apply (see plan.md Constitution Check).
 *
 * Access mirrors `News.ts` exactly rather than inventing a posture: everyone reads, Contributor+
 * writes. There is deliberately no `slug` — nothing addresses a category. The employee overview
 * links into a category's first PAGE (`/laering/<page-slug>`), so a handle here would be a field, a
 * unique index and a migration column serving no route (data-model.md).
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const LearningCategory: CollectionConfig = {
  slug: 'learning-categories',
  labels: { singular: 'Læringskategori', plural: 'Læringskategorier' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'order'],
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
        // FR-016 — never orphan content into invisibility. Refuse the delete while anything still
        // points here; the editor moves or deletes the content first. Counting via `limit: 0` keeps
        // this to two cheap count queries.
        const [subcategories, pages] = await Promise.all([
          req.payload.count({
            collection: 'learning-subcategories',
            where: { category: { equals: id } },
            req,
          }),
          req.payload.count({
            collection: 'learning-pages',
            where: { category: { equals: id } },
            req,
          }),
        ]);

        if (subcategories.totalDocs > 0 || pages.totalDocs > 0) {
          const parts = [
            pages.totalDocs > 0
              ? `${pages.totalDocs} ${pages.totalDocs === 1 ? 'side' : 'sider'}`
              : null,
            subcategories.totalDocs > 0
              ? `${subcategories.totalDocs} ${subcategories.totalDocs === 1 ? 'underkategori' : 'underkategorier'}`
              : null,
          ].filter(Boolean);
          throw new APIError(
            `Kategorien har ${parts.join(' og ')} — flytt eller slett innholdet først.`,
            400,
          );
        }
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tittel' },
    {
      name: 'description',
      type: 'textarea',
      label: 'Beskrivelse',
      admin: {
        description:
          'Vises under kategorien på oversikten /laering. Tom beskrivelse gir bare tittel og lenke.',
      },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      label: 'Rekkefølge',
      admin: {
        position: 'sidebar',
        description:
          'Lav verdi først. Kategorier med samme verdi sorteres alfabetisk, så rekkefølgen er alltid forutsigbar.',
      },
    },
  ],
};
