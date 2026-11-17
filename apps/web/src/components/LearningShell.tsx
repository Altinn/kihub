import { DocShell } from '@/components/DocShell';
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
 * 028: the markup lives in `DocShell`, which CMS pages in a section share.
 */
export function LearningShell({
  tree,
  children,
}: {
  tree: LearningTree;
  children: React.ReactNode;
}) {
  return (
    <DocShell nav={tree.length > 0 ? <LearningNav tree={tree} /> : null} navLabel="Utforsk innhold">
      {children}
    </DocShell>
  );
}
