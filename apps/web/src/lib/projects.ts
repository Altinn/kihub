import { payloadProjectsSource } from '@/lib/content/payload/projects';
import type { ProjectItem } from '@/lib/content/types';

/**
 * 016 read layer for the employee-facing `/prosjekter` surfaces. Since 023 a facade: the content
 * source behind it is chosen per module (contracts/content-source.md §4). Published-only, ordering
 * and not-found semantics are guaranteed by every source (§3).
 */

/** Published projects, ordered by the editor-controlled `order` field, then creation order. */
export function listPublishedProjects(): Promise<ProjectItem[]> {
  return payloadProjectsSource.listPublished();
}

/** A single published project by slug, or `null` (draft/unknown → the page returns 404). */
export function getPublishedProjectBySlug(slug: string): Promise<ProjectItem | null> {
  return payloadProjectsSource.getPublishedBySlug(slug);
}
