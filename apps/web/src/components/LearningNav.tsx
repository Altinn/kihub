import Link from 'next/link';
import type { LearningTree, LearningTreeGroup } from '@/lib/learning-view';

/**
 * 014 US1 — the resource navigation ("Utforsk innhold"), contracts/learning-page-ui.md §B.
 *
 * A SERVER component built on native `<details>`/`<summary>`, not a client component. That choice is
 * what makes FR-005 true — expanding and collapsing work with JavaScript disabled — and it also
 * implements FR-004 for free: the group holding the current page is opened by emitting `open` on the
 * server, with no state, no effect and no hydration.
 *
 * 026: each category is a Designsystemet `details.ds-details` (its own chevron, focus and open
 * styling replace the custom ▾/▴ markers). A subcategory is a labelled list, not an h3 — headings
 * here came before the page's h1 in the DOM and broke the outline. Links are `ds-link`s; the
 * current page is `aria-current` and shown by weight + rule + tint, never colour alone.
 */
function PageList({ pages, labelledBy }: { pages: LearningTreeGroup['pages']; labelledBy?: string }) {
  return (
    <ul className="app-learning-nav__list" aria-labelledby={labelledBy}>
      {pages.map((page) => (
        <li key={page.slug}>
          <Link
            href={page.href}
            className="ds-link app-learning-nav__link"
            data-color="neutral"
            aria-current={page.isCurrent ? 'page' : undefined}
          >
            {page.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function LearningNav({ tree }: { tree: LearningTree }) {
  // An empty library renders no navigation shell at all (FR-009) — the caller owns the empty state.
  if (!tree.length) return null;

  return (
    <nav className="app-learning-nav" aria-label="Utforsk læringsinnhold" data-color="neutral">
      {tree.map((category, categoryIndex) => (
        <details
          key={category.title}
          className="ds-details"
          // FR-004: server-emitted, so the current page's group is already open on first paint.
          open={category.containsCurrent}
        >
          <summary>{category.title}</summary>
          <div>
            {category.pages.length ? <PageList pages={category.pages} /> : null}

            {category.groups.map((group, groupIndex) => {
              const labelId = `learning-nav-${categoryIndex}-${groupIndex}`;
              return (
                <div key={group.title} className="app-learning-nav__group">
                  <p id={labelId} className="ds-paragraph app-learning-nav__group-title" data-size="sm">
                    {group.title}
                  </p>
                  <PageList pages={group.pages} labelledBy={labelId} />
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </nav>
  );
}
