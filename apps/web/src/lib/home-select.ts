import type { ArtifactCardData } from '@/components/ArtifactCard';
import type { Governance } from '@/lib/governance';

/**
 * Pure selection helpers for the home dashboard widgets (FR-002/013). These take the output of the
 * existing read layers — which already gate visibility and order results (news featured-first +
 * newest-first, events featured-first + soonest-first) — and cap/curate it for the widgets. They
 * import Payload-derived shapes as **types only** (erased at compile time), so this module never
 * loads `@payload-config` and unit-tests in isolation (mirrors how `lib/event-dates.ts` is separate
 * from `lib/events.ts`).
 */

/** One catalog artifact paired with its governance state, as the Registry widget renders it. */
export interface RecommendedArtifact {
  artifact: ArtifactCardData;
  governance: Governance;
}

/** Return the first `n` items in input order (the read layers already applied the ordering). */
export function takeTopN<T>(items: T[], n: number): T[] {
  if (n <= 0) return [];
  return items.slice(0, n);
}

/**
 * Curate artifacts for the Registry widget: keep only those flagged `featured` or `recommended` in
 * governance, surface featured ones ahead of recommended-only ones (stable within each group,
 * preserving the incoming `listArtifacts` order), and cap at `n`. Returns `[]` when none qualify
 * (drives the widget's empty state) — an active-but-unflagged artifact is intentionally excluded.
 */
export function selectRecommendedArtifacts(
  entries: RecommendedArtifact[],
  n: number,
): RecommendedArtifact[] {
  const qualifying = entries.filter((e) => e.governance.featured || e.governance.recommended);
  const featuredFirst = [...qualifying].sort(
    (a, b) => Number(Boolean(b.governance.featured)) - Number(Boolean(a.governance.featured)),
  );
  return takeTopN(featuredFirst, n);
}
