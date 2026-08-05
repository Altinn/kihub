import { NewsCard } from '@/components/NewsCard';
import { NewsPagination } from '@/components/NewsPagination';
import { listPublishedNewsPage } from '@/lib/news';
import { buildPagination, parseNewsPageParam } from '@/lib/news-view';

/**
 * 013 — "Nyheter" (contracts/news-page-ui.md §B.3). One server component: the editorial card grid
 * of published articles, newest-first, paginated entirely through the `?page=` search param
 * (FR-002/005/007) so it works with client-side scripting disabled (SC-003). Access is gated by
 * `(app)/layout.tsx` `requireSession()` — employees only; drafts can never appear (FR-012).
 */

type SearchParams = Record<string, string | string[] | undefined>;

export default async function NewsListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  // `page` is the only param this surface reads; malformed values fall back to page 1 (FR-010).
  const requested = parseNewsPageParam((await searchParams).page);
  const { articles, page, totalPages, totalDocs } = await listPublishedNewsPage(requested);
  // Built from the RETURNED page, so an out-of-range request labels the page it actually rendered.
  const pagination = buildPagination(page, totalPages, totalDocs);

  return (
    <main className="kihub-container">
      <div className="kihub-section">
        <h1 className="kihub-h1">Nyheter</h1>

        {articles.length === 0 ? (
          <div className="news-empty">
            <p className="kihub-h3">Ingen nyheter ennå</p>
            <p style={{ margin: 0, color: 'var(--kihub-text-subtle)' }}>
              Det er ingen publiserte nyheter akkurat nå. Kom tilbake senere.
            </p>
          </div>
        ) : (
          <div className="news-grid">
            {articles.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        )}

        <NewsPagination pagination={pagination} />
      </div>
    </main>
  );
}
