import type { CollectionConfig } from 'payload';
import { isEditor } from './access';

/**
 * 027 — Payload's built-in versions + drafts for native editorial content (research R1).
 *
 * Shared by News, Learning pages, Projects and Events (and, later, Pages) so the five collections
 * stay declarative and cannot drift apart. Replaces the hand-rolled `status` select: Payload adds
 * its own `_status` (`draft` | `published`) plus Save draft / Publish / Unpublish, version history
 * with compare + restore, and autosave. Scheduled publishing is deliberately NOT enabled (decided
 * 2026-11-05): it needs a job runner, and production scales to zero.
 *
 * Storage semantics the read layers rely on: the main table holds the PUBLISHED version of a
 * published document, so saving a draft of it does not change what readers see. A never-published
 * document lives in the main table with `_status = 'draft'`, which is why every non-draft read still
 * filters `_status = published` (`lib/payload-queries.ts`).
 *
 * `drafts.validate` stays at its default (`false`): required fields are enforced on publish, not on
 * every draft/autosave, so a half-written draft can be saved.
 */
export const CONTENT_VERSIONS = {
  // Bounded history (spec Assumptions). Autosave updates its own latest version instead of
  // appending one per tick, so 50 covers many editing sessions.
  maxPerDoc: 50,
  drafts: {
    autosave: { interval: 2000 },
  },
} satisfies CollectionConfig['versions'];

/**
 * Access rules for draft-enabled content (research R10).
 *
 * `readVersions` is the load-bearing addition: version rows hold DRAFT content, so without it
 * `/payload-api/<collection>/versions` would serve unpublished bodies to any signed-in employee.
 * The `read` filter is the second line of defence behind the read layers' own `PUBLISHED` filter.
 * Publishing rights are unchanged (spec FR-010): any contributor+ may publish.
 */
export const contentAccess = {
  read: ({ req }) => (isEditor(req.user) ? true : { _status: { equals: 'published' } }),
  readVersions: ({ req }) => isEditor(req.user),
  create: ({ req }) => isEditor(req.user),
  update: ({ req }) => isEditor(req.user),
  delete: ({ req }) => isEditor(req.user),
} satisfies CollectionConfig['access'];
