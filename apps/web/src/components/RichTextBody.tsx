import { LexicalRichText, type RichTextProfile } from '@/components/rich-text/LexicalRichText';
import type { RichTextContent } from '@/lib/content/rich-text';

/**
 * 023 — the single rich-text entry point for employee pages and components
 * (contracts/rich-text.md §2). Pages hand over a format-tagged value and never import a CMS's
 * renderer themselves; this switch picks the renderer for the format. It adds no wrapper element:
 * callers keep their own `kihub-prose` containers.
 *
 * Adding a format to `RichTextContent` makes the `never` check below fail to compile until the new
 * format has a renderer.
 */
export function RichTextBody({
  value,
  profile = 'standard',
}: {
  value: RichTextContent;
  profile?: RichTextProfile;
}) {
  switch (value.format) {
    case 'lexical':
      return <LexicalRichText document={value.document} profile={profile} />;
    default: {
      const unhandled: never = value.format;
      throw new Error(`RichTextBody: no renderer for rich-text format "${String(unhandled)}"`);
    }
  }
}
