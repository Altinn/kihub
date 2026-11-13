import { toTocTree, type Heading, type TocItem } from '@/lib/headings';

/**
 * 028 US1 — «På denne siden», the table of contents of a Page or KI Læring page
 * (specs/028-docs-navigation/contracts/headings-toc.md §C).
 *
 * A server component on a Designsystemet `details`, emitted ONCE: on wide screens app.css places it
 * in the article's right column, forces it open and hides its summary (the `.app-learning__disclosure`
 * technique); on narrower screens it is the collapsed control before the body text. Works without
 * JavaScript either way. Designsystemet has no table-of-contents component; `/bidra`'s hand-written
 * list is the visual precedent.
 *
 * Fewer than two headings → nothing: a one-entry list adds nothing to the page.
 */
function TocList({ items }: { items: TocItem[] }) {
  return (
    <ol className="app-toc__list">
      {items.map((item) => (
        <li key={item.id}>
          <a className="ds-link app-toc__link" href={`#${item.id}`} data-color="neutral">
            {item.text}
          </a>
          {item.children.length ? <TocList items={item.children} /> : null}
        </li>
      ))}
    </ol>
  );
}

export function PageToc({ headings }: { headings: readonly Heading[] }) {
  if (headings.length < 2) return null;
  return (
    <details className="ds-details app-toc" data-color="neutral">
      <summary>På denne siden</summary>
      <nav aria-label="Innhold på siden" className="app-toc__nav">
        <TocList items={toTocTree(headings)} />
      </nav>
    </details>
  );
}
