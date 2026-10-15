import { RichText } from '@payloadcms/richtext-lexical/react';
import type { JSXConvertersFunction } from '@payloadcms/richtext-lexical/react';
import { LearningCodeBlock } from '@/components/LearningCodeBlock';
import { LearningImage } from '@/components/LearningImage';
import { LearningVideo } from '@/components/LearningVideo';
import { toContentImage } from '@/lib/content/payload/media';
import type { LexicalDocument } from '@/lib/content/rich-text';
import type { Media } from '@/payload-types';

/**
 * 023 — the lexical (Payload) branch of `<RichTextBody>` (contracts/rich-text.md §2–§4). The ONLY
 * employee-app file that imports Payload's rich-text renderer.
 *
 * Two profiles, because the output must stay byte-identical (research R5):
 * - `standard` passes NO converters — exactly today's bare `<RichText data={…} />` on news, events,
 *   projects and the subscriptions banner (so an inline upload keeps Payload's default markup);
 * - `learning` is 014's converter set, moved verbatim from `LearningBody`: inline uploads become a
 *   `<figure>` with correct alt handling, the `Code` block a highlighted display-only `<pre>`, and the
 *   `youtube` block (022) a responsive embedded player. The converters only translate lexical nodes
 *   into the neutral props of `LearningImage` / `LearningCodeBlock` / `LearningVideo`, so a renderer
 *   for another format can reuse those components unchanged.
 *
 * The converters are SYNCHRONOUS — the converter type returns `React.ReactNode`, not a promise (014
 * research §3) — which is why the highlighter is shiki's synchronous core.
 */

interface UploadNode {
  value?: number | Media | null;
  fields?: { decorative?: boolean | null } | null;
}

interface CodeNode {
  fields?: { code?: string | null; language?: string | null };
}

interface VideoNode {
  fields?: { url?: string | null; title?: string | null; caption?: string | null };
}

const learningConverters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  upload: ({ node }) => {
    const upload = node as unknown as UploadNode;
    return (
      <LearningImage
        image={toContentImage(upload.value)}
        decorative={Boolean(upload.fields?.decorative)}
      />
    );
  },
  blocks: {
    // The `blocks` map is indexed by block slug and typed loosely, so `node` needs an explicit
    // annotation — without it TypeScript infers `any` here, which only `next build`'s type check
    // catches (vitest and eslint both pass).
    Code: ({ node }: { node: unknown }) => {
      const { fields } = node as CodeNode;
      return <LearningCodeBlock code={fields?.code ?? ''} language={fields?.language ?? null} />;
    },
    youtube: ({ node }: { node: unknown }) => {
      const { fields } = node as VideoNode;
      return (
        <LearningVideo
          url={fields?.url ?? null}
          title={fields?.title ?? null}
          caption={fields?.caption ?? null}
        />
      );
    },
  },
});

export type RichTextProfile = 'standard' | 'learning';

export function LexicalRichText({
  document,
  profile,
}: {
  document: LexicalDocument;
  profile: RichTextProfile;
}) {
  // `RichText`'s `data` is Payload's own editor-state type; `LexicalDocument` is the same shape
  // declared by hand (lib/content/rich-text.ts).
  const data = document as unknown as React.ComponentProps<typeof RichText>['data'];
  return profile === 'learning' ? (
    <RichText data={data} converters={learningConverters} />
  ) : (
    <RichText data={data} />
  );
}
