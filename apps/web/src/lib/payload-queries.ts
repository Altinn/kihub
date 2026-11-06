import type { DataFromCollectionSlug, Payload } from 'payload';

/**
 * Shared "published only" filter for native-content read layers (News, Learning, Projects, Events,
 * ...). Every read-layer function that lists or resolves employee-facing content ANDs this in,
 * so a draft can never leak through — the collection's own `access.read` rule is the second line
 * of defense.
 *
 * 027: `_status` is Payload's built-in drafts field (`lib/content-versions.ts`), which replaced the
 * hand-rolled `status` select. A non-draft read returns the main-table row, i.e. the PUBLISHED
 * version of a published document even while a newer draft is pending; this filter additionally
 * excludes documents that have never been published.
 */
export const PUBLISHED = { _status: { equals: 'published' } } as const;

/** 027 — by-slug reads take this: `preview` comes ONLY from `getPreviewState().active` in a route. */
export interface ReadOptions {
  /** Return the latest version, draft or not (an editor previewing). Never set from user input. */
  preview?: boolean;
}

/** 027 — the draft-enabled collections addressed by a unique `slug` (`lib/content-versions.ts`). */
export type SluggedDraftCollection = 'news' | 'learning-pages' | 'projects' | 'events' | 'pages';

/**
 * The shared by-slug read behind every `get…BySlug` reader: the published document, or with
 * `{ preview: true }` the LATEST version (draft or not, via Payload `draft: true`, which reads the
 * `_<collection>_v` versions table) — including never-published drafts and a pending draft's
 * renamed slug.
 *
 * Preview collision: `slug` is unique only in the main table, NOT in the versions table, so another
 * document's draft (e.g. an autosave while an editor types an address that is already taken) can
 * claim the same slug. Every candidate is read, and with more than one, the document whose
 * MAIN-table row owns the slug (any status) wins; the others could never be published at that
 * address anyway. Without an owner (only never-saved claims), the first candidate is returned.
 */
export async function findBySlug<C extends SluggedDraftCollection>(
  payload: Payload,
  collection: C,
  slug: string,
  opts: ReadOptions & { depth?: number } = {},
): Promise<DataFromCollectionSlug<C> | null> {
  const bySlug = { slug: { equals: slug } };
  const depth = opts.depth === undefined ? {} : { depth: opts.depth };

  if (!opts.preview) {
    const result = await payload.find({
      collection,
      where: { and: [bySlug, PUBLISHED] },
      limit: 1,
      ...depth,
      overrideAccess: true,
    });
    return (result.docs[0] as DataFromCollectionSlug<C> | undefined) ?? null;
  }

  // Every draft claiming the slug, not a fixed window: with three or more claimants the owner could
  // otherwise fall outside it. Normally this is one row.
  const drafts = await payload.find({
    collection,
    where: bySlug,
    draft: true,
    pagination: false,
    ...depth,
    overrideAccess: true,
  });
  const candidates = drafts.docs as DataFromCollectionSlug<C>[];
  if (candidates.length <= 1) return candidates[0] ?? null;

  const owner = await payload.find({
    collection,
    where: bySlug, // main table, any status
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const ownerId = owner.docs[0]?.id;
  return candidates.find((doc) => doc.id === ownerId) ?? candidates[0] ?? null;
}
