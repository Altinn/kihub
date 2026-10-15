import { RichTextBody } from '@/components/RichTextBody';
import { lexicalContent } from '@/lib/content/rich-text';
import type { LearningPage } from '@/payload-types';

/**
 * 014 US3 — the learning page body (contracts/learning-editor.md §B). 023: the converters moved to
 * `components/rich-text/LexicalRichText.tsx` (profile `learning`); this component keeps the page's
 * body wrapper. (Interim: still takes the Payload body until T025 retypes it.)
 */
export function LearningBody({ body }: { body: LearningPage['body'] }) {
  return (
    <div className="lp-page__body kihub-prose">
      <RichTextBody value={lexicalContent(body)} profile="learning" />
    </div>
  );
}
