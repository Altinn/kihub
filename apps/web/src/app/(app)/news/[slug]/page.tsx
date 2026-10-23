import { RichText } from '@payloadcms/richtext-lexical/react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { dsConverters } from '@/lib/ds-richtext-converters';
import { getPublishedNewsBySlug } from '@/lib/news';
import { formatNewsDate, pickArticleImage, resolveHeroSource } from '@/lib/news-view';

/**
 * 013 US3 (FR-014) — the article page, Norwegian copy: title, byline + Oslo-correct date, tags,
 * hero image, rich-text body, and a link back to "Nyheter". A draft or unknown slug resolves to
 * `null` → 404 (no draft leaks, FR-012).
 *
 * 020 — an uploaded hero is shown WHOLE at reading width with its media alt text (`pickArticleImage`,
 * never a 16:10 card crop, FR-006/007); a legacy `heroImageUrl` renders exactly as before.
 *
 * 026: Designsystemet heading/paragraph/tag/link markup; the body renders through the
 * Designsystemet rich-text converters (content headings start at h2 under the title), and the
 * page has its own `<title>`.
 */

// One lookup per request, shared by `generateMetadata` and the page.
const loadArticle = cache((slug: string) => getPublishedNewsBySlug(decodeURIComponent(slug)));

const bodyConverters = dsConverters();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = await loadArticle((await params).slug);
  return article ? { title: article.title } : {};
}

export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await loadArticle((await params).slug);
  if (!article) notFound();

  const author = typeof article.author === 'object' && article.author ? article.author : null;
  const byline = author?.name || author?.email || 'KI Hub';
  const tags = (article.tags ?? []).filter((t): t is string => Boolean(t));
  const publishedOn = formatNewsDate(article.publishDate);
  const hero = resolveHeroSource(article);
  const heroImage = hero.kind === 'upload' ? pickArticleImage(hero.media) : null;

  return (
    <div className="app-container">
      <article className="app-section app-article">
        <Breadcrumbs
          trail={[
            { label: 'Hjem', href: '/' },
            { label: 'Nyheter', href: '/news' },
          ]}
          current={{ label: article.title, href: `/news/${article.slug ?? ''}` }}
        />

        <h1 className="ds-heading" data-size="xl">
          {article.title}
        </h1>

        <p className="ds-paragraph app-meta" data-size="sm">
          Av {byline}
          {publishedOn && article.publishDate ? (
            <>
              {' · '}
              <time dateTime={article.publishDate}>{publishedOn}</time>
            </>
          ) : null}
        </p>

        {tags.length ? (
          <ul className="app-tag-list" aria-label="Emneord">
            {tags.map((t) => (
              <li key={t}>
                <span className="ds-tag">{t}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- Payload already generated the sizes with sharp (014 LearningImage precedent)
          <img
            className="app-article-image"
            src={heroImage.src}
            srcSet={heroImage.srcSet}
            sizes="(max-width: 1200px) 100vw, 1200px"
            width={heroImage.width}
            height={heroImage.height}
            alt={heroImage.alt}
            decoding="async"
          />
        ) : hero.kind === 'legacy' ? (
          // A legacy hero is an arbitrary external URL with no stored alt text (pre-020); it is
          // decorative here because the article title above already names the content.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="app-article-image" src={hero.url} alt="" />
        ) : null}

        <div className="app-richtext">
          <RichText data={article.body} converters={bodyConverters} />
        </div>
      </article>
    </div>
  );
}
