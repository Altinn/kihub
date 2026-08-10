import type { Role } from '@kihub/governance-core';
import {
  BlockquoteFeature,
  BlocksFeature,
  BoldFeature,
  CodeBlock,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineCodeFeature,
  ItalicFeature,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
  UploadFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import { APIError, type CollectionConfig } from 'payload';
import { LEARNING_CODE_LANGUAGES } from '../lib/learning-view';
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
      async ({ data, req, originalDoc }) => {
        // FR-014 — a page's subcategory MUST belong to the page's own category.
        //
        // The `filterOptions` on the field below already restricts the admin dropdown, but that is a
        // UI affordance only: the REST/GraphQL path bypasses it entirely. This hook is the actual
        // enforcement (research §7, the same defence-in-depth posture News uses for drafts).
        const subcategory = data?.subcategory ?? null;
        if (!subcategory) return data;

        // On a partial update the incoming data may omit `category`; fall back to the stored value.
        const category = data?.category ?? originalDoc?.category;
        if (!category) return data;

        const categoryId = typeof category === 'object' ? category.id : category;
        const subcategoryId = typeof subcategory === 'object' ? subcategory.id : subcategory;

        const parent = await req.payload.findByID({
          collection: 'learning-subcategories',
          id: subcategoryId,
          depth: 0,
          overrideAccess: true,
          req,
        });

        const parentCategoryId =
          typeof parent?.category === 'object' ? parent.category.id : parent?.category;

        if (String(parentCategoryId) !== String(categoryId)) {
          throw new APIError(
            'Underkategorien hører til en annen kategori. Velg en underkategori som ligger under sidens kategori.',
            400,
          );
        }

        return data;
      },
    ],
    beforeChange: [
      ({ data, req, operation }) => {
        // Attribute authorship to the creating user by default (mirrors News.ts); editable after.
        if (operation === 'create' && !data.author && req.user) {
          data.author = req.user.id;
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
      // FR-014, the admin half: only offer subcategories of the category chosen on this page, so the
      // editor cannot pick an invalid one by accident. `false` while no category is selected yet —
      // an unfiltered list would offer choices that the beforeValidate hook would then reject.
      // The hook is the real enforcement; this is the affordance that keeps editors out of the error.
      filterOptions: ({ data }) =>
        data?.category ? { category: { equals: data.category } } : false,
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
    {
      name: 'body',
      type: 'richText',
      required: true,
      label: 'Innhold',
      /**
       * FIELD-level editor, deliberately not the global `editor:` in payload.config.ts — changing
       * that would alter the News editor as a side effect (contracts/learning-editor.md §A).
       *
       * `h1` is excluded: the page's own title is the h1, so an editor-authored h1 would break the
       * document outline.
       */
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          BoldFeature(),
          ItalicFeature(),
          InlineCodeFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
          LinkFeature(),
          BlockquoteFeature(),
          HorizontalRuleFeature(),
          // Inline images (FR-020/021). `alt` lives on the media document — entered once, reused
          // everywhere; `decorative` is per-PLACEMENT, because the same asset can be meaningful on
          // one page and decoration on another (research §5).
          UploadFeature({
            collections: {
              media: {
                fields: [
                  {
                    name: 'decorative',
                    type: 'checkbox',
                    label: 'Dekorativt bilde (tom alt-tekst)',
                  },
                ],
              },
            },
          }),
          // Code samples (FR-026). Payload's premade block supplies the language dropdown and the
          // code editor; we only supply the curated language map, whose ids are valid for BOTH
          // Monaco (this editor) and shiki (the employee surface), so no id translation exists to
          // drift (research §2).
          BlocksFeature({
            blocks: [
              CodeBlock({
                languages: LEARNING_CODE_LANGUAGES,
                defaultLanguage: 'shell',
              }),
            ],
          }),
        ],
      }),
    },
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
