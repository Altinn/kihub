/**
 * 023 — rich text as KI Hub carries it (specs/023-content-source-seam/contracts/rich-text.md §1).
 *
 * A rich-text value is TAGGED with its format, so a page never has to know which CMS produced it:
 * `<RichTextBody>` switches on `format` and picks the renderer. Today the only format is Payload's
 * lexical JSON; the feature that introduces a second source (e.g. Umbraco's rich text) adds its
 * member to the union, and the renderer's exhaustive `switch` stops compiling until it handles it.
 */

/**
 * Minimal lexical rich-text document shape — matches what `@payloadcms/richtext-lexical` generates
 * for every `richText` field (e.g. `Project['body']` in payload-types.ts). Declared by hand rather
 * than imported from the generated types so neutral modules stay free of framework imports: the
 * shape is dictated by lexical's data model, not by Payload's codegen.
 */
export interface LexicalDocument {
  root: {
    type: string;
    children: { type: string; version: number; [k: string]: unknown }[];
    direction: 'ltr' | 'rtl' | null;
    format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | '';
    indent: number;
    version: number;
  };
  [k: string]: unknown;
}

export type RichTextContent = { format: 'lexical'; document: LexicalDocument };

export function lexicalContent(document: LexicalDocument): RichTextContent {
  return { format: 'lexical', document };
}
