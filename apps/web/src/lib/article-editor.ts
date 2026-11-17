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
import { LEARNING_CODE_LANGUAGES } from './learning-view';
import { parseYouTubeId } from './youtube';

/**
 * The article body editor shared by KI Læring pages (014/022) and CMS pages (027 US3, research R11).
 *
 * Extracted verbatim from `collections/LearningPage.ts` so both collections offer the same blocks and
 * `components/LearningBody.tsx` can render either one. Sharing the SAME editor (and thus the same
 * `youtube` block object) is Payload's supported way to reuse a block type: `generate:types` emits a
 * single `LearningYouTubeBlock` interface.
 *
 * FIELD-level editor, deliberately not the global `editor:` in payload.config.ts — changing that
 * would alter the News editor as a side effect (contracts/learning-editor.md §A).
 *
 * `h1` is excluded: the page's own title is the h1, so an editor-authored h1 would break the
 * document outline.
 */
export const articleEditor = lexicalEditor({
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
        // 022 — an embedded YouTube video. Stored inside the lexical JSON, so it needs no
        // migration. The URL is validated with the SAME parser the renderer uses, so
        // whatever the editor accepts is exactly what plays.
        {
          slug: 'youtube',
          interfaceName: 'LearningYouTubeBlock',
          labels: { singular: 'YouTube-video', plural: 'YouTube-videoer' },
          fields: [
            {
              name: 'url',
              type: 'text',
              required: true,
              label: 'YouTube-lenke',
              admin: {
                description:
                  'Lim inn lenken fra «Del» på YouTube, f.eks. https://youtu.be/… Undertekster slås på automatisk, med norsk som foretrukket språk dersom videoen har et norsk undertekstspor.',
              },
              validate: (value: string | null | undefined) =>
                parseYouTubeId(value) ? true : 'Ikke en gyldig YouTube-videolenke.',
            },
            {
              name: 'title',
              type: 'text',
              required: true,
              label: 'Tittel på videoen',
              admin: {
                description:
                  'Leses opp av skjermlesere og vises ikke på siden. Beskriv hva videoen handler om.',
              },
            },
            {
              name: 'caption',
              type: 'text',
              label: 'Bildetekst (valgfri)',
            },
          ],
        },
      ],
    }),
  ],
});
