import { Card, Heading, Paragraph, Tag } from '@digdir/designsystemet-react';
import Link from 'next/link';

export interface NewsCardData {
  slug: string;
  title: string;
  summary?: string | null;
  publishDate?: string | null;
  tags?: (string | null)[] | null;
  featured?: boolean | null;
}

/** Listing card for one news article (Designsystemet). Links to the detail page. */
export function NewsCard({ article }: { article: NewsCardData }) {
  const tags = (article.tags ?? []).filter((t): t is string => Boolean(t));
  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <Heading level={2} data-size="xs">
          <Link href={`/news/${article.slug}`}>{article.title}</Link>
        </Heading>
        {article.featured ? (
          <Tag data-color="warning" data-size="sm">
            Featured
          </Tag>
        ) : null}
      </div>
      {article.publishDate ? (
        <Paragraph data-size="xs" style={{ marginTop: '0.25rem' }}>
          {new Date(article.publishDate).toLocaleDateString('nb-NO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Paragraph>
      ) : null}
      {article.summary ? (
        <Paragraph data-size="sm" style={{ marginTop: '0.5rem' }}>
          {article.summary}
        </Paragraph>
      ) : null}
      {tags.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
          {tags.map((t) => (
            <Tag key={t} data-color="info" data-size="sm">
              {t}
            </Tag>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
