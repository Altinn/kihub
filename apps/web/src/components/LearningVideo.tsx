import { parseYouTubeId, parseYouTubeStart, youtubeEmbedUrl } from '@/lib/youtube';

/**
 * 022 — an embedded YouTube video on a learning page.
 *
 * Server-rendered `<iframe>`, so the feature adds no client component. Privacy-enhanced host, lazy
 * loading, and subtitles forced on with Norwegian preferred (`lib/youtube.ts`). The `referrerPolicy`
 * must NOT be `no-referrer`: YouTube refuses to play embeds that send no referrer.
 */
export interface LearningVideoNode {
  fields: {
    url?: string | null;
    title?: string | null;
    caption?: string | null;
    blockType?: string;
  };
}

export function LearningVideo({ node }: { node: LearningVideoNode }) {
  const url = node.fields?.url;
  const id = parseYouTubeId(url);
  if (!id) return null;

  const title = node.fields?.title?.trim() || 'YouTube-video';
  const caption = node.fields?.caption?.trim();
  const src = youtubeEmbedUrl(id, { start: parseYouTubeStart(url) });

  return (
    <figure className="lp-video">
      <div className="lp-video__frame">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      {caption ? <figcaption className="lp-video__caption">{caption}</figcaption> : null}
    </figure>
  );
}
