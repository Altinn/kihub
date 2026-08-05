import Link from 'next/link';
import type { NewsPagination as NewsPaginationModel } from '@/lib/news-view';

/**
 * 013 FR-008/009 — the /news paging controls (contracts/news-page-ui.md §B.2). Link-based and
 * server-rendered, so paging works with client-side scripting disabled (SC-003); all boundary logic
 * lives in `buildPagination`, leaving this a pure render.
 *
 * An unavailable direction renders as a non-focusable `<span>` rather than a disabled link, so
 * keyboard users never land on a control that does nothing.
 */
export function NewsPagination({ pagination }: { pagination: NewsPaginationModel }) {
  // The whole bar is omitted — not disabled — when the archive fits on one page (FR-009).
  if (!pagination.visible) return null;

  return (
    <nav aria-label="Paginering" className="news-pagination">
      {pagination.prevHref ? (
        <Link href={pagination.prevHref} className="news-pagination__btn kihub-focusable">
          ‹ Forrige
        </Link>
      ) : (
        <span className="news-pagination__btn news-pagination__btn--off" aria-disabled="true">
          ‹ Forrige
        </span>
      )}

      <span className="news-pagination__label" aria-current="page">
        {pagination.label}
      </span>

      {pagination.nextHref ? (
        <Link href={pagination.nextHref} className="news-pagination__btn kihub-focusable">
          Neste ›
        </Link>
      ) : (
        <span className="news-pagination__btn news-pagination__btn--off" aria-disabled="true">
          Neste ›
        </span>
      )}
    </nav>
  );
}
