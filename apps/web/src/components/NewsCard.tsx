import Link from 'next/link';
import { formatNewsDate, pickCardImage, resolveHeroSource } from '@/lib/news-view';
import type { News } from '@/payload-types';

/**
 * One news card (013 FR-002/003, contracts/news-page-ui.md §B.1): 16:10 media well (image or
 * placeholder), title, nb-NO date line and summary.
 *
 * Shared by BOTH news surfaces: the frontpage "Siste nytt" section (011 US3, `headingLevel={3}`
 * under its "Siste nytt" `<h2>`) and the /news grid (013 US1, `headingLevel={2}` under the page
 * `<h1>`), so the two surfaces cannot drift apart.
 *
 * 020 — the image is resolved by `resolveHeroSource`: an uploaded hero renders the focal-framed
 * 16:10 card sizes (`pickCardImage`, with `object-position` on the focal point so a fallback source
 * frames identically); a legacy `heroImageUrl` renders exactly as before; neither → placeholder.
 * The card image is always `alt=""` — the card is named by its title (contract B2).
 *
 * 026 R5: a Designsystemet card. The title is the ONE link (`h* > a`), so the link's accessible
 * name is just the headline (no longer date + summary too); `data-clickdelegatefor`
 * (designsystemet-web) forwards clicks anywhere on the card to it. The image is the only child of
 * its own `ds-card__block`, which Designsystemet renders full-bleed.
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
  const linkId = `news-card-${article.id}`;

  return (
    <article className="ds-card app-content-card" data-color="neutral" data-clickdelegatefor={linkId}>
      <div className="ds-card__block">
        {card ? (
          // Payload already generated the sizes with sharp; next/image would add a second
          // optimisation layer over them (the 014 LearningImage precedent).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="app-card-image"
            src={card.src}
            srcSet={card.srcSet}
            sizes="(max-width: 719px) 100vw, 50vw"
            alt=""
            loading="lazy"
            decoding="async"
            // The editor-chosen focal point is per-image data — the one inline style kept (FR-021).
            style={{ objectPosition: card.objectPosition }}
          />
        ) : hero.kind === 'legacy' ? (
          // Legacy (pre-020) editor-provided URL; a broken URL leaves the tinted well visible.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="app-card-image" src={hero.url} alt="" />
        ) : (
          <figure className="app-card-image app-card-image--placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="ds-card__block">
        <Heading className="ds-heading" data-size="xs">
          <Link id={linkId} href={`/news/${article.slug ?? ''}`}>
            {article.title}
          </Link>
        </Heading>
        {date && article.publishDate ? (
          <p className="ds-paragraph app-meta" data-size="sm">
            <time dateTime={article.publishDate}>{date}</time>
          </p>
        ) : null}
        {article.summary ? (
          <p className="ds-paragraph" data-size="sm">
            {article.summary}
          </p>
        ) : null}
      </div>
    </article>
  );
}
