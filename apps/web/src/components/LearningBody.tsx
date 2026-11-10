import { RichText } from '@payloadcms/richtext-lexical/react';
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import { LearningCodeBlock, type LearningCodeBlockNode } from '@/components/LearningCodeBlock';
import { LearningImage, type LearningImageNode } from '@/components/LearningImage';
import { LearningVideo, type LearningVideoNode } from '@/components/LearningVideo';
import type { HeadingIdMap } from '@/lib/ds-richtext';
import { dsConverterOverrides } from '@/lib/ds-richtext-converters';
import { extractHeadings, headingIdMap, type Heading } from '@/lib/headings';
import type { LearningPage } from '@/payload-types';

/**
 * 014 US3 — the learning page body (contracts/learning-editor.md §B).
 *
 * Custom converters on top of the defaults: inline uploads become a `<figure>` with correct alt
 * handling, the `Code` block becomes a highlighted, display-only `<pre>`, and the `youtube` block
 * (022) becomes a responsive embedded player.
 *
 * Note these converters are SYNCHRONOUS — the converter type returns `React.ReactNode`, not a promise
 * (research §3). That is precisely why the highlighter is shiki's synchronous core: no async component
 * and no Suspense boundary is introduced per code block.
 *
 * 026: text nodes go through the shared Designsystemet converters (`ds-heading` / `ds-paragraph` /
 * `ds-list` / `ds-link` / `ds-table`, content headings clamped to h2+ under the page h1).
 */
function learningConverters(headingIds: HeadingIdMap): JSXConvertersFunction {
  return ({ defaultConverters }) => ({
    ...defaultConverters,
    ...dsConverterOverrides(defaultConverters, { headingIds }),
    upload: ({ node }) => <LearningImage node={node as unknown as LearningImageNode} />,
    blocks: {
      // The `blocks` map is indexed by block slug and typed loosely, so `node` needs an explicit
      // annotation — without it TypeScript infers `any` here, which only `next build`'s type check
      // catches (vitest and eslint both pass).
      Code: ({ node }: { node: unknown }) => (
        <LearningCodeBlock node={node as LearningCodeBlockNode} />
      ),
      youtube: ({ node }: { node: unknown }) => <LearningVideo node={node as LearningVideoNode} />,
    },
  });
}

/**
 * 028 US1: every h2–h4 gets an anchor and a self-link. A caller that also renders `PageToc` passes the
 * same `headings` it gave the table of contents, so both read one list (research R3); otherwise the
 * body extracts them itself. The converters are built per render because they close over the
 * node → anchor map.
 */
export function LearningBody({
  body,
  headings,
}: {
  body: LearningPage['body'];
  headings?: readonly Heading[];
}) {
  const headingIds = headingIdMap(headings ?? extractHeadings(body));
  return (
    <div className="app-richtext app-learning-page__body">
      <RichText data={body} converters={learningConverters(headingIds)} />
    </div>
  );
}
