# Research: Documentation Navigation for Pages

Feature: [spec.md](./spec.md). Baseline: `main` at `0e95ae6` (2026-11-06), Payload 3.92.1, Next.js 16.4.1.

## R1 — Headings have no `id` today

**Finding**: `components/LearningBody.tsx` passes `defaultConverters` through for headings. In
`@payloadcms/richtext-lexical@3.92.1` the heading converter
(`dist/features/converters/lexicalToJSX/converter/converters/heading.js`) is
`<NodeTag>{children}</NodeTag>`: no attributes. Pages (`[slug]/page.tsx`) and KI Læring pages
(`laering/[slug]/page.tsx`) both render through `LearningBody`, so neither has anchors.

**Decision**: override `heading` in `LearningBody`'s converters (R3). One change covers both content types.

## R2 — Anchor format: ASCII via `slugify`

**Decision**: anchors come from `lib/slug.ts`'s `slugify` (æ → ae, ø → o, å → a, NFKD without marks,
non-alphanumeric runs → `-`, trimmed). Duplicates get `-2`, `-3`, … in document order. Empty result
→ `avsnitt`. A small reserved set (`RESERVED_ANCHORS`, today `site-nav-list` and `hovedinnhold`)
gets a suffix too.

**Rationale**:

- **Payload's link field rejects non-ASCII fragments.** `lexical/utils/url.js`'s
  `relativeOrAnchorRegExp` is `/^(?:\/[\w\-./]*(?:\?[-;&=%\w]*)?(?:#[\w-]+)?|#[\w\-]+)$/`; `\w`
  is ASCII-only. The link `url` field's `beforeChange` hook runs `encodeURIComponent` on a whole URL
  that fails `validateUrl`, so `/side#før-du-starter` would be stored as
  `%2Fside%23f%C3%B8r-du-starter`, a broken relative link. ASCII anchors avoid this entirely.
- **One rule for addresses and anchors** is easy to explain to editors and already unit-tested.
- Duplicate suffixing matches GitHub and Hugo, so editors who know either will not be surprised.

**Alternatives considered**:

- *Unicode anchors like Hugo* (docs.altinn.studio produces `før-du-starter`): nicer in the address
  bar, but breaks every editor-written link because of the validator above. Rejected.
- *Stored, editor-managed anchors*: stable across heading edits, but Lexical's heading node has no
  field slot; it needs a custom node or an extended `HeadingFeature`, plus editor UI. Rejected for
  now (spec Assumptions).
- *Prefixing anchors* (`h-for-du-starter`) to rule out collisions: uglier links for a risk the
  reserved set already covers. Rejected.

## R3 — One pure extractor shared by renderer and table of contents

**Decision**: new `lib/headings.ts` exports `extractHeadings(body)`, a pure function that walks the
Lexical JSON depth-first and returns `{ node, level, text, id }[]` for every `heading` node with tag
`h2`–`h4`. `text` is the concatenation of descendant `text` nodes (so bold, inline code and link text
count), with `linebreak` as a space, whitespace collapsed and trimmed. `LearningBody` calls it once per
render, builds a `WeakMap<node, id>`, and passes a heading converter that looks the node up. The
table of contents receives the same list.

**Rationale**: the converter and the TOC cannot disagree, because both read the ids computed from the
same objects in the same order. A `WeakMap` keyed on node identity needs no counters inside the
converter (converters are called per node with no index). Everything runs on the server, so no
client JavaScript and no layout shift.

**Alternatives considered**:

- *Build the TOC from the DOM in a client component*: simpler to write, but it needs JavaScript,
  shifts the layout after hydration, and breaks the portal's no-JS navigation pattern (014 FR-005).
  Rejected.
- *Store the heading list on save* (a hook writing a `toc` field): extra column, migration and a
  second source of truth for something that is cheap to compute. Rejected.

**Note**: `LearningBody`'s converters are currently a module-level constant. They become a function
of the per-render map, created inside the component.

## R4 — Heading self-links

**Decision**: the converter renders the heading followed by a sibling link, wrapped in a
`div.kihub-heading`:

```html
<div class="kihub-heading">
  <h2 id="for-du-starter">Før du starter</h2>
  <a class="kihub-heading__anchor" href="#for-du-starter" aria-label="Lenke til avsnittet «Før du starter»">#</a>
</div>
```

The link is visually hidden until the wrapper is hovered or the link is focused.

**Rationale**: a link *inside* the heading would add its text to the heading's accessible name in some
screen readers («Før du starter, lenke, #»). A sibling keeps the heading clean and the link
reachable. docs.altinn.studio uses a non-focusable `<span>` with a clipboard script, which keyboard
users cannot reach; a plain link works without JavaScript and can be copied with the context menu.

**Alternative**: a copy button (`CopyButton` exists). Needs client JS per heading; can be added later.

## R5 — Table of contents layout without duplicate markup

**Decision**: `components/PageToc.tsx` (server) renders one
`<details class="page-toc"><summary>På denne siden</summary><nav aria-label="Innhold på siden">…</nav></details>`,
placed in the article between the header (title, meta, summary) and the body. The list is nested
`<ol>`s: h3 under the preceding h2, h4 under the preceding h3 (or h2 when no h3 precedes it).

- **≥ 1200px**: the article is a two-column grid (`minmax(0, 1fr) 13rem`); the TOC is placed in
  column 2 spanning all rows, `position: sticky`, `max-height: calc(100vh - <space>)`, `overflow: auto`.
  The `<details>` is forced open and its `<summary>` hidden, the same two-rule technique `LearningShell`
  uses (`::details-content` and the child display rule).
- **< 1200px**: single column; the collapsed `<details>` sits where it is in the DOM, before the body.

The 1200px breakpoint follows from the widths: container 1200px, section menu 15rem, gap 2.5rem,
TOC 13rem and gap leave about 660px for text, close to `--kihub-prose-width` (640px).

**Rationale**: one emission means one landmark for assistive technology and no hidden duplicate. DOM
order (title → TOC → body) is also a sensible reading order on wide screens.

**Not included**: scrollspy (highlighting the current section while scrolling). docs.altinn.studio has
none, and it needs an `IntersectionObserver` client component.

## R6 — Hierarchy fields on `pages`

**Decision**: add two fields to `collections/Page.ts`:

- `parent`: `relationship` → `pages`, `hasMany: false`, `index: true`, label «Overordnet side»,
  sidebar. `filterOptions` excludes the page itself (`id not_equals`).
- `order`: `number`, `defaultValue: 100`, label «Rekkefølge», sidebar, same description as KI Læring.

**Naming note**: Payload's version table already has a column `_pages_v.parent_id` (the document a
version belongs to). Our field is stored as `pages.parent_id` and `_pages_v.version_parent_id`, so
there is no clash, but queries on `versions` must say `version.parent` for the page's parent. The
nested-docs plugin uses the same field name, so it is an established convention.

**Alternatives considered**:

- `@payloadcms/plugin-nested-docs`: adds `parent` plus a stored `breadcrumbs` array with URLs, and
  re-saves every descendant when an ancestor changes. With drafts enabled (027), a re-save of a
  published child through the local API can create a new published version on top of an editor's
  pending draft. It is also a new dependency, and 027 R11 rejected it. Rejected; R7 makes stored
  breadcrumbs unnecessary.
- A separate `sections` collection or a navigation global (alternatives D and E in the team's
  investigation): two places to maintain, and globals have no drafts. Rejected; the product owner
  chose Pages-only menus, and the parent field keeps the page as the single source.

## R7 — Addresses are computed, not stored; the last segment identifies the page

**Decision**: a page's address is `/` + its ancestors' slugs + its own slug, computed when needed.
`slug` stays globally unique (no index change). A request is resolved by its **last** segment:

1. Reject without a query if there are more than 3 segments, any segment fails `PAGE_SLUG_PATTERN`,
   or the first segment is in `RESERVED_PAGE_SLUGS` (→ 404).
2. Find the page by `slug = last segment` (published for readers, latest version in preview), with
   `depth: 2` so the parent chain is populated.
3. Compute the canonical address from the chain. If it differs from the request path, `redirect()`
   (307) to it, keeping the query string. Otherwise render.

**Rationale**:

- **Moves never break links.** Any old path that ends in the page's slug, including the old flat
  address, reaches the page. This preserves the reason 014 (FR-010) and 027 (R12) chose flat
  addresses.
- **No cascading writes.** Moving or renaming a parent changes nothing stored on its descendants, so
  there is no interaction with drafts, versions or autosave, and no migration of existing data.
- **Fragments survive.** Browsers keep the original `#fragment` when a redirect's `Location` has none
  (RFC 9110 §10.2.2), so `/old/path#avsnitt` lands on the section at the new address.

**Why 307, not 308**: a permanent redirect is cached by browsers. If a page moves A → B and later
back B → A, a cached 308 from A to B plus a fresh redirect from B to A would loop until the cache is
cleared. A temporary redirect costs one extra request per old link and cannot loop.

**Cost**: global uniqueness of slugs means two sections cannot both have `oversikt` (spec
Assumptions). A changed slug (as opposed to a move) still breaks old links, exactly as today.

**Alternative considered**: a stored, unique `path` column maintained by hooks, plus redirects for
old paths (a `previousPaths` field or `@payloadcms/plugin-redirects`). Faster lookup in theory, but
it needs descendant re-saves on every parent change (the R6 draft problem), a backfill, and a
redirect store. Rejected.

## R8 — Route: `[...path]` replaces `[slug]`

**Decision**: move `src/app/(app)/[slug]/page.tsx` to `src/app/(app)/[...path]/page.tsx`. Next does
not allow `[slug]` and `[...path]` side by side at the same level, so it is a rename, not an addition.

**Precedence**: static segments still win (`/news`, `/laering`, …). A deeper unknown address under a
built-in section, such as `/news/a/b`, fails `news/[slug]` and falls through to the catch-all; step 1
of R7 rejects it on its reserved first segment, so it is a 404 and never a redirect to some page `b`.

**Tests to update**: `tests/unit/route-caching.test.ts` lists `'[slug]/page.tsx'`, and
`tests/unit/page-slug.test.ts` asserts `dirs('(app)')` contains `'[slug]'`. Both move to `[...path]`.
The drift test's scanner already skips `[`-prefixed directories.

## R9 — Hierarchy rules in a `beforeValidate` hook

**Decision**: a hook on `pages` (same placement and posture as `LearningPage.ts`'s subcategory check)
that, when `parent` is set:

- refuses `parent === id`;
- walks up from the parent (`findByID`, `depth: 0`, at most 3 steps) and refuses if it meets the page
  itself (cycle) or if the parent already sits at level 3;
- computes the height of the page's own subtree (`find` where `parent in [ids]`, at most 2 rounds)
  and refuses if `level(parent) + 1 + height > 3`.

Messages are Norwegian, thrown as `APIError(…, 400)` so the API path is enforced, not only the form.

**Scope of the check**: ancestors and descendants are read from the main table (any status). A draft
that only changes `parent` in a version row is checked when it is saved, against the current main-table
state; two concurrent drafts can in theory combine into a cycle at publish, so the check also runs on
publish (it is a `beforeValidate` hook and runs on every save). The renderer additionally stops
walking after 3 steps (R7), so a corrupt cycle can never hang a request.

## R10 — Preview needs no new address logic

**Decision**: keep `admin.preview` as `previewUrl('pages', slug)` → `/api/preview?path=/<slug>`.
The preview cookie is set first, then the catch-all route resolves the slug *in preview* (latest
versions, populated with `draft: true`) and redirects to the future nested address (R7, step 3).

**Rationale**: `admin.preview` receives the document with `parent` as an id, so it cannot build the
nested address synchronously. The redirect gives the right address with no change to
`lib/preview-paths.ts`. The 027 preview collision handling in `getPageBySlug` (several drafts claiming
one slug) is kept.

**To verify during implementation**: that `find({ draft: true, depth: 2 })` populates the parent
chain with the parents' latest versions in 3.92.1. If it does not, walk the chain with
`findByID({ draft: true })` per level (at most 2 extra queries, preview only).

## R11 — Section menu: data and component

**Decision**: new `getPageSection(page)` in `lib/pages.ts`: find the top-level ancestor, then read all
**published** pages (`depth: 0`, `select: id, title, slug, parent, order`, `pagination: false`) and
build the section tree in a pure `buildPageSection(pages, rootId, currentId)` in a new
`lib/page-tree.ts` (sorting by `order`, then `title`, like `byOrderThenTitle` in `learning-view.ts`).
Returns `null` when the root is unpublished or the section has only the root.

The menu reuses `LearningNav`'s markup and CSS pattern (`lp-nav__list`, `aria-current="page"`), in a
new `components/SectionNav.tsx` with `<nav aria-label="<root title>">`. All levels are expanded.

**Why read all published pages**: the collection is small (tens of pages), the query is one indexed
read, and it avoids a recursive query per level. `pages.ts`'s comment «There is deliberately NO listing
function» is updated: the listing exists for the section menu only, never as a public index.

**Rejected**: generalising `buildLearningTree` to serve both. Learning's tree has categories and
subcategories that are not pages; a separate 40-line builder is clearer than a shared abstraction.

## R12 — A shared shell and a skip link

**Decision**:

- `components/DocShell.tsx` (new, server) takes `nav?` and `children`. It renders the
  `kihub-container` with the existing `.lp-shell` grid and the phone `<details>` disclosure, with the
  content column as `<main id="hovedinnhold" tabIndex={-1}>`. `LearningShell` becomes a thin wrapper
  that passes `LearningNav` and the «Utforsk innhold» label, so KI Læring's markup and CSS stay as they
  are.
- `(app)/layout.tsx` gets `<a class="kihub-skip-link" href="#hovedinnhold">Hopp til hovedinnhold</a>`
  as its first child, before the preview banner and the header.
- Every route under `(app)` that renders its own `<main>` gets `id="hovedinnhold" tabIndex={-1}` (10
  files today, listed in plan.md; the CMS page route moves to `DocShell`). A unit test fails if a `page.tsx` under `(app)` renders `<main` without it or
  without using `DocShell`/`LearningShell`.

**Rationale**: the menu sits outside `<main>`, so the skip link lands past it (spec FR-024) and the
landmarks are correct (`nav` beside `main`, not inside it). There is no skip link anywhere in the
portal today; WCAG 2.4.1 needs one once a menu precedes the content.

## R13 — Site menu highlighting comes for free

**Finding**: `components/SiteNav.tsx`'s `isActivePath` marks an item current when the path equals its
`href` or starts with `href + '/'`. With nested addresses, a «Kom i gang» item linking to
`/kom-i-gang` is marked on `/kom-i-gang/...` with no code change (spec FR-017).

## R14 — Showing the full address in the CMS (FR-018, SHOULD)

**Decision**: a `ui` field «Adresse på nettstedet» in the sidebar with a small server component that
resolves the canonical address for the document id (reusing R7's chain walk) and shows it as text with
a link. Needs `importMap.js` regeneration. If it proves fiddly it can ship after US2 without blocking it.

**Alternative**: only the «Forhåndsvis» button, which already lands on the address. Acceptable fallback.

## R15 — Migration

**Decision**: one generated migration (`<ts>_pages_hierarchy`), additive only:

- `pages`: `parent_id integer` (FK → `pages.id` `ON DELETE SET NULL`, index), `order numeric DEFAULT 100`.
- `_pages_v`: `version_parent_id integer` (FK → `pages.id` `ON DELETE SET NULL`, index),
  `version_order numeric DEFAULT 100`.

No backfill: every existing page gets no parent and order 100, which is today's behaviour (FR-019).
`ON DELETE SET NULL` turns a deleted parent's children into top-level pages (spec edge case). Generate
in `MEDIA_STORAGE_MODE=azure` (CLAUDE.md gotcha: otherwise the diff drops `media._objectkey`).

## R16 — Constitution

**Decision**: MINOR 3.3.0 → 3.4.0. The **Pages** bullet changes from «served at a flat, one-segment
address (`/<slug>`)» to a hierarchy of at most three levels served at nested addresses, the last
segment unique, old paths redirected, with a section menu of published Pages. Materially expanded
module guidance ⇒ MINOR (same policy as 3.1.0–3.3.0). Principle VII (Start Simple) is satisfied: no
new dependency, no stored paths, no new collection.

## Out of scope (recorded so they are not lost)

- **Internal links render as `href="#"`.** `LinkFeature()` offers «Intern lenke» for collections with
  `enableRichTextLink` (the default), but `LearningBody` passes no `internalDocToHref`, so the default
  `LinkJSXConverter` logs an error and falls back to `#`. A separate fix PR: map collection → prefix
  (as `lib/preview-paths.ts` does) and, for `pages`, link `/<slug>` and let R7 redirect.
- Stable anchors across heading edits, scrollspy, collapsible menu groups, non-unique slugs per
  section, menus that include KI Læring pages or external links.
