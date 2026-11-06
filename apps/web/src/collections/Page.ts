import type { CollectionConfig } from 'payload';
import { articleEditor } from '../lib/article-editor';
import { CONTENT_VERSIONS, contentAccess } from '../lib/content-versions';
import { normalizePageSlug, validatePageSlug } from '../lib/page-slug';
import { previewUrl } from '../lib/preview-paths';
import { slugify } from '../lib/slug';

/**
 * 027 US3 — Side: a standalone information page («Om KI Hub», «Kontakt», …) served to employees at
 * `/<slug>` (contracts/pages.md, research R11/R12). Native platform content (Constitution
 * Principle II, Pages module since v3.3.0), NOT an artifact.
 *
 * Deliberately flat and simple: one address segment, no nesting, no layout blocks, no SEO plugin.
 * The body uses the same editor as KI Læring (`lib/article-editor.ts`) and renders with
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
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    // «Forhåndsvis»: opens the latest draft at its real address for editors (lib/preview-paths.ts).
    preview: (doc) => previewUrl('pages', doc?.slug as string | undefined),
  },
  access: contentAccess,
  versions: CONTENT_VERSIONS,
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // Normalise what the editor typed (`/Om-KI-Hub/` → `om-ki-hub`) so a reserved address is
        // caught in any spelling and the stored value is exactly what the route matches.
        if (typeof data.slug === 'string') data.slug = normalizePageSlug(data.slug);
        // Derive from the title when blank, and keep an explicit slug stable across title edits
        // (News/Project precedent). A title «News» therefore derives `news` and is refused.
        if (!data.slug && typeof data.title === 'string' && data.title.trim()) {
          data.slug = slugify(data.title);
        }
        return data;
      },
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
      validate: (value: string | null | undefined) => validatePageSlug(value),
      admin: {
        description:
          'Sidens adresse: /<adresse>. Utledes fra tittelen når feltet står tomt. Kan ikke være en adresse KI Hub allerede bruker.',
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
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      label: 'Forfatter',
      admin: { position: 'sidebar' },
    },
  ],
};
