import { LearningNav } from '@/components/LearningNav';
import type { LearningTree } from '@/lib/learning-view';

/**
 * 014 US1 — the two-column KI Læring shell (contracts/learning-page-ui.md §A): resource navigation
 * on the left, content on the right, on every learning surface.
 *
 * This is a shared component rather than a `layout.tsx` for a structural reason: a Next.js layout
 * does not receive the params of a CHILD segment, so a layout at `/laering` cannot know the `[slug]`
 * of the page being rendered — and the navigation needs it to mark the current entry (FR-003) and to
 * open the right group server-side (FR-004). Each route therefore reads the library and renders this
 * shell with its own `currentSlug`.
 *
 * The phone-level disclosure is a native `<details>` here too, so the whole navigation collapses
 * above the content with no JavaScript (FR-006). 026: it is a Designsystemet `ds-details`; on
 * wide screens app.css hides its summary and forces it open, so the navigation simply stands.
 */
export function LearningShell({
  tree,
  children,
}: {
  tree: LearningTree;
  children: React.ReactNode;
}) {
  const hasNav = tree.length > 0;

  return (
    <div className="app-container">
      <div className="app-learning" data-nav={hasNav || undefined}>
        {hasNav ? (
          <div className="app-learning__aside">
            {/* Desktop: the navigation stands open. Phone: this <details> collapses it (CSS swaps
                which of the two is shown, so the markup is emitted once). */}
            <details className="ds-details app-learning__disclosure" data-color="neutral">
              <summary>Utforsk innhold</summary>
              <LearningNav tree={tree} />
            </details>
          </div>
        ) : null}

        <div className="app-learning__content">{children}</div>
      </div>
    </div>
  );
}
