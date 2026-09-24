import Link from 'next/link';
import { formatNewsDate, pickCardImage, resolveHeroSource } from '@/lib/news-view';
import type { News } from '@/payload-types';

/**
 * One news card (013 FR-002/003, contracts/news-page-ui.md §B.1): 16:10 media well (image or
 * design-system placeholder), serif title, nb-NO date line and summary. The whole card is a single
 * link to the article — no competing nested links.
 *
 * Shared by BOTH news surfaces: the frontpage "Siste nytt" section (011 US3, `headingLevel={3}`
 * under its "Siste nytt" `<h2>`) and the /news grid (013 US1, `headingLevel={2}` under the page
 * `<h1>`). 013 consolidated the frontpage-only `FrontpageNewsCard` into this file so the two
 * surfaces cannot drift apart.
 *
 * 020 — the image is resolved by `resolveHeroSource`: an uploaded hero renders the focal-framed
 * 16:10 card sizes (`pickCardImage`, with `object-position` on the focal point so a fallback source
 * frames identically); a legacy `heroImageUrl` renders exactly as before; neither → placeholder.
 * The card image is always `alt=""` — the card is one link named by its title (contract B2).
 */
export function NewsCard({
  article,
  headingLevel = 2,
}: {
  article: News;
  headingLevel?: 2 | 3;
}) {
  const date = formatNewsDate(article.publishDate);
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  const hero = resolveHeroSource(article);
  const card = hero.kind === 'upload' ? pickCardImage(hero.media) : null;

  return (
    <Link
      href={`/news/${article.slug ?? ''}`}
      className="kihub-focusable"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article className="kihub-stack" style={{ gap: 'var(--kihub-space-3)' }}>
        <div
          className={`kihub-media${hero.kind === 'none' ? ' kihub-media--placeholder' : ''}`}
          style={{ aspectRatio: '16 / 10' }}
        >
          {card ? (
            // Payload already generated the sizes with sharp; next/image would add a second
            // optimisation layer over them (the 014 LearningImage precedent).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.src}
              srcSet={card.srcSet}
              sizes="(max-width: 719px) 100vw, 50vw"
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: card.objectPosition,
                display: 'block',
              }}
            />
          ) : hero.kind === 'legacy' ? (
            // Legacy (pre-020) editor-provided URL; a broken URL leaves the tinted well visible
            // behind it, matching the placeholder look.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : null}
        </div>
        <Heading className="kihub-h4">{article.title}</Heading>
        {date ? (
          <p
            style={{
              margin: 0,
              font: '400 13px var(--kihub-font-ui)',
              color: 'var(--kihub-text-subtle)',
            }}
          >
            {date}
          </p>
        ) : null}
        {article.summary ? (
          <p
            style={{
              margin: 0,
              font: '400 16px/1.55 var(--kihub-font-display)',
              color: 'var(--kihub-text-subtle)',
            }}
          >
            {article.summary}
          </p>
        ) : null}
      </article>
    </Link>
  );
}
