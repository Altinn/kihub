/**
 * 028 US3 — the two-column documentation shell (contracts/page-hierarchy.md §G): a navigation on the
 * left, content on the right. It is exactly KI Læring's shell (014/026), lifted out so CMS pages in a
 * section use the same markup and CSS; `LearningShell` is now a thin wrapper over it.
 *
 * No `<main>`: the layout owns the single `<main id="main-content">` that the 026 skip link targets,
 * so the navigation is a named landmark inside it, before the content (spec FR-024).
 *
 * The phone-level disclosure is a native Designsystemet `<details>`, so the navigation collapses above
 * the content with no JavaScript; on wide screens app.css hides its summary and forces it open.
 */
export function DocShell({
  nav,
  navLabel,
  children,
}: {
  nav: React.ReactNode | null;
  /** The phone disclosure's label: «Utforsk innhold» for KI Læring, the section title for Pages. */
  navLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app-container">
      <div className="app-learning" data-nav={nav ? true : undefined}>
        {nav ? (
          <div className="app-learning__aside">
            {/* Desktop: the navigation stands open. Phone: this <details> collapses it (CSS swaps
                which of the two is shown, so the markup is emitted once). */}
            <details className="ds-details app-learning__disclosure" data-color="neutral">
              <summary>{navLabel}</summary>
              {nav}
            </details>
          </div>
        ) : null}

        <div className="app-learning__content">{children}</div>
      </div>
    </div>
  );
}
