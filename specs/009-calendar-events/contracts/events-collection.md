# Contract: the `events` collection (authoring + access)

Defines the native Events collection authored in the `/cms` back-office. Lives in
`apps/web/src/collections/Event.ts` and is registered in `apps/web/src/payload.config.ts`. No custom admin
UI (Principle VIII — Payload's own admin renders it).

## Collection shape

```ts
// collections/Event.ts (shape — not full implementation)
export const Event: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'startDateTime', 'featured', 'location'],
  },
  access: {
    read:   ({ req }) => isEditor(req.user) ? true : { status: { equals: 'published' } },
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    beforeValidate: [
      /* 1. derive `slug` from `title` via slugify() when empty (reuse lib/slug.ts)
         2. validateEventInterval(startDateTime, endDateTime): throw if end < start (FR-011) */
    ],
  },
  fields: [ /* title, slug (unique), description (richText), startDateTime (date, required),
              endDateTime (date), location (text), onlineUrl (text), organizer (text),
              status (select draft|published), tags (hasMany text), featured (checkbox)
              — see data-model.md */ ],
};

// isEditor: signed-in Contributor+ — Boolean(user) && (user.role as Role) !== 'reader'
// (identical to collections/News.ts; NOT wired into governance-core — research §3)
```

- `read` returns a `Where` for non-editors so the REST/GraphQL API never exposes drafts to a Reader
  (defense in depth for US3).
- `slug` is `unique: true` + indexed; a collision surfaces a friendly validation error.
- The `beforeValidate` hook both derives the slug and rejects `end < start` (delegating to the pure
  `validateEventInterval` in `lib/event-dates.ts`).
- No `beforeChange` author/publishDate defaulting (events have no `author` and no `publishDate` — they
  order by `startDateTime`; organizer is free-text — research §7/§8).

## Access & visibility matrix

| Actor | read | create/update/delete (author, publish, unpublish, delete) |
|-------|------|-----------------------------------------------------------|
| Anonymous | published only (and blocked from the back-office by the Phase 6 gate) | **none** |
| Reader | published only | **none** |
| Contributor / Reviewer / Approver / Admin | all (drafts + published) | **allowed** |

## Invariants

- **Server-side enforcement**: the same `access` functions guard the admin UI and the REST/GraphQL API — a
  bypassed UI control cannot author/publish or read a draft (FR-007, US3).
- **Native content**: `events` has no `artifactId`, no Git source, and no relationship to any collection
  (Principles I/II/III; research §1/§7).
- **Publish is a status flip**: publishing/unpublishing is setting `status`; no separate workflow or
  approval (Events is outside Registry governance).
- **Date validity**: an event with `endDateTime < startDateTime` cannot be saved (FR-011).

## Observable outcomes (map to FR-001/002/003/006/007/011/013)

| Situation | Expected |
|-----------|----------|
| Contributor+ creates an event in `/cms` | Saved; `slug` auto-derived from title; saves as **draft** by default |
| Contributor+ sets status = published | Visible to employees on next request (in the list if still upcoming) |
| Contributor+ saves an event with end before start | Rejected with a friendly validation error (FR-011) |
| Reader/anonymous attempts create/update/publish/delete | Refused server-side |
| Reader reads the events list/detail via API | Only published events returned |
| Two events with the same title | Second slug collides → friendly uniqueness error (editor adjusts) |
