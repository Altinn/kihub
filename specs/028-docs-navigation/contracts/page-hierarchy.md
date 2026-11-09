# Contract: page hierarchy, nested addresses and section menu (US2, US3)

Research: R6–R14. Data model: [data-model.md](../data-model.md). Spec: FR-009–FR-025.

## A. Collection changes (`collections/Page.ts`)

```ts
fields: [
  // title, slug (description updated), summary, body, author — unchanged
  {
    name: 'parent',
    type: 'relationship',
    relationTo: 'pages',
    hasMany: false,
    index: true,
    label: 'Overordnet side',
    filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
    admin: { position: 'sidebar', description: 'Valgfritt. Siden havner under denne i adressen og i menyen. Høyst tre nivåer.' },
  },
  {
    name: 'order',
    type: 'number',
    defaultValue: 100,
    label: 'Rekkefølge',
    admin: { position: 'sidebar', description: 'Lav verdi først blant sidene med samme overordnede side; like verdier sorteres alfabetisk.' },
  },
  // optional (FR-018): { name: 'address', type: 'ui', admin: { position: 'sidebar', components: { Field: '@/components/cms/PageAddressField' } } }
],
hooks: {
  beforeValidate: [/* existing slug hook */, validatePageParentHook],
}
```

`defaultColumns` gains `parent`.

## B. `lib/page-hierarchy.ts` — `validatePageParent`

Input: `{ id?: number; parent?: number | null }` plus `req`. Runs only when `parent` is set (a
partial update without `parent` uses `originalDoc.parent`; clearing it is always allowed).

Order of checks and messages:

1. `parent === id` → «En side kan ikke være overordnet side for seg selv.»
2. Walk up from `parent` (main table, `depth: 0`, `overrideAccess: true`, max 3 steps). Meeting `id`
   → «Siden kan ikke ligge under en av sine egne undersider.»
3. `level(parent) = steps + 1`. If `level(parent) >= 3` → «Siden kan ikke ligge her: sider kan bare ha
   tre nivåer.»
4. Subtree height of `id` (0 when new): `find({ where: { parent: { in: frontier } } })`, at most two
   rounds. If `level(parent) + 1 + height > 3` → same message as 3.

Errors are `APIError(message, 400)`. A missing parent document (deleted between form load and save)
→ «Den overordnede siden finnes ikke lenger.»

## C. `lib/page-tree.ts` (pure)

```ts
export const MAX_PAGE_DEPTH = 3;

/** Split and validate a request path. null → 404 without a query. */
export function parsePagePath(segments: string[]): string[] | null;
// null when: 0 or > MAX_PAGE_DEPTH segments, any segment fails PAGE_SLUG_PATTERN after decoding,
// or segments[0] is in RESERVED_PAGE_SLUGS.

/** Canonical address from a populated page (parent objects, nearest first). null on a cycle or > 3 levels. */
export function pageAddress(page: PageWithChain): string | null;

export type SectionItem = { id: number; title: string; href: string; isCurrent: boolean; children: SectionItem[] };
export type PageSection = { title: string; root: SectionItem };

/** Section tree from all published pages; null when the root is not among them or has no children. */
export function buildPageSection(pages: PageRef[], rootId: number, currentId: number): PageSection | null;
```

Sorting: `order` ascending (missing → 100), then `title` with `localeCompare(…, 'nb')`.

## D. Read layer (`lib/pages.ts`)

- `getPageBySlug(slug, { preview })` (existing) gains `depth: 2` so `parent` and `parent.parent` are
  populated; in preview with `draft: true`. 027's preview-collision rule is unchanged.
  If population in preview does not return the parents' latest versions (R10), walk with
  `findByID({ draft: true, depth: 0 })`.
- `getPageSection(page)`: top ancestor from the populated chain; one
  `find({ collection: 'pages', where: PUBLISHED, depth: 0, pagination: false, select: { title, slug, parent, order } })`;
  `buildPageSection`. Published-only also in preview (FR-021).
- The module comment «There is deliberately NO listing function» is replaced with: the only listing is
  the section read for the menu; there is no public index of pages.

## E. Route `src/app/(app)/[...path]/page.tsx` (replaces `[slug]/page.tsx`)

```text
params.path: string[]
1. segments = parsePagePath(path)          → null ⇒ notFound()
2. page = getPageBySlug(last(segments), { preview })  → null ⇒ notFound()
3. canonical = pageAddress(page)           → null ⇒ notFound()
4. canonical !== '/' + segments.join('/')  ⇒ redirect(canonical + search)   // 307, never permanentRedirect
5. headings = extractHeadings(page.body)
6. section = getPageSection(page)          // US3
7. render <DocShell nav={section && <SectionNav section={section} />}>
          <article className="cms-page"> title, summary, <PageToc headings/>, <LearningBody body headings/> </article>
          </DocShell>
```

- `generateMetadata`: `'<title> · KI Hub'` for the resolved page (also when it will redirect).
- Fully dynamic, no static params (027 route-caching test).
- Decoding: each segment through `decodeURIComponent` in a `try`; a malformed escape → 404.
- The redirect keeps the query string. The fragment is kept by the browser (RFC 9110 §10.2.2).

## F. `components/SectionNav.tsx` (server)

```tsx
<nav className="lp-nav section-nav" aria-label={section.title}>
  <ul className="lp-nav__list">
    <li><Link href={root.href} aria-current={root.isCurrent ? 'page' : undefined} className="lp-nav__link kihub-focusable">{root.title}</Link>
      {/* children as nested <ul className="lp-nav__list section-nav__sublist">, all expanded */}
    </li>
  </ul>
</nav>
```

## G. `components/DocShell.tsx` (server)

```tsx
<div className="kihub-container">
  <div className="lp-shell" data-nav={nav ? true : undefined}>
    {nav ? (
      <div className="lp-shell__aside">
        <details className="lp-shell__disclosure">
          <summary className="lp-shell__disclosure-title kihub-focusable">{navLabel}</summary>
          {nav}
        </details>
      </div>
    ) : null}
    <main id="hovedinnhold" tabIndex={-1} className="lp-shell__content">{children}</main>
  </div>
</div>
```

`navLabel` is «Utforsk innhold» for KI Læring (unchanged) and the section title for Pages.
`LearningShell({ tree, children })` = `DocShell({ nav: tree.length ? <LearningNav tree={tree} /> : null, navLabel: 'Utforsk innhold', children })`.

## H. Skip link (`(app)/layout.tsx`)

First child of `.portal-shell`: `<a className="kihub-skip-link" href="#hovedinnhold">Hopp til hovedinnhold</a>`.
CSS: off-screen until `:focus-visible`, then fixed at the top left with high contrast. Every `(app)`
route either renders `<main id="hovedinnhold" tabIndex={-1}>` or uses `DocShell`/`LearningShell`;
`tests/unit/skip-link.test.ts` enforces it.

## I. Tests

- Unit `page-tree.test.ts`: `parsePagePath` (0/1/3/4 segments, reserved first segment, bad pattern,
  percent-encoded), `pageAddress` (1–3 levels, cycle → null), `buildPageSection` (order then title,
  nested grandchildren, unpublished root → null, root-only → null, current marked).
- Integration `pages-hierarchy.test.ts` (local API, `overrideAccess: false` as editor): B1–B4 refused
  with 400 and message; a valid three-level chain accepted; deleting a parent nulls children's `parent`.
- Integration `pages-section.test.ts`: published-only, ordering, draft child absent also with
  `preview: true`.
- Integration `pages-access.test.ts` (changed): resolution by last segment for readers and preview;
  draft page under a published parent → 404 for readers.
- Unit `page-slug.test.ts`, `route-caching.test.ts`: catch-all directory is `[...path]`.
- Unit `skip-link.test.ts`: H.
