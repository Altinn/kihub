import { RichText } from '@payloadcms/richtext-lexical/react';
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import { LearningCodeBlock, type LearningCodeBlockNode } from '@/components/LearningCodeBlock';
import { LearningImage, type LearningImageNode } from '@/components/LearningImage';
import type { LearningPage } from '@/payload-types';

/**
 * 014 US3 — the learning page body (contracts/learning-editor.md §B).
 *
 * Two custom converters on top of the defaults: inline uploads become a `<figure>` with correct alt
 * handling, and the `Code` block becomes a highlighted, display-only `<pre>`.
 *
 * Note these converters are SYNCHRONOUS — the converter type returns `React.ReactNode`, not a promise
 * (research §3). That is precisely why the highlighter is shiki's synchronous core: no async component
 * and no Suspense boundary is introduced per code block.
 */
const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => <LearningImage node={node as unknown as LearningImageNode} />,
  blocks: {
    // The `blocks` map is indexed by block slug and typed loosely, so `node` needs an explicit
    // annotation — without it TypeScript infers `any` here, which only `next build`'s type check
    // catches (vitest and eslint both pass).
    Code: ({ node }: { node: unknown }) => (
      <LearningCodeBlock node={node as LearningCodeBlockNode} />
    ),
  },
});

export function LearningBody({ body }: { body: LearningPage['body'] }) {
  return (
    <div className="lp-page__body kihub-prose">
      <RichText data={body} converters={converters} />
    </div>
  );
}
