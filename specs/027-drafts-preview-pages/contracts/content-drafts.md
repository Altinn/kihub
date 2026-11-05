# Contract: Draft-enabled native-content collections and their read layers

Applies to `news`, `learning-pages`, `projects`, `events`, `pages`. Research: R1, R3, R9, R10.

## A. Collection config (shared shape)

```ts
// lib/content-versions.ts
export const CONTENT_VERSIONS = {
  maxPerDoc: 50,
  drafts: {
    autosave: { interval: 2000 },
    schedulePublish: { timeFormat: 'HH:mm', timeIntervals: 15 },
  },
} satisfies CollectionConfig['versions'];

export const contentAccess = {
  read: ({ req }) => (isEditor(req.user) ? true : { _status: { equals: 'published' } }),
  readVersions: ({ req }) => isEditor(req.user),
  create: ({ req }) => isEditor(req.user),
  update: ({ req }) => isEditor(req.user),
  delete: ({ req }) => isEditor(req.user),
} satisfies CollectionConfig['access'];

// in each collection
versions: CONTENT_VERSIONS,
access: contentAccess,
admin: { ..., preview: (doc) => previewUrl('<collection>', doc?.slug) },  // contracts/preview-route.md
// and: NO `status` field
```

Guarantees (each covered by an integration test through the Payload local API with
`overrideAccess: false` + an explicit `user`, the 016 `projects-access.test.ts` pattern):

| # | Given | Actor | Expect |
|---|---|---|---|
| A1 | never-published draft | reader | `find` / `findByID` → not returned / Forbidden-NotFound |
| A2 | published doc + pending draft with new title | reader | `find` returns the **published** title |
| A3 | any doc | reader | `findVersions` → Forbidden (`readVersions`) |
| A4 | any doc | contributor | `findVersions` → versions listed; `find({ draft: true })` → latest draft |
| A5 | draft | contributor | `update({ _status: 'published' })` succeeds (FR-010) |
| A6 | published | contributor | `update({ _status: 'draft' }, { draft: true })` leaves main row published |
| A7 | published | contributor | unpublish (`update({ _status: 'draft' })` without `draft: true`) → reader no longer sees it |
| A8 | news without `publishDate` | contributor | publish → `publishDate` set; draft save → not set (FR-009) |
| A9 | scheduled publish job due | job runner | `payload.jobs.run()` publishes it; reader sees it after (US6) |

## B. Read-layer contract

Shared filter: `lib/payload-queries.ts` → `PUBLISHED = { _status: { equals: 'published' } }`; the local
copies in `lib/news.ts`, `lib/learning.ts`, `lib/events.ts` are removed in favour of it.

**Listings — published only, always (preview never changes them):**
`listPublishedNews`, `listPublishedNewsPage`, `readLearningLibrary`, `listPublishedProjects`,
`listUpcomingEvents`, `listEventsInRange`, `listPublishedPages` (not needed by any route in this
feature; not added — YAGNI).

**By-slug — published by default, latest draft in preview:**

```ts
type ReadOptions = { preview?: boolean };

getNewsBySlug(slug, opts?)            // was getPublishedNewsBySlug
getLearningPageBySlug(slug, opts?)    // was getPublishedLearningPageBySlug
getProjectBySlug(slug, opts?)         // was getPublishedProjectBySlug
getEventBySlug(slug, opts?)           // was getPublishedEventBySlug
getPageBySlug(slug, opts?)            // new, lib/pages.ts
```

- `preview` falsy → `find({ where: { and: [{ slug }, PUBLISHED] }, overrideAccess: true, limit: 1 })`
  (unchanged semantics).
- `preview` true → `find({ where: { slug: { equals } }, draft: true, overrideAccess: true, limit: 1 })`.
- `preview` is supplied ONLY by route components from `getPreviewState().active`; no read function
  reads cookies or query params itself (keeps the functions pure w.r.t. request state and testable).
- The `.ics` route always calls `getEventBySlug(slug)` without preview.

Renaming drops the now-misleading `Published` prefix; all call sites are route files + tests (grep
listed in plan.md).

## C. Non-goals

- No draft rendering in any listing, count, pagination total, sidebar tree, calendar or frontpage widget.
- No drafts on `learning-categories`, `learning-subcategories`, `site-chrome`, `frontpage` (R13).
