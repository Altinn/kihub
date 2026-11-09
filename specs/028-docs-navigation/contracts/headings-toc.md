# Contract: heading anchors and «På denne siden» (US1)

Research: R1–R5. Spec: FR-001–FR-008. Baseline: `main` after 026 (Designsystemet converters, `app.css`).

## A. `lib/headings.ts` (pure)

```ts
export type HeadingLevel = 2 | 3 | 4;
export type Heading = { node: object; level: HeadingLevel; text: string; id: string };

/** Identifiers the portal layout uses; an anchor equal to one of these gets a suffix. */
export const RESERVED_ANCHORS: ReadonlySet<string>;
// 'main-content', 'site-menu', 'site-menu-heading', 'user-menu', 'sign-out-form',
// 'footer-links-heading', 'footer-contacts-heading'

/** Every h2–h4 heading of a Lexical body, in document order, with unique anchors. */
export function extractHeadings(body: unknown): Heading[];

/** The nested shape the table of contents renders. */
export type TocItem = { id: string; text: string; children: TocItem[] };
export function toTocTree(headings: Heading[]): TocItem[];
```

### A1. Walk

Depth-first over `root.children` and every node's `children`. A node is a heading when
`type === 'heading'`; its `level` is the rendered level, `richTextHeading(Number(tag.slice(1))).tag`
(`lib/ds-richtext.ts`, minimum level 2), and only levels 2–4 are kept. So the extractor and the
converter agree on the level even if an h1 node ever reaches the body.
`node` is the object itself (used as a `WeakMap` key by the renderer).

### A2. Text

Concatenate descendant `text` nodes' `text`; a `linebreak` node counts as one space; collapse runs of
whitespace and trim. Formatting, inline code and link wrappers contribute their text only.

### A3. Anchor

`base = slugify(text) || 'avsnitt'`. The first occurrence of `base` that is not in `RESERVED_ANCHORS`
is `base`; later ones are `base-2`, `base-3`, …, skipping any suffix already taken (so a heading literally
titled «Steg 2» cannot collide with the second «Steg»).

Examples:

- «Før du starter», «Installer agentctl», «Før du starter» → `for-du-starter`, `installer-agentctl`,
  `for-du-starter-2`
- «Hvorfor æ?» → `hvorfor-ae`
- «`agentctl new`» (inline code) → `agentctl-new`
- «—» → `avsnitt`; a second «🙂» → `avsnitt-2`
- «Steg», «Steg 2», «Steg» → `steg`, `steg-2`, `steg-3`
- «Main content» → `main-content-2`

### A4. Tree

h2 starts a top-level item. h3 nests under the latest h2 (or is top-level if none). h4 nests under the
latest h3 after the latest h2, else under the latest h2, else top-level.

## B. Renderer

### B1. `lib/ds-richtext-converters.tsx`

`DsRichTextOptions` gains `headingIds?: WeakMap<object, { id: string; text: string }>`. When the
heading node is in the map, the `heading` override renders:

```tsx
<div className="app-heading">
  <Tag id={id} className="ds-heading" data-size={size}>{children}</Tag>
  <a className="ds-link app-heading__anchor" href={`#${id}`}
     aria-label={`Lenke til avsnittet «${text}»`}>#</a>
</div>
```

Otherwise (no option, or a node not in the map) the output is exactly today's
`<Tag className="ds-heading" data-size={size}>`. News, projects, events, dialogs and READMEs pass no
map and do not change.

### B2. `components/LearningBody.tsx`

- `LearningBody({ body, headings? })`: computes `headings = extractHeadings(body)` when not given,
  builds the map, and creates its converters inside the component (they are a module constant today)
  with `dsConverterOverrides(defaultConverters, { headingIds })`.
- Callers that also render a TOC compute `extractHeadings` once and pass it to both.

## C. `components/PageToc.tsx` (server)

- Props: `{ headings: Heading[] }`. Renders nothing when `headings.length < 2`.
- Markup (Designsystemet details; no Designsystemet TOC component exists):

```tsx
<details className="ds-details app-toc" data-color="neutral">
  <summary>På denne siden</summary>
  <nav aria-label="Innhold på siden" className="app-toc__nav">
    <ol className="app-toc__list">{/* TocItem → <li><a className="ds-link" href="#id">text</a>{children && <ol>…</ol>}</li> */}</ol>
  </nav>
</details>
```

- Placed inside `.app-article` between the header (breadcrumbs, kicker, title, meta, summary) and
  `LearningBody`, on both the CMS page route and the KI Læring page route.

## D. CSS (`styles/app.css`, new «028» section)

Only `--ds-*` tokens and plain layout widths; no custom properties of the app's own (constitution
Design System §3).

- `.app-heading`: relative wrapper; `.app-heading__anchor` visually hidden until `.app-heading:hover`
  or `:focus-visible`; minimum 24×24px target (WCAG 2.5.8).
- The rich-text rhythm rules that select `.ds-heading` as a direct child (`:not(:first-child)` and
  `+ *`) also select `.app-heading`: `:is(.ds-heading, .app-heading)`.
- `.app-richtext :is(h2, h3, h4)[id]`: `scroll-margin-top: var(--ds-size-6)`.
- `:target` heading: a visible marker (left border or background in an accent token), no animation.
- `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }` only; never
  unconditional.
- `.app-article:has(> .app-toc)` at `width >= 75rem`: `display: grid; grid-template-columns:
  minmax(0, 1fr) 13rem; column-gap: var(--ds-size-10)`; every other child in column 1; `.app-toc` in
  column 2, `grid-row: 1 / span 99`, `position: sticky; top: var(--ds-size-6); max-height: calc(100vh -
  2 * var(--ds-size-6)); overflow: auto`; summary hidden and details forced open (the two rules
  `.app-learning__disclosure` uses).
- Narrower: `.app-toc` is the default collapsed `ds-details`.

## E. Tests

- Unit `headings.test.ts`: A1–A4 examples above; formatting and links; skipped levels; an h1 node
  counted as h2; reserved anchors; empty body; `null` body.
- Unit `reserved-anchors.test.ts`: reads `app/themed-html.tsx`, `app/(app)/layout.tsx` and the
  components they render (`SiteHeader`, `SiteNav`, `UserMenu`, `SiteFooter`, `PreviewBanner`), collects
  `id="…"` literals and string constants named `*_ID` (plus their `${…}-heading` forms), and fails if
  one is missing from `RESERVED_ANCHORS`.
- Unit render test (`*.test.ts`, `react-dom/server`, no JSX: vitest includes only `tests/**/*.test.ts`
  in a `node` environment): `LearningBody` + `PageToc` from one fixture; every TOC `href` equals `#` +
  an existing heading `id`; ids are unique; without `headingIds`, `dsConverterOverrides` output is
  unchanged (existing `ds-richtext.test.ts` keeps passing).
