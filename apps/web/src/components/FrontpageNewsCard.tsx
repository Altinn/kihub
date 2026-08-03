import Link from 'next/link';
import type { News } from '@/payload-types';

/**
 * 011 US3 — one "Siste nytt" card (contracts/frontpage-read.md): 16:10 media well (image or
 * design-system placeholder), serif title, nb-NO date line and summary. The whole card is a
 * single link to the article (FR-008/014).
 */

function formatNewsDate(publishDate?: string | null): string {
  if (!publishDate) return '';
  return new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(publishDate));
}

export function FrontpageNewsCard({ article }: { article: News }) {
  const date = formatNewsDate(article.publishDate);
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
        <h3 className="kihub-h4">{article.title}</h3>
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
