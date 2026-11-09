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
