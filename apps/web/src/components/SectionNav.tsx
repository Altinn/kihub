import Link from 'next/link';
import type { PageSection, SectionItem } from '@/lib/page-tree';

/**
 * 028 US3 — the menu of a section's published Pages (contracts/page-hierarchy.md §F): the top-level
 * page first, then its children in the editor's order, grandchildren nested beneath them. All levels
 * stand open; sections are small.
 *
 * Same markup and classes as KI Læring's `LearningNav` (026), so it looks and behaves the same: a
 * named `nav` landmark, `ds-link`s, and the current page marked by `aria-current` (weight + rule +
 * tint, never colour alone). A server component — no JavaScript.
 */
function Item({ item }: { item: SectionItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="ds-link app-learning-nav__link"
        data-color="neutral"
        aria-current={item.isCurrent ? 'page' : undefined}
      >
        {item.title}
      </Link>
      {item.children.length ? (
        <ul className="app-learning-nav__list app-section-nav__sublist">
          {item.children.map((child) => (
            <Item key={child.id} item={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function SectionNav({ section }: { section: PageSection }) {
  return (
    <nav className="app-learning-nav app-section-nav" aria-label={section.title} data-color="neutral">
      <ul className="app-learning-nav__list">
        <Item item={section.root} />
      </ul>
    </nav>
  );
}
