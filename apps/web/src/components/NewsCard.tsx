import Link from 'next/link';
import { formatNewsDate } from '@/lib/news-view';
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

  return (
    <Link
      href={`/news/${article.slug ?? ''}`}
      className="kihub-focusable"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <article className="kihub-stack" style={{ gap: 'var(--kihub-space-3)' }}>
        <div
          className={`kihub-media${article.heroImageUrl ? '' : ' kihub-media--placeholder'}`}
          style={{ aspectRatio: '16 / 10' }}
        >
          {article.heroImageUrl ? (
            // Image URLs are editor-provided strings (no Media collection); a broken URL leaves
            // the tinted well visible behind it, matching the placeholder look.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.heroImageUrl}
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
