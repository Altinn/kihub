/**
 * 026 R9 — pure heading math for rich text rendered with Designsystemet typography (the JSX
 * converters live in `ds-richtext-converters.tsx`). Headings are clamped below the page's own
 * heading (FR-012): content never adds a second h1, and a surface that already sits under an h2
 * (a dialog) passes `minHeadingLevel: 3`.
 */

export type HeadingTag = 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
export type HeadingSize = 'md' | 'sm' | 'xs' | '2xs';

type Level = 2 | 3 | 4 | 5 | 6;
const SIZE_BY_LEVEL: Record<Level, HeadingSize> = { 2: 'md', 3: 'sm', 4: 'xs', 5: '2xs', 6: '2xs' };

/** The rendered tag and Designsystemet size for a content heading of `level` (1–6). */
export function richTextHeading(level: number, minHeadingLevel = 2): { tag: HeadingTag; size: HeadingSize } {
  const floor = Math.min(Math.max(minHeadingLevel, 2), 6);
  const effective = Math.min(Math.max(Math.trunc(level) || 1, floor), 6) as Level;
  return { tag: `h${effective}` as HeadingTag, size: SIZE_BY_LEVEL[effective] };
}

export interface DsRichTextOptions {
  /** Lowest heading level content may use; default 2 (under the page h1). */
  minHeadingLevel?: number;
}
