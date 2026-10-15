import { RichTextBody } from '@/components/RichTextBody';
import type { RichTextContent } from '@/lib/content/rich-text';

/**
 * 014 US3 — the learning page body (contracts/learning-editor.md §B). Since 023 the converters
 * (inline images, highlighted `Code` blocks, `youtube` embeds) live in the lexical renderer's
 * `learning` profile (`components/rich-text/LexicalRichText.tsx`); this component keeps the page's
 * body wrapper.
 */
export function LearningBody({ body }: { body: RichTextContent }) {
  return (
    <div className="lp-page__body kihub-prose">
      <RichTextBody value={body} profile="learning" />
    </div>
  );
}
