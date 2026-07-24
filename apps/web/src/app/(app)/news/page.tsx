import { Card, Divider, Heading, Paragraph } from '@digdir/designsystemet-react';
import Link from 'next/link';
import { NewsCard } from '@/components/NewsCard';
import { PortalHeader } from '@/components/PortalHeader';
import { listPublishedNews } from '@/lib/news';

/**
 * Employee news list (US1, FR-004/012): published articles, featured surfaced, newest-first, with a
 * friendly empty state. Access is gated by `(app)/layout.tsx` `requireSession()` — employees only.
 */
export default async function NewsListPage() {
  const articles = await listPublishedNews();

  return (
    <main style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1rem' }}>
      <PortalHeader />

      <Divider style={{ margin: '1.5rem 0' }} />

      <Paragraph data-size="sm" style={{ marginBottom: '1rem' }}>
        <Link href="/registry">← Back to catalog</Link>
      </Paragraph>

      <Heading level={2} data-size="lg">
        News
      </Heading>
      <Paragraph data-size="sm" style={{ marginTop: '0.25rem' }}>
        Internal news and announcements.
      </Paragraph>

      <Divider style={{ margin: '1.5rem 0' }} />

      {articles.length === 0 ? (
        <Card>
          <Heading level={2} data-size="sm">
            No news yet
          </Heading>
          <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
            There are no published news articles right now. Check back soon.
          </Paragraph>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {articles.map((a) => (
            <NewsCard
              key={a.id}
              article={{
                slug: a.slug ?? '',
                title: a.title,
                summary: a.summary,
                publishDate: a.publishDate,
                tags: a.tags,
                featured: a.featured,
              }}
            />
          ))}
        </div>
      )}
    </main>
  );
}
