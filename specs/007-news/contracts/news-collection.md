# Contract: the `news` collection (authoring + access)

Defines the native News collection authored in the `/cms` back-office. Lives in
`apps/web/src/collections/News.ts` and is registered in `apps/web/src/payload.config.ts`. No custom admin
UI (Principle VIII — Payload's own admin renders it).

## Collection shape

```ts
// collections/News.ts (shape — not full implementation)
export const News: CollectionConfig = {
  slug: 'news',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'publishDate', 'featured', 'author'] },
  access: {
    read:   ({ req }) => isEditor(req.user) ? true : { status: { equals: 'published' } },
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    beforeValidate: [ /* derive `slug` from `title` when empty; slugify + ensure URL-safe */ ],
    beforeChange:   [ /* default `author` to req.user on create; set `publishDate` on first publish */ ],
  },
  fields: [ /* title, slug (unique), summary, body (richText), author (rel→users),
              status (select draft|published), publishDate (date), tags (hasMany text),
              heroImageUrl (text), featured (checkbox) — see data-model.md */ ],
};

// isEditor: signed-in Contributor+ — role !== 'reader' (matches the Phase 6 admin gate)
```

- `isEditor(user)` = `Boolean(user) && (user.role as Role) !== 'reader'`. News is NOT wired into the
  governance-core permission matrix (research §3).
- `read` returns a `Where` for non-editors so the REST/GraphQL API (mounted at `/payload-api`) never
  exposes drafts to a Reader (defense in depth for US3).
- `slug` is `unique: true` + indexed; a collision surfaces a friendly validation error.

## Access & visibility matrix

| Actor | read | create/update/delete (author, publish, unpublish, delete) |
|-------|------|-----------------------------------------------------------|
| Anonymous | published only (and blocked from the back-office by the Phase 6 gate) | **none** |
| Reader | published only | **none** |
| Contributor / Reviewer / Approver / Admin | all (drafts + published) | **allowed** |

## Invariants

- **Server-side enforcement**: the same `access` functions guard the admin UI and the REST/GraphQL API — a
  bypassed UI control cannot author/publish or read a draft (FR-007, US3).
- **Native content**: `news` has no `artifactId`, no Git source, and no relationship to Registry
  collections; its only relationship is `author → users` (Principles I/II/III).
- **Publish is a status flip**: publishing/unpublishing is setting `status`; no separate workflow or
  approval (News is outside Registry governance).

## Observable outcomes (map to FR-001/002/003/006/007/011/013)

| Situation | Expected |
|-----------|----------|
| Contributor+ creates an article in `/cms` | Saved; `slug` auto-derived from title; `author` defaults to them |
| Contributor+ sets status = published | Visible to employees on next request; `publishDate` set if empty |
| Reader/anonymous attempts create/update/publish | Refused server-side |
| Reader reads the news list/detail via API | Only published articles returned |
| Two articles with the same title | Second slug collides → friendly uniqueness error (editor adjusts) |
