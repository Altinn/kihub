import Link from 'next/link';
import type { NewsPagination as NewsPaginationModel } from '@/lib/news-view';

/**
 * 013 FR-008/009 — the /news paging controls (contracts/news-page-ui.md §B.2). Link-based and
 * server-rendered, so paging works with client-side scripting disabled (SC-003); all boundary logic
 * lives in `buildPagination`, leaving this a pure render.
 *
 * 026: Designsystemet's Pagination, rendered as its `<ds-pagination>` web component (from
 * `@digdir/designsystemet-web`, loaded once in the shell) with our own `ds-button` links inside.
 * Without `data-current`/`data-total` the element leaves the links alone (it would otherwise fill
 * empty ones client-side), so paging stays server-rendered; it only sets `role="navigation"` and
 * the label, which the server renders too (`suppressHydrationWarning`, as in `Breadcrumbs`).
 * Designsystemet's CSS draws the arrows and the ellipsis. The current page is a link marked
 * `aria-current="true"`. An unavailable direction keeps its slot as an `aria-hidden` span
 * (Designsystemet hides it), so keyboard and screen-reader users never meet a control that does
 * nothing. The label and the prev/next names follow Designsystemet's Norwegian defaults.
 */
export function NewsPagination({ pagination }: { pagination: NewsPaginationModel }) {
  // The whole bar is omitted — not disabled — when the archive fits on one page (FR-009).
  if (!pagination.visible) return null;

  return (
    <ds-pagination
      className="ds-pagination app-pagination"
      role="navigation"
      aria-label="Bla i sider"
      suppressHydrationWarning
    >
      <ul>
        <li>
          {pagination.prevHref ? (
            <Link href={pagination.prevHref} className="ds-button" data-variant="tertiary" aria-label="Forrige side">
              Forrige
            </Link>
          ) : (
            <span className="ds-button" data-variant="tertiary" aria-hidden="true">
              Forrige
            </span>
          )}
        </li>
        {pagination.items.map((item, index) =>
          item ? (
            <li key={item.page}>
              <Link
                href={item.href}
                className="ds-button"
                data-variant="tertiary"
                aria-current={item.current ? 'true' : undefined}
                aria-label={`Side ${item.page}`}
              >
                {item.page}
              </Link>
            </li>
          ) : (
            // Designsystemet draws the ellipsis for an empty item.
            <li key={`gap-${index}`} aria-hidden="true" />
          ),
        )}
        <li>
          {pagination.nextHref ? (
            <Link href={pagination.nextHref} className="ds-button" data-variant="tertiary" aria-label="Neste side">
              Neste
            </Link>
          ) : (
            <span className="ds-button" data-variant="tertiary" aria-hidden="true">
              Neste
            </span>
          )}
        </li>
      </ul>
    </ds-pagination>
  );
}
