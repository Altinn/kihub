import { Divider, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import { RichText } from '@payloadcms/richtext-lexical/react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedNewsBySlug } from '@/lib/news';

/**
 * Employee article detail (US1, FR-005/006/011): title, byline, publish date, tags, optional hero
 * image, and the rich-text body. A draft or unknown slug resolves to `null` → 404 (no draft leaks).
 */
export default async function NewsDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getPublishedNewsBySlug(decodeURIComponent(slug));
  if (!article) notFound();

  const author = typeof article.author === 'object' && article.author ? article.author : null;
  const byline = author?.name || author?.email || 'KI Hub';
  const tags = (article.tags ?? []).filter((t): t is string => Boolean(t));
  const publishedOn = article.publishDate
    ? new Date(article.publishDate).toLocaleDateString('nb-NO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1rem' }}>
      <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
        <Link href="/news">← Back to news</Link>
      </Paragraph>

      <Heading level={1} data-size="lg">
        {article.title}
      </Heading>
      <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
        By {byline}
        {publishedOn ? ` · ${publishedOn}` : ''}
      </Paragraph>

      {tags.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
          {tags.map((t) => (
            <Tag key={t} data-color="info" data-size="sm">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}

      {article.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- hero image is an arbitrary external URL (managed uploads deferred, research §6)
        <img
          src={article.heroImageUrl}
          alt=""
          style={{ width: '100%', height: 'auto', borderRadius: '8px', marginTop: '1.5rem' }}
        />
      ) : null}

      <Divider style={{ margin: '1.5rem 0' }} />

      <RichText data={article.body} />
    </main>
  );
}
