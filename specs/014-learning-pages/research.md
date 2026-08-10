# Phase 0 Research: Learning Pages (KI Læring)

**Feature**: `014-learning-pages` | **Date**: 2026-08-10 | **Spec**: [spec.md](./spec.md)

Every claim below was verified against the installed packages in this repo (`payload@3.85.2`,
`@payloadcms/richtext-lexical@3.85.2`, `next@16.2.11`, `react@19.2.7`) or against the vendor's own
current documentation. Version-sensitive findings cite the file inspected.

---

## §1 The route `/laering` is already anticipated by the design system

`src/styles/kihub/README.md:59` — the design system's own usage example links
`<a className="kihub-btn kihub-btn--primary" href="/laering">KI Læring →</a>`.

**Finding**: the ASCII route segment `laering` and the visible label "KI Læring" were already
chosen by the design project; this feature is not inventing them. Confirms spec Assumption 1 and
removes the last doubt about `/laering` vs `/ki-laering` vs `/læring`.

**Consequence**: no navigation naming decision is open. `DEFAULT_SITE_CHROME` gains
`{ label: 'KI Læring', href: '/laering' }`.

---

## §2 Payload's premade `CodeBlock` exists — use it, don't build one

The spec's code-block requirement (FR-026) does **not** need a hand-rolled block. Inspected
`dist/features/blocks/premade/CodeBlock/index.js`:

```js
export const CodeBlock = _args => {
  const { fieldOverrides, ...args } = _args || {};
  const languages = args?.languages || defaultLanguages;
  return {
    slug: args?.slug || 'Code',
    admin: { components: { Block: { path: '@payloadcms/richtext-lexical/client#CodeBlockBlockComponent', ... } } },
    fields: [
      { name: 'language', type: 'select', admin: { hidden: true }, defaultValue: ..., options: ... },
      { name: 'code', type: 'code', admin: { components: { Field: { path: '...#CodeComponent' } } }, label: '' },
    ],
    ...
  };
};
```

**Decision**: use `CodeBlock({ languages: LEARNING_CODE_LANGUAGES })` inside `BlocksFeature`.

**Rationale**:
- It supplies the whole authoring UX for free: the language dropdown rendered into the block header
  (`CodeBlockBlockComponent`) and a real code editor for the `code` field (`CodeComponent`). Both are
  admin-only components, inside the Designsystemet exemption (Principle VIII).
- Its `languages` option takes a `Record<langId, Label>` map, so **we supply our own curated map**
  (FR-028's curated set). This matters more than it looks: the built-in `defaultLanguages` list is
  Monaco's language ids (`dist/.../Component/defaultLanguages.js`) and notably **has no `json`**.
  Supplying our own map lets us use ids that are simultaneously valid Monaco ids (admin editor) and
  valid shiki ids (employee rendering), so **no id translation table is needed anywhere**.

**Caveat, recorded deliberately**: both `CodeBlock` (`index.d.ts`) and its converter are annotated
`@experimental - this API may change in future, minor releases`. Accepted: the blast radius is one
block definition, the stored shape (`{ language, code }`) is trivial and ours, and we own the
employee-facing renderer regardless. If the factory breaks on a Payload bump, replacing it with a
plain `Block` of the same two fields is a few lines and the stored data still reads.

**Curated language map** (FR-026/FR-028), each id valid in both Monaco and shiki:

| id | Label (Norwegian UI) |
|----|----------------------|
| `shell` | Shell |
| `json` | JSON |
| `yaml` | YAML |
| `typescript` | TypeScript |
| `javascript` | JavaScript |
| `python` | Python |
| `markdown` | Markdown |
| `plaintext` | Ren tekst |

---

## §3 Rich-text rendering: the JSX converters are SYNCHRONOUS — this drives the highlighter choice

Inspected `dist/features/converters/lexicalToJSX/converter/types.d.ts`:

```ts
export type JSXConverter<TNode> = ((args: JSXConverterArgs<TNode>) => React.ReactNode) | React.ReactNode;
```

and `.../Component/index.d.ts`:

```ts
export type JSXConvertersFunction<T> = (args: { defaultConverters: JSXConverters<DefaultNodeTypes> }) => JSXConverters<T>;
type RichTextProps = { className?, converters?: JSXConverters | JSXConvertersFunction, disableContainer?, ... }
```

**Finding**: a converter returns `React.ReactNode`, not a promise. There is no async converter hook.
Custom block rendering is registered as `converters={({ defaultConverters }) => ({ ...defaultConverters,
blocks: { Code: … }, upload: … })}`.

**Consequence**: the syntax highlighter must be callable **synchronously**, or the converter has to
return an element whose component is an async server component (an extra RSC suspense boundary per
code block, and a highlighter init race). §4 resolves this by choosing shiki's synchronous path, so
no async component and no Suspense boundary is introduced.

---

## §4 Syntax highlighting: shiki, synchronous core, JavaScript regex engine, no WASM

Verified against shiki's current docs ([sync usage](https://shiki.style/guide/sync-usage),
[theme colors](https://shiki.style/guide/theme-colors)) and npm (`shiki@4.4.3`, `engines.node >= 20`).

**Decision**: `shiki@4.4.3`, fine-grained bundle, created **once** at module scope as a synchronous
singleton:

```ts
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
// plus one `@shikijs/langs/<id>` import per curated language, and the CSS-variables theme
```

**Rationale**:
- `createHighlighterCoreSync` (shiki ≥ 1.16) is the only creation path that is synchronous, which is
  exactly what §3 requires. The Oniguruma engine *cannot* be created synchronously — the docs are
  explicit — so the JavaScript regex engine is not a preference here, it is the requirement.
- `createJavaScriptRegexEngine` ships **no WebAssembly**. That removes a whole class of Next 16
  bundling problems (no `shiki/wasm` asset to trace into the standalone output, which this repo
  builds — `.next/standalone`).
- The fine-grained bundle means only the 8 curated grammars are bundled, not shiki's full ~200.
- Module-scope singleton = grammars are compiled once per server process, not per request. This is
  what keeps SC-010 true for pages with many code blocks.

**Alternatives rejected**:
- *`codeToHtml` (async, full bundle) + `dangerouslySetInnerHTML`*: needs an async component per block
  (§3), ships the whole grammar set, and puts raw HTML injection on the page — awkward against FR-030
  even though shiki escapes its input.
- *Client-side highlighting*: violates FR-037 (server-rendered by default) and produces an unstyled
  flash. Also ships a highlighter to every reader.
- *No highlighting (plain `<pre>`)*: rejected by the user's explicit decision.

### §4.1 Rendering tokens as React elements, not HTML strings

**Decision**: call `highlighter.codeToTokens(code, { lang, theme })` and render the token array as
React elements (`<span style={{ color: token.color }}>`), never `dangerouslySetInnerHTML`.

**Rationale**: FR-030 forbids editor content injecting executable markup. Rendering tokens as React
children means editor-supplied code is *text children* — React escapes it by construction, and there
is no HTML-string path to audit. It also makes FR-027 (code is inert) structurally true rather than a
promise: nothing ever parses the sample as markup.

### §4.2 Colours must resolve through the token layer — and 012 already set the precedent

FR-034 forbids a vendor theme's fixed palette. shiki's answer is `createCssVariablesTheme`
(from `shiki/core`), which emits `color: var(--shiki-token-keyword)` etc. instead of hex. Its
documented variables: `--shiki-foreground`, `--shiki-background`, `--shiki-token-keyword`,
`--shiki-token-string`, `--shiki-token-comment`, `--shiki-token-constant`, `--shiki-token-function`,
`--shiki-token-punctuation`, `--shiki-token-parameter`, `--shiki-token-string-expression`,
`--shiki-token-link`. The docs note it is "less granular than standard Shiki themes" — with 9 roles
that is a feature, not a problem, for a restrained palette.

The repo already solved the same shape of problem. `portal.css:194`:

```css
/* Categorical event-type colors (contracts/events-page-ui.md): aliases of theme tokens only —
 * data encoding for "which type is this event", always paired with the type name in text. */
:root {
  --ev-cat-webinar: var(--kihub-accent);
  --ev-cat-verksted: var(--kihub-warning);
  ...
}
```

**Decision**: define the `--shiki-token-*` variables in `portal.css` as **aliases of existing theme
tokens only** — the 012 pattern — so no new colour value enters the system and nothing needs to be
synced back into the design project (`styles/kihub/` is synced verbatim and must not be edited;
`README.md` is explicit about this).

**Contrast (FR-035)**: alias to Designsystemet's `*-text-*` roles, **not** `*-base-*`. The bridge
(`kihub-ds-bridge.css`) maps `--kihub-warning`/`--kihub-danger`/`--kihub-success` to
`--ds-color-<hue>-base-default`, which are *fill* colours tuned for surfaces — as small text on a
tinted code surface they are not guaranteed to reach 4.5:1. The code palette therefore aliases the
text-role tokens (e.g. `--ds-color-danger-text-default`), which Designsystemet defines to be
contrast-safe as text. Measured verification is a task, not an assumption.

**Restraint, and a knowing deviation**: the design system's rules say "One accent — `--kihub-accent`
is the only chromatic colour in the UI" and "Status colours are for status only, never decoration".
A 9-hue syntax rainbow would break both. The palette is therefore **four roles**: keyword = accent,
string/constant = one second hue (Designsystemet text-role), comment = subtle ink + italic,
everything else = default ink. See plan.md → Complexity Tracking; this is the one recorded deviation,
scoped to the inside of a code block.

---

## §5 Inline images: `UploadFeature` + a Media upload collection

Inspected `dist/features/upload/server/index.d.ts`:

```ts
export type UploadFeatureProps = {
  collections?: { [collection: UploadCollectionSlug]: { fields: Field[] } };
  maxDepth?: number;
} & ({ enabledCollections?: UploadCollectionSlug[] } | { disabledCollections?: UploadCollectionSlug[] });
```

**Decision**: `UploadFeature({ collections: { media: { fields: [ /* per-placement fields */ ] } } })`.

**Finding worth exploiting**: `collections.media.fields` adds fields to the *upload node inside the
document*, not to the Media document. That gives the right home for each of FR-021's two halves:

- `alt` lives on the **Media document** — the asset's intrinsic description, entered once, reused
  everywhere (FR-020's reuse requirement).
- `decorative` (checkbox) lives on the **upload node** — "on *this* page this image is decoration".
  Per-placement, because the same asset can be meaningful on one page and decorative on another.

Rendering: the `upload` converter (registered alongside `blocks`, §3) renders
`<figure>` + `<img>` with `alt={decorative ? '' : media.alt}`, choosing a generated size (§6).

---

## §6 The Media collection, storage target, and loud failure

**Decision**: one `media` upload collection, raster-only, with generated sizes.

| Concern | Decision | Driver |
|---|---|---|
| Accepted types | `image/png`, `image/jpeg`, `image/webp`, `image/avif` — `mimeTypes` on the upload config | FR-022 |
| SVG | **excluded** — script-carrying, served same-origin | FR-022, spec Assumption 6 |
| Max size | 5 MB, enforced by `upload.filesRequiredOnCreate` + a `validate` on size | FR-022 |
| `alt` | required text field, with the `decorative` escape hatch on the node (§5) | FR-021 |
| Sizes | two `imageSizes` at content-column widths (760 and 1520 for 2×), with `adminThumbnail` reusing `content` rather than generating a third derivative; `sharp` is **already** a dependency (`package.json`) | FR-023 |
| Focal point / crop | not enabled — out of scope, adds editor surface with no requirement behind it | Principle VII |

### Storage target selection

`payload.config.ts` currently has **no `plugins` array** — this feature adds one. The adapter is
`@payloadcms/storage-azure`, and its version is not free: `npm view @payloadcms/storage-azure@3.85.2`
reports `peerDependencies: { payload: "3.85.2" }` — an **exact** pin. So the dependency is
`@payloadcms/storage-azure@3.85.2`, matching the pinned Payload, *not* the current latest (3.87.1).
It brings `@azure/storage-blob` and `@payloadcms/plugin-cloud-storage@3.85.2` transitively.

Option names verified against Payload's storage-adapters docs: `azureStorage({ collections,
connectionString, containerName, baseURL, allowContainerCreate })`.

**Decision — env-selected, mirroring `DB_AUTH_MODE`/`AUTH_MODE`**: a new `MEDIA_STORAGE_MODE` with
values `disk` (default) and `azure`. `disk` registers no plugin at all, so Payload's built-in
filesystem storage handles uploads locally; `azure` registers `azureStorage(...)`. This is the exact
shape of the precedent in `lib/db-auth.ts` (`DB_AUTH_MODE=password|entra`), so it reads as house
style rather than a new idea.

**FR-025 loud failure**: the selector throws when `MEDIA_STORAGE_MODE=azure` and any of
`AZURE_STORAGE_CONNECTION_STRING` / `AZURE_STORAGE_CONTAINER_NAME` is missing or blank. Because
`src/instrumentation.ts` initialises Payload at container boot in production ("A migration failure
crashes the boot loudly rather than serving a broken app"), a throw during config resolution crashes
the boot with a named error instead of silently serving broken `<img>`s later. The mechanism for
FR-025 therefore already exists and needs no new machinery.

`allowContainerCreate` stays `false`: the container is provisioned by the platform team (spec →
Dependencies), and an app that can create containers is an app with more rights than it needs.

---

## §7 Collections: three, plus media — and why not two, and why not one

**Decision**: `learning-categories`, `learning-subcategories`, `learning-pages`, `media`.

**Rejected — one self-referencing `learning-nodes` collection**: models arbitrary depth, which
FR-013 explicitly forbids. Enforcing "exactly two levels" on a self-referencing tree needs cycle
guards and depth validation — more code to *prevent* capability than to omit it. Rejected on
Principle VII.

**Rejected — two collections (categories + pages, subcategory as a plain text field on the page)**:
cheap, but the subcategory then has no identity, so it cannot be ordered (FR-015), cannot be renamed
in one place, and typos silently fork a group into two. FR-015 alone settles it.

### FR-014 (a page's subcategory must belong to its page's category) — two layers

1. **Admin UX**: `filterOptions` on the page's `subcategory` relationship, filtered by the
   currently-selected `category` (`filterOptions: ({ data }) => ({ category: { equals: data?.category } })`).
   The dropdown only ever offers valid subcategories.
2. **Server-side validation**: a `beforeValidate` hook on `learning-pages` that loads the referenced
   subcategory and rejects the write when `subcategory.category !== page.category`. `filterOptions`
   is an admin-UI affordance; the REST/GraphQL path bypasses it entirely. This is the same
   defence-in-depth posture News uses for drafts (`collections/News.ts:27-30` — access rule *and*
   read-layer filter).

### FR-016 (no orphaned pages) — `beforeDelete`

`beforeDelete` on `learning-categories` counts pages and subcategories referencing it; on
`learning-subcategories` counts pages. Non-zero ⇒ throw `APIError` with a Norwegian message naming
the count ("Kategorien har 4 sider — flytt eller slett dem først."). Payload surfaces a thrown
`APIError` as an editor-visible toast, so this satisfies "refused with a clear explanation" without
custom admin components.

---

## §8 Ordering: an explicit `order` number, NOT `orderable: true`

`payload@3.85.2` **does** support drag-and-drop ordering. From
`dist/collections/config/types.d.ts:585-594`:

```
* If true, enables custom ordering for the collection, and documents in the listView can be
* reordered via drag and drop. …Under the hood, a field with fractional indexing…
* @experimental There may be frequent breaking changes to this API
orderable?: boolean;
```

**Decision**: **do not** use `orderable`. Use an explicit `order` number field
(`type: 'number'`, `defaultValue: 100`, admin-sidebar) on all three learning collections.

**Rationale**:
- The annotation is not boilerplate — "@experimental. There may be **frequent breaking changes**".
  Ordering is load-bearing for FR-015 and appears in the employee-facing sidebar; a breaking change
  in a patch bump would be a visible regression on a core surface.
- Fractional indexing stores an opaque ordering key. An explicit integer is inspectable, seedable in
  tests, and trivially assertable ("order 10 sorts before order 20") — which SC-002 and the FR-015
  test need.
- Payload sorts on it directly: `sort: ['order', 'title']`.

**Deterministic tiebreak (FR-015)**: `order` ascending, then `title` ascending. Items the editor
never touched all share `defaultValue: 100` and therefore fall back to alphabetical — stable across
page loads, which is exactly what FR-015 demands ("never reshuffling"). Multi-field sort avoids
relying on `createdAt`, so seeded test fixtures are order-stable too.

---

## §9 The sidebar tree: three queries total, assembled by a pure function

SC-010 forbids work that grows with the number of pages rendered, and forbids N+1.

**Decision**: three flat reads, then one pure in-memory assembly.

```
findAll('learning-categories',    sort ['order','title'])                    // ~10 docs
findAll('learning-subcategories', sort ['order','title'])                    // ~30 docs
find('learning-pages', where PUBLISHED, sort ['order','title'], depth: 0)    // ids + title + slug + refs only
```

`depth: 0` on the pages read is deliberate: the tree needs each page's `category`/`subcategory` as
**ids**, and depth 0 returns them as ids without populating the related documents — turning what
would be N joins into none. Category and subcategory documents arrive from their own single reads.

**Placement**: the reads live in `lib/learning.ts` (the read layer, always `PUBLISHED`-filtered, the
`lib/news.ts` pattern); the assembly is `buildLearningTree(categories, subcategories, pages)` in
`lib/learning-view.ts` — **pure, no Payload import**, exactly the `lib/news-view.ts` /
`lib/events-view.ts` split. That is what makes FR-008 (hide empty groups), the ungrouped-before-
grouped rule (spec Edge Cases) and the FR-004 "ancestor expanded" flag unit-testable without a
database.

Pruning empty groups (FR-008) is a property of the assembly, not of the queries — a category is
dropped iff no published page resolves under it, directly or via a subcategory.

---

## §10 The sidebar must work without JavaScript → native `<details>`, not a client component

FR-005 requires expand/collapse with scripting disabled. `SiteNav.tsx` — the app's only client
component — uses `useState` + `aria-expanded`, which fails that requirement.

**Decision**: `<details>`/`<summary>` for both the per-category groups and the phone-level sidebar
disclosure. **Zero client components in this feature.**

**Rationale**: native disclosure is keyboard-accessible and screen-reader-announced by the browser,
works with scripting off, and `open` can be set server-side — which is precisely how FR-004 is
implemented (`<details open={group.containsCurrentPage}>`), with no hydration and no effect hook.
Attempting the same with a client component would need the open state derived from the pathname on
the client, i.e. more code that does less.

**Consequence for the copy control**: `CopyButton.tsx` *is* a client component
(`'use client'`, `navigator.clipboard`) and FR-029 needs it. That is unavoidable and correct —
clipboard access has no server equivalent — and it degrades to an inert button without scripting,
which does not affect navigation or reading (FR-037's exact carve-out). Reused as-is except for a
Norwegian label: it currently hardcodes English `'Copy'`/`'Copied'`, so 014 passes
`label="Kopier"` and the `Copied` string needs a Norwegian variant. Small, real, and in scope for
FR-036.

---

## §11 The nav link will not appear by itself in existing environments

`lib/site-content.ts:39-41`:

```ts
const nav: NavItem[] = doc?.nav?.length ? doc.nav.map(...) : DEFAULT_SITE_CHROME.nav;
```

**Finding**: the merge is per-section and "saved wins wholesale". Any environment where an editor has
saved the `site-chrome` nav has a non-empty `doc.nav`, so adding "KI Læring" to
`DEFAULT_SITE_CHROME` will **not** appear there. Fresh environments get it.

**Decision**: do not migrate or auto-patch the saved global. Writing to an editor-owned document from
a migration would silently overwrite editorial intent (the merge comment is explicit: "you own all of
it").

**Instead**: FR-040 is satisfied by (a) updating the defaults for fresh environments, and (b) a
release note in `quickstart.md` telling the editor to add the entry in `/cms` → Site Chrome, with the
exact label and href. This is a one-line editorial action, and the module is reachable by URL
meanwhile.

---

## §12 Styling: a `014 /laering` block in `portal.css`

`styles/kihub/README.md` — `tokens.css` and `components.css` are "Synced from claude.ai/design …
re-copy verbatim". They must not be edited. `portal.css` is local app CSS, already organised in
per-feature sections (`/* ==== 012 /events ==== */` at line 192, the 013 block at 615).

**Decision**: all new CSS goes in a `/* ==================== 014 /laering ==================== */`
section of `portal.css`: the two-column shell, the sidebar tree, the code block, the image figure,
and the `--shiki-token-*` alias block (§4.2). Every value from `--kihub-*` tokens.

**Prose**: `kihub-prose` already exists and is used by the news article body
(`app/(app)/news/[slug]/page.tsx:57`). The learning body reuses it; 014 extends it only where
learning-specific elements (code figure, image figure) need it.

**Responsive (FR-006)**: the 012 approach — a real media query that *replaces* the desktop layout
rather than shrinking it (`portal.css:534`, "the full grid would only fit by scrolling sideways —
swap it for a…"). Here: two-column grid → single column with the sidebar collapsed into a
`<details>` above the content. Code-block overflow is contained with `overflow-x: auto` on the
`<pre>` wrapper plus `min-width: 0` on the grid child — the latter is what actually prevents a wide
`<pre>` from widening the whole page (the same `minmax(0, 1fr)` lesson recorded at `portal.css:626`).

---

## §13 Migration: additive, generated, registered

`src/migrations/index.ts` exports an explicit ordered array; `payload.config.ts` passes it as
`prodMigrations`, and `src/instrumentation.ts` forces Payload init at boot in production so they run
before traffic.

**Decision**: generate with `pnpm --filter web migrate:create`, name it
`<ts>_learning_pages`, and add it to `migrations/index.ts` as a third entry. Purely additive: four
new tables (+ Payload's join/relationship tables for the new relationships) and no change to
`artifacts`, `news`, `events` or the globals. `down` drops only the new tables.

**Verification for SC-012** (migration applies to a *populated* database): the local docker database
already holds data from prior phases, so `pnpm --filter web migrate` against it is the real test.

---

## §14 Existing search is untouched by construction

`lib/search.ts:1-4` imports only `Artifact` and `lib/catalog`, and every query it issues names
`collection: 'artifacts'`. FR-039's "learning content MUST NOT appear in the existing
artifact-search results" therefore needs **no code and no guard** — new collections are simply not
reachable from that module. Recorded so the tasks phase does not invent work here; a regression test
on the existing suite is sufficient.

---

## §15 Test strategy

Mirrors the repo's split — `tests/unit/` for pure logic, `tests/integration/` for anything touching
Payload. `vitest.config.ts` sets `environment: 'node'`, `include: ['tests/**/*.test.ts']`,
`fileParallelism: false` (integration tests share one Postgres). Integration tests need the env
exported first: `set -a; source apps/web/.env; set +a`.

| Test | Kind | Covers |
|---|---|---|
| `learning-view.test.ts` | unit | `buildLearningTree` — grouping, order + tiebreak, empty-group pruning, ungrouped-before-grouped, current-page/ancestor flags |
| `learning-slug.test.ts` | unit | page handle derivation + stability (the `news-slug` pattern; pages are the only collection with a handle) |
| `learning-date.test.ts` | unit | nb-NO Oslo "last updated", incl. a 00:30-Oslo / previous-UTC-day case (FR-018) |
| `learning-code.test.ts` | unit | highlighter: known language tokenises, unknown language falls back to plain (FR-028), token colours are `var(--shiki-token-*)` references not hex (FR-034) |
| `learning-access.test.ts` | integration | Reader refused writes on all four collections; Contributor+ allowed; drafts absent for non-editors (FR-031/032) — the `news-access.test.ts` shape |
| `learning-hierarchy.test.ts` | integration | FR-014 cross-category subcategory rejected via the API path (not just the admin filter); FR-016 delete refusal with pages present |
| `learning-tree-reads.test.ts` | integration | the read layer returns published-only, and the tree is built from a bounded number of queries (SC-010) |
| `media-upload.test.ts` | integration | accepted mime types stored; SVG and oversized refused (FR-022); `alt` required (FR-021) |

Contrast (SC-011) and no-JS navigation (SC-009) are verified manually per `quickstart.md` — neither
is expressible in this suite.

---

## Resolved constraints summary

| Question | Resolution | §  |
|---|---|---|
| Route + label | `/laering`, "KI Læring" — already in the design system | §1 |
| Code block | Payload's premade `CodeBlock` + our curated language map | §2 |
| Highlighter | `shiki@4.4.3`, `createHighlighterCoreSync` + JS regex engine, module singleton | §4 |
| Highlight rendering | `codeToTokens` → React elements; no `dangerouslySetInnerHTML` | §4.1 |
| Highlight colours | `createCssVariablesTheme` + `--shiki-token-*` aliased to theme text-role tokens, 4 roles | §4.2 |
| Inline images | `UploadFeature`; `alt` on the asset, `decorative` per placement | §5 |
| Storage | `@payloadcms/storage-azure@3.85.2` (exact peer pin); `MEDIA_STORAGE_MODE=disk\|azure`; throws at boot when misconfigured | §6 |
| Collections | 3 learning + 1 media; FR-014 via `filterOptions` + `beforeValidate`; FR-016 via `beforeDelete` | §7 |
| Ordering | explicit `order` number, NOT `orderable` (@experimental); tiebreak `order,title` | §8 |
| Sidebar data | 3 flat reads at `depth: 0` + pure `buildLearningTree` | §9 |
| Sidebar interaction | native `<details>`; zero client components except the reused `CopyButton` | §10 |
| Nav in existing envs | defaults for fresh envs + a documented editor action; never patch the saved global | §11 |
| CSS home | new `014 /laering` section in `portal.css`; `styles/kihub/` untouched | §12 |
| Migration | generated, additive, registered in `migrations/index.ts` | §13 |
| Search | untouched by construction | §14 |
| New deps | `shiki@4.4.3`, `@payloadcms/storage-azure@3.85.2` | §4, §6 |
