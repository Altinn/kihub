import { RichText } from '@payloadcms/richtext-lexical/react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedNewsBySlug } from '@/lib/news';
import { formatNewsDate, pickArticleImage, resolveHeroSource } from '@/lib/news-view';

/**
 * 013 US3 (FR-014) — the article page on the kihub token layer, Norwegian copy: title, byline +
 * Oslo-correct date, tags, hero image, rich-text body, and a link back to "Nyheter". A draft or
 * unknown slug resolves to `null` → 404 (no draft leaks, FR-012).
 *
 * 020 — an uploaded hero is shown WHOLE at reading width with its media alt text (`pickArticleImage`,
 * never a 16:10 card crop, FR-006/007); a legacy `heroImageUrl` renders exactly as before.
 */
export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(decodeURIComponent(slug));
  if (!article) notFound();

  const author = typeof article.author === 'object' && article.author ? article.author : null;
  const byline = author?.name || author?.email || 'KI Hub';
  const tags = (article.tags ?? []).filter((t): t is string => Boolean(t));
  const publishedOn = formatNewsDate(article.publishDate);
  const hero = resolveHeroSource(article);
  const heroImage = hero.kind === 'upload' ? pickArticleImage(hero.media) : null;

  return (
    <main className="kihub-container">
      <article className="kihub-section news-detail">
        <p className="news-detail__back">
          <Link href="/news" className="kihub-link">
            ← Til nyheter
          </Link>
        </p>

        <h1 className="kihub-h2 news-detail__title">{article.title}</h1>

        <p className="news-detail__meta">
          Av {byline}
          {publishedOn ? ` · ${publishedOn}` : ''}
        </p>

        {tags.length ? (
          <ul className="news-detail__tags">
            {tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : null}

        {heroImage ? (
          <div className="kihub-media news-detail__hero">
            {/* eslint-disable-next-line @next/next/no-img-element -- Payload already generated the sizes with sharp (014 LearningImage precedent) */}
            <img
              src={heroImage.src}
              srcSet={heroImage.srcSet}
              sizes="(max-width: 1200px) 100vw, 1200px"
              width={heroImage.width}
              height={heroImage.height}
              alt={heroImage.alt}
              decoding="async"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        ) : hero.kind === 'legacy' ? (
          <div className="kihub-media news-detail__hero">
            {/* eslint-disable-next-line @next/next/no-img-element -- legacy hero is an arbitrary external URL (pre-020) */}
            <img src={hero.url} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        ) : null}

        <div className="news-detail__body kihub-prose">
          <RichText data={article.body} />
        </div>
      </article>
    </main>
  );
}
