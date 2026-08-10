# Contract: The learning rich-text editor and its rendering

**Feature**: `014-learning-pages` | Surfaces: `/cms` (authoring) and `/laering/<slug>` (reading)

Two halves of one contract: what an editor can put into `learning-pages.body`, and exactly how each
of those things renders on the employee surface. The stored lexical JSON is the interface between
them.

---

## §A Editor configuration (authoring)

`body` uses a **field-level** `lexicalEditor({ features })` on `learning-pages`, not the global
`editor:` in `payload.config.ts`. News keeps the default feature set; overriding globally would change
the News editor as a side effect (FR-039: existing surfaces unchanged).

Enabled features (all verified present in `@payloadcms/richtext-lexical@3.85.2`, research §2/§5):

| Feature | Gives the editor | Requirement |
|---|---|---|
| `ParagraphFeature`, `HeadingFeature({ enabledHeadingSizes: ['h2','h3','h4'] })` | body copy and a heading hierarchy **below** the page's `h1` | FR-019 |
| `BoldFeature`, `ItalicFeature`, `InlineCodeFeature` | emphasis and inline code | FR-019 |
| `UnorderedListFeature`, `OrderedListFeature` | bullet and numbered lists | FR-019 |
| `LinkFeature` | internal and external links | FR-019 |
| `BlockquoteFeature` | quotes | FR-019 |
| `HorizontalRuleFeature` | section breaks | FR-019 |
| `UploadFeature({ collections: { media: { fields: [decorative] } } })` | drag-and-drop inline images | FR-020, FR-021 |
| `BlocksFeature({ blocks: [CodeBlock({ languages: LEARNING_CODE_LANGUAGES })] })` | code samples with a language selector | FR-026 |

`h1` is deliberately excluded: the page's own title is the `h1`, so an editor-authored `h1` would
break the document outline (FR-003's accessibility posture).

**Per-placement upload field** (research §5):

```ts
{ name: 'decorative', type: 'checkbox', label: 'Dekorativt bilde (ingen alt-tekst)' }
```

`alt` is required on the media document itself; `decorative` says "on *this* page, this image carries
no information". Together they satisfy FR-021 without forcing a meaningless alt text on a divider
image.

---

## §B Employee-facing rendering

One `<RichText>` call with a converter function (research §3 — converters are **synchronous**):

```tsx
<RichText
  data={page.body}
  converters={({ defaultConverters }) => ({
    ...defaultConverters,
    upload: LearningImageConverter,
    blocks: { Code: LearningCodeConverter },
  })}
/>
```

wrapped in `.kihub-prose` (the existing class, already used by the news article body).

### §B1 `upload` → `<figure>` (FR-020/021/023)

| # | Guarantee | Requirement |
|---|---|---|
| B1.1 | Renders `<figure class="lp-figure">` containing the image, plus `<figcaption>` only when the media document has a `caption` | FR-019 |
| B1.2 | `alt` is `''` when the node is `decorative`, otherwise the media document's `alt` | FR-021 |
| B1.3 | Uses a generated size at the content-column width, not the original file, and emits intrinsic `width`/`height` so the layout does not shift while loading | FR-023 |
| B1.4 | `max-width: 100%` with an intrinsic aspect ratio — never wider than the content column at any viewport | FR-006, FR-023 |
| B1.5 | A node whose media document is missing (deleted asset) renders nothing rather than a broken image or a crashed page | spec Edge Cases |

### §B2 `blocks.Code` → `<figure>` + `<pre>` (FR-026 to FR-029)

| # | Guarantee | Requirement |
|---|---|---|
| B2.1 | Renders the sample inside `<pre><code>` in the monospace token, preserving indentation and blank lines exactly (`white-space: pre`) | FR-026 |
| B2.2 | Tokens are produced by the synchronous shiki singleton and rendered as **React elements** — no `dangerouslySetInnerHTML`, no HTML string ever built | FR-027, FR-030 |
| B2.3 | An unrecognised, unsupported, empty or absent `language` renders the sample as plain monospace text — never an error, never an empty block | FR-028 |
| B2.4 | Token colours are `var(--shiki-token-*)` references resolved by the token layer; **no hex value appears in component output** | FR-034 |
| B2.5 | A copy control (`CopyButton`, Norwegian label) copies the exact `code` field text — not the highlighted markup, not re-indented | FR-029 |
| B2.6 | The language is shown as a small label on the block, using the Norwegian label from `LEARNING_CODE_LANGUAGES` | FR-026 |
| B2.7 | Overflow scrolls **inside** the block (`overflow-x: auto` on the `<pre>` wrapper, `min-width: 0` on the grid child); the page itself never scrolls horizontally | FR-006 |
| B2.8 | Nothing in the sample is executed, evaluated, or interpreted — it reaches the DOM only as text children | FR-027 |

### §B3 The highlighter singleton

`lib/learning-code.ts`:

```ts
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
```

| # | Guarantee | Requirement |
|---|---|---|
| B3.1 | Created **once** at module scope — grammars compile per server process, not per request or per block | SC-010 |
| B3.2 | Synchronous, so it is callable from a sync JSX converter with no async component or Suspense boundary | research §3 |
| B3.3 | The JavaScript regex engine — no WebAssembly asset to trace into the `.next/standalone` build | research §4 |
| B3.4 | Exactly the grammars in `LEARNING_CODE_LANGUAGES` are bundled, via per-language `@shikijs/langs/*` imports | SC-010 |
| B3.5 | Theme is `createCssVariablesTheme(...)`, so emitted colours are CSS variable references | FR-034 |
| B3.6 | `highlight(code, lang)` returns a plain-token fallback for any lang not in the map — the guard lives here, not in the component | FR-028 |

---

## §C The syntax colour palette

`--shiki-token-*` variables are declared in the `014 /laering` section of `portal.css` as **aliases of
existing theme tokens only** — the 012 event-type-colour pattern (`portal.css:194`). No new colour
value enters the system; `styles/kihub/` is not touched (it is synced verbatim from the design
project).

Four roles, honouring the design system's "one accent" rule (research §4.2):

| Variable | Alias | Reads as |
|---|---|---|
| `--shiki-foreground` | `--kihub-text` | default code ink |
| `--shiki-token-keyword` | `--kihub-text-accent` | keywords, the one accent |
| `--shiki-token-string`, `--shiki-token-constant` | one Designsystemet **text-role** token | literals, second hue |
| `--shiki-token-comment` | `--kihub-text-subtle` + `font-style: italic` | comments recede |
| all remaining `--shiki-token-*` | `--kihub-text` | punctuation, functions, parameters — plain ink |

Aliasing **text-role** tokens (`--ds-color-<hue>-text-default`) rather than the `base` fill tokens is
deliberate: `base` colours are tuned for surfaces and are not guaranteed to reach 4.5:1 as small text
(FR-035). Measured contrast verification is a task, not an assumption.

---

## §D Stored-shape stability

The lexical JSON persisted for a code block is Payload's block shape, `{ blockType: 'Code',
language: string, code: string }`. Both `CodeBlock` and its converter are annotated `@experimental` in
`3.85.2` (research §2), so the stored shape — not the factory — is what this contract pins. If the
factory changes or is dropped in a future Payload version, an equivalent hand-written `Block` with the
same two fields reads the same documents, and §B2 keeps holding.
