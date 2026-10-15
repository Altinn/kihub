# Contract: Rich text display path (023)

## §1 Value

```ts
type RichTextContent = { format: 'lexical'; document: LexicalDocument };
```

`LexicalDocument` is the hand-declared lexical root shape (`root.children[]`, `direction`, `format`,
`indent`, `version`), the same as today's `RichTextValue`, renamed and moved to
`lib/content/rich-text.ts`. New formats are added as new union members by the feature that
introduces them. Adding a member MUST break compilation of the renderer's exhaustive `switch` until
the renderer handles it.

## §2 Component

```tsx
<RichTextBody value={RichTextContent} profile?: 'standard' | 'learning' />   // default 'standard'
```

- File: `components/RichTextBody.tsx`. This is the ONLY rich-text entry point for pages and
  components.
- It renders **exactly** what today's call renders, with no wrapper element of its own. Callers
  keep their existing wrapper `div`s and classes (`news-detail__body kihub-prose`,
  `lp-page__body kihub-prose`, …).
- `format: 'lexical'` delegates to `components/rich-text/LexicalRichText.tsx`. That is the only
  employee-app file importing `@payloadcms/richtext-lexical/react`.

## §3 Profiles

| Profile | Used by | Converters |
|---|---|---|
| `standard` | news article, event page, project page, subscriptions banner (chip descriptions + request-access body) | Payload defaults, the same as today's bare `<RichText data=…/>` |
| `learning` | learning page body | defaults + `upload` → `LearningImage`, block `Code` → `LearningCodeBlock`, block `youtube` → `LearningVideo` (moved verbatim from `LearningBody.tsx`) |

`LearningBody` remains the learning page's body component (it renders the `lp-page__body` wrapper
and `<RichTextBody profile="learning">`).

## §4 Neutral block components

The lexical converters map nodes to these props. A future renderer reuses the same components.

| Component | Props | Mapped from (lexical) |
|---|---|---|
| `LearningImage` | `{ image: ContentImage \| null; decorative: boolean }` | upload node: `toContentImage(node.value)`, `Boolean(node.fields?.decorative)` |
| `LearningCodeBlock` | `{ code: string; language: string \| null }` | block `Code`: `fields.code ?? ''`, `fields.language ?? null` |
| `LearningVideo` | `{ url: string \| null; title: string \| null; caption: string \| null }` | block `youtube`: `fields.url`, `fields.title`, `fields.caption` (`?? null`) |

The behaviour inside each component is unchanged:
- **LearningImage**: `renditions.content?.url ?? url`, the width/height fallbacks, empty alt when
  decorative, null for a missing image.
- **LearningCodeBlock**: empty code renders nothing, shiki tokens as React elements, CopyButton with
  the raw text.
- **LearningVideo**: invalid URL renders nothing, privacy host, title fallback `YouTube-video`.

## §5 Parity

For every surface in the parity harness (research R8), the HTML produced through `RichTextBody` is
byte-identical to the golden captured from today's direct `<RichText>` calls.
