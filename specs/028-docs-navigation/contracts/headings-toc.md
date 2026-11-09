# Contract: heading anchors and «På denne siden» (US1)

Research: R1–R5. Spec: FR-001–FR-008.

## A. `lib/headings.ts` (pure)

```ts
export type HeadingLevel = 2 | 3 | 4;
export type Heading = { node: object; level: HeadingLevel; text: string; id: string };

/** Identifiers the portal layout uses; an anchor equal to one of these gets a suffix. */
export const RESERVED_ANCHORS: ReadonlySet<string>; // 'hovedinnhold', 'site-nav-list'

/** Every h2–h4 heading of a Lexical body, in document order, with unique anchors. */
export function extractHeadings(body: unknown): Heading[];

/** The nested shape the table of contents renders. */
export type TocItem = { id: string; text: string; children: TocItem[] };
export function toTocTree(headings: Heading[]): TocItem[];
```

### A1. Walk

Depth-first over `root.children` and every node's `children`. A node is a heading when
`type === 'heading'` and `tag` is `h2`, `h3` or `h4`; other tags are ignored (the editor allows none).
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
- «Hovedinnhold» → `hovedinnhold-2`

### A4. Tree

h2 starts a top-level item. h3 nests under the latest h2 (or is top-level if none). h4 nests under the
latest h3 after the latest h2, else under the latest h2, else top-level.

## B. Renderer (`components/LearningBody.tsx`)

- `LearningBody({ body, headings? })`: computes `headings = extractHeadings(body)` when not given, and a
  `WeakMap` from node to id.
- Converter `heading` (h2–h4):

```tsx
<div className="kihub-heading">
  <Tag id={id}>{children}</Tag>
  <a className="kihub-heading__anchor kihub-focusable" href={`#${id}`}
     aria-label={`Lenke til avsnittet «${text}»`}>#</a>
</div>
```

  A heading without an id in the map (should not happen) falls back to the plain tag.
- Callers that also render a TOC compute `extractHeadings` once and pass it to both.

## C. `components/PageToc.tsx` (server)

- Props: `{ headings: Heading[] }`. Renders nothing when `headings.length < 2`.
- Markup:

```tsx
<details className="page-toc">
  <summary className="page-toc__title kihub-focusable">På denne siden</summary>
  <nav aria-label="Innhold på siden" className="page-toc__nav">
    <ol className="page-toc__list">{/* TocItem → <li><a href="#id">text</a>{children && <ol>…</ol>}</li> */}</ol>
  </nav>
</details>
```

- Placed inside the article between the header (title, meta, summary) and `LearningBody`, on both the
  CMS page route and the KI Læring page route.

## D. CSS (`portal.css`, «028» section, tokens only)

- `.kihub-heading`: relative wrapper; `.kihub-heading__anchor` visually hidden until
  `.kihub-heading:hover` or `:focus-visible`; minimum 24×24px target (WCAG 2.5.8).
- `.kihub-prose :is(h2, h3, h4)[id]`: `scroll-margin-top: var(--kihub-space-6)`.
- `:target` heading: a visible marker (left border or background in an accent token), no animation.
- `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }` only; never
  unconditional.
- `.lp-page`, `.cms-page` (article): at `min-width: 1200px`, `display: grid;
  grid-template-columns: minmax(0, 1fr) 13rem; column-gap: var(--kihub-space-10)`; header and body in
  column 1; `.page-toc` in column 2, `grid-row: 1 / span 99`, `position: sticky; top: var(--kihub-space-6);
  max-height: calc(100vh - 2 * var(--kihub-space-6)); overflow: auto`; summary hidden and details forced
  open (same two rules as `.lp-shell__disclosure`).
- Below 1200px: `.page-toc` is a bordered collapsed disclosure styled like `.lp-shell__disclosure-title`.

## E. Tests

- Unit `headings.test.ts`: A1–A4 examples above; formatting and links; skipped levels; reserved
  anchors; empty body; `null` body.
- Unit render test (`*.test.ts`, `react-dom/server`, no JSX: vitest includes only `tests/**/*.test.ts`
  in a `node` environment): `LearningBody` + `PageToc` from one fixture; every TOC `href` equals `#` +
  an existing heading `id`; ids are unique.
