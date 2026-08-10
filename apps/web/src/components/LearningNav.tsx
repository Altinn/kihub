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
 * `SiteNav.tsx` uses the client-component + `aria-expanded` pattern; it deliberately is NOT the model
 * here, because it cannot satisfy FR-005 (research §10).
 */
function PageList({ pages }: { pages: LearningTreeGroup['pages'] }) {
  return (
    <ul className="lp-nav__list">
      {pages.map((page) => (
        <li key={page.slug}>
          <Link
            href={page.href}
            className="lp-nav__link kihub-focusable"
            // Conveys the current page to assistive technology; the visible treatment in
            // portal.css keys off the same attribute, so the two can never disagree (§B2).
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
    <nav className="lp-nav" aria-label="Utforsk læringsinnhold">
      {tree.map((category) => (
        <details
          key={category.title}
          className="lp-nav__group"
          // FR-004: server-emitted, so the current page's group is already open on first paint.
          open={category.containsCurrent}
        >
          <summary className="lp-nav__group-title kihub-focusable">{category.title}</summary>

          {category.pages.length ? <PageList pages={category.pages} /> : null}

          {category.groups.map((group) => (
            <div key={group.title} className="lp-nav__subgroup">
              <h3 className="lp-nav__subgroup-title">{group.title}</h3>
              <PageList pages={group.pages} />
            </div>
          ))}
        </details>
      ))}
    </nav>
  );
}
