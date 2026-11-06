# Contract: `pages` collection and the `/<slug>` route

Research: R11, R12. Data model: data-model.md §2.

## A. Collection

```ts
export const Page: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Side', plural: 'Sider' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
    preview: (doc) => previewUrl('pages', doc?.slug),
  },
  versions: CONTENT_VERSIONS,
  access: contentAccess,
  hooks: {
    beforeValidate: [/* slug ← slugify(title) when blank (News/Project precedent) */],
    beforeChange: [/* author ← req.user on create (LearningPage precedent) */],
  },
  fields: [
    { name: 'title', type: 'text', required: true, label: 'Tittel', validate: nonBlank },
    { name: 'slug', type: 'text', unique: true, index: true, label: 'Adresse',
      validate: validatePageSlug,
      admin: { description: 'Sidens adresse: /<adresse>. Utledes fra tittelen når feltet står tomt. Kan ikke være en adresse KI Hub allerede bruker.' } },
    { name: 'summary', type: 'textarea', label: 'Ingress' },
    { name: 'body', type: 'richText', required: true, label: 'Innhold', editor: articleEditor },
    { name: 'author', type: 'relationship', relationTo: 'users', label: 'Forfatter', admin: { position: 'sidebar' } },
  ],
};
```

## B. `validatePageSlug` (`lib/page-slug.ts`, pure)

Input normalised: `trim` → lowercase → strip leading/trailing `/`. Then:

| Input | Result |
|---|---|
| `om-ki-hub` | ok |
| `news`, `/News/`, `LAERING`, `api`, `cms`, `payload-api`, `signin`, `bidra`, `brand` | «Adressen «…» er reservert av KI Hub. Velg en annen.» |
| `om/kontakt`, `om ki`, `æøå`, `-x`, `x-`, `a--b`, `` | «Adressen kan bare inneholde små bokstaver a–z, tall og bindestrek.» |

`RESERVED_PAGE_SLUGS` drift test: every top-level static segment under `src/app/(app)`, `(auth)`,
`(payload)`, `src/app/api`, and every top-level entry in `public/` ∈ the list.

## C. Route `GET /<slug>` — `src/app/(app)/[slug]/page.tsx`

- Behind `(app)/layout.tsx` → `requireSession()` (employees only, FR-025).
- `const { active } = await getPreviewState(); const page = await getPageBySlug(decoded, { preview: active })`.
- `null` → `notFound()` (the portal's standard 404, FR-022). Also `notFound()` without a query when the
  decoded slug fails `PAGE_SLUG_PATTERN` (cheap reject of junk addresses).
- Renders inside `<main className="kihub-container">`: `<h1 class="kihub-h2">` title, optional
  `kihub-lead` summary, `LearningBody` for the rich text. Styles: a small `027 /<slug> pages` section in
  `portal.css` on `--kihub-*` tokens only (reusing `.lp-page` rhythm where possible).
- `generateMetadata` → `{ title: '<title> · KI Hub' }`; unknown/draft (non-preview) → default title.
- Static segments (`/news`, `/laering`, …) are matched by Next before `[slug]` — asserted in quickstart.

## D. Navigation

No code change: editors add `{ label, href: '/<slug>' }` to `site-chrome` → `nav` or `footer.links`.
A link to an unpublished/deleted page shows the 404 (US3 #5).
