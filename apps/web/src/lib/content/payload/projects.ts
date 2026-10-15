import type { Project } from '@/payload-types';
import type { ProjectsSource } from '../ports';
import { lexicalContent } from '../rich-text';
import type { ProjectItem } from '../types';
import { PUBLISHED, payloadClient } from './client';

/**
 * 016 read layer for `/prosjekter`, moved verbatim into the Payload content source by 023. Every
 * method returns ONLY published projects by construction (mirroring news/learning), so the employee
 * pages can never render a draft — the collection's `read` access rule is the second line of
 * defense for the API path.
 */

export function toProjectItem(doc: Project): ProjectItem {
  return {
    id: String(doc.id),
    slug: doc.slug ?? '',
    title: doc.title,
    summary: doc.summary ?? null,
    body: lexicalContent(doc.body),
  };
}

export const payloadProjectsSource: ProjectsSource = {
  /**
   * Ordered by the editor-controlled `order` field (ascending). Most projects share the default
   * `order` (100), so the secondary key is explicit rather than relying on whatever tie-break the
   * adapter happens to apply.
   */
  async listPublished() {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: 'projects',
      where: PUBLISHED,
      sort: ['order', 'createdAt'],
      limit: 200,
      overrideAccess: true,
    });
    return (result.docs as Project[]).map(toProjectItem);
  },

  /** A single published project by slug, or `null` (draft/unknown → the page returns 404). */
  async getPublishedBySlug(slug) {
    const payload = await payloadClient();
    const result = await payload.find({
      collection: 'projects',
      where: { and: [{ slug: { equals: slug } }, PUBLISHED] },
      limit: 1,
      overrideAccess: true,
    });
    const doc = result.docs[0] as Project | undefined;
    return doc ? toProjectItem(doc) : null;
  },
};
