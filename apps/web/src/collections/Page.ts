import type { CollectionConfig } from 'payload';
import { articleEditor } from '../lib/article-editor';
import { CONTENT_VERSIONS, contentAccess } from '../lib/content-versions';
import { validatePageParent } from '../lib/page-hierarchy';
import { resolvePageSlug, validatePageSlug } from '../lib/page-slug';
import { previewUrl } from '../lib/preview-paths';

/**
 * 027 US3 — Side: a standalone information page («Om KI Hub», «Kontakt», …) served to employees at
 * `/<slug>` (contracts/pages.md, research R11/R12). Native platform content (Constitution
 * Principle II, Pages module since v3.3.0), NOT an artifact.
 *
 * Deliberately simple: no layout blocks, no SEO plugin. 028 (specs/028-docs-navigation) adds an
 * optional parent («Overordnet side», at most three levels) and an order among siblings: the address
 * is the ancestors' slugs plus the page's own (`/<parent>/<slug>`), computed at request time
 * (`lib/page-tree.ts`), never stored. `slug` stays unique across all pages, so the last segment
 * identifies a page and old or moved addresses redirect to the current one. The body uses the same editor as KI Læring (`lib/article-editor.ts`) and renders with
 * `LearningBody`. Drafts, version history and «Forhåndsvis» come from the shared 027 setup
 * (`lib/content-versions.ts`); `readVersions` keeps draft content editor-only.
 *
 * Addresses: built-in sections always win the route (Next matches static segments first), so
 * `validatePageSlug` refuses every address KI Hub already uses, and `lib/page-slug.ts`'s drift test
 * keeps that list in step with the route tree. Linking a page in the menu or footer needs no code:
 * editors add it in Site Chrome.
 */
export const Page: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Side', plural: 'Sider' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'parent', '_status', 'updatedAt'],
    // «Forhåndsvis»: opens the latest draft at its real address for editors (lib/preview-paths.ts).
    // 028: `/<slug>` is enough even for a nested page — the route redirects it, in preview, to the
    // address computed from the latest versions of the page and its ancestors (research R10).
    // Drafts skip field validation, so a draft can sit on a reserved or malformed address; its
    // preview would open a built-in section or a 404, so the button is hidden until it is valid.
    preview: (doc) =>
      validatePageSlug(doc?.slug) === true ? previewUrl('pages', doc.slug as string) : null,
  },
  access: contentAccess,
  versions: CONTENT_VERSIONS,
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (!data) return data;
        // A partial update that does not send `slug` (e.g. `PATCH { title }` through the API) keeps
        // the stored address: re-deriving it from the new title would move a published page and
        // break every menu/footer link to it.
        if (data.slug === undefined && originalDoc?.slug) return data;
        // Otherwise store the normalised address (`/Om-KI-Hub/` → `om-ki-hub`), or derive it from
        // the title when blank (News/Project precedent). A title «News» therefore derives `news`
        // and is refused. An explicitly cleared address is re-derived on the next save.
        const slug = resolvePageSlug(data.slug, data.title ?? originalDoc?.title);
        if (slug) data.slug = slug;
        else if (data.slug !== undefined) data.slug = null; // never '' — the column is unique
        return data;
      },
      // 028 US2: no self-parent, no cycles, at most three levels — on the form AND the API path.
      validatePageParent,
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        // Attribute authorship to the creating user by default (LearningPage precedent); editable after.
        if (operation === 'create' && !data.author && req.user) {
          data.author = req.user.id;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tittel',
      // Payload's `required` accepts whitespace; a blank title would derive no address.
      validate: (value: string | null | undefined) =>
        typeof value === 'string' && value.trim().length > 0
          ? true
          : 'Tittel kan ikke være tom eller bare mellomrom.',
    },
    {
      // Not API-required: the beforeValidate hook derives it from the (required) title.
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      label: 'Adresse',
      // Judged by the address it WILL be saved on: the admin form validates what the editor typed
      // before the hook runs, so a blank field is checked as the address derived from the title.
      validate: (value: string | null | undefined, { siblingData }: { siblingData: Partial<{ title: string }> }) =>
        validatePageSlug(resolvePageSlug(value, siblingData?.title)),
      admin: {
        description:
          'Sidens eget adresseledd. Uten overordnet side er adressen /<adresse>, ellers /<overordnet>/<adresse>. Må være unikt blant alle sider, også i andre seksjoner. Utledes fra tittelen når feltet står tomt. Kan ikke være en adresse KI Hub allerede bruker.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Ingress',
      admin: { description: 'Kort ingress øverst på siden (valgfri).' },
    },
    { name: 'body', type: 'richText', required: true, label: 'Innhold', editor: articleEditor },
    {
      // 028 US2: the section this page belongs to. Stored as `pages.parent_id` and, in the version
      // table, `_pages_v.version_parent_id` — not `_pages_v.parent_id`, which is Payload's own
      // "version of which document" column.
      name: 'parent',
      type: 'relationship',
      relationTo: 'pages',
      hasMany: false,
      index: true,
      label: 'Overordnet side',
      // The dropdown hides the page itself; cycles and depth are enforced by `validatePageParent`.
      filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
      admin: {
        position: 'sidebar',
        description:
          'Valgfritt. Siden havner under denne i adressen og i menyen til venstre. Høyst tre nivåer.',
      },
    },
    {
      // 028 FR-018: the full address, read-only (components/cms/PageAddressField.tsx).
      name: 'address',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '/components/cms/PageAddressField#PageAddressField' },
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
          'Lav verdi først blant sidene med samme overordnede side; like verdier sorteres alfabetisk.',
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
