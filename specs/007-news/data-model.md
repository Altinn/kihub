# Phase 7 Data Model

Phase 7 adds **one** new collection, `news`, and no changes to any existing collection. News is native
Payload-owned content (Principle II): no Git source, not an artifact, no `artifactId`. Its only
relationship is `author → users`.

## New collection: `news`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | text | yes | Article headline; source for the slug. |
| `slug` | text | yes (auto) | Unique, indexed, URL-safe. Derived from `title` by a `beforeValidate` hook when empty; editable. The public handle in `/news/<slug>` (FR-005/013). |
| `summary` | textarea | no | Short plain-text preview shown in the list (US1). |
| `body` | richText (lexical) | yes | Article content; rendered on the detail page via `@payloadcms/richtext-lexical/react`. |
| `author` | relationship → `users` | yes (auto) | Defaults to the creating user (`beforeChange`); editable by an editor. Employee byline shows the user's name (FR-011). |
| `status` | select `draft` \| `published` | yes | Defaults to `draft`. Only `published` is visible to employees (FR-003/006). |
| `publishDate` | date | no | Defaults to the moment of first publish; drives newest-first ordering. Editable. |
| `tags` | array/hasMany text | no | Free-form labels (no formal taxonomy this phase). |
| `heroImageUrl` | text (URL) | no | Optional hero image by URL; managed uploads/Azure Blob deferred (research §6). |
| `featured` | checkbox | no | Surfaced in the list (US1); defaults false. |

Indexes: `slug` (unique); a composite/index on `(status, publishDate)` supports the published newest-first
list query.

## Access matrix (`news`)

| Action | Rule | Effect |
|--------|------|--------|
| `read` | Contributor+ → `true`; otherwise → `{ status: { equals: 'published' } }` | Editors see drafts + published (back-office/API); Readers/anonymous see only published — API-path defense in depth for US3. |
| `create` | Contributor+ (`role !== 'reader'`) | Only editors author; Reader/anonymous refused (FR-002/007). |
| `update` | Contributor+ | Only editors edit/publish/unpublish. |
| `delete` | Contributor+ | Only editors delete. |

Server-side enforced by Payload for both the admin UI and the REST/GraphQL API. Employees additionally
only ever reach news through `lib/news.ts`, which always filters `status: published` (correct by
construction). News uses the Phase 6 Contributor+ back-office entry gate; these per-action rules are the
authoritative guard behind it.

## Lifecycle / state

- `draft → published`: an editor sets `status = published` (sets `publishDate` if empty). Immediately
  visible to employees on the next request (FR-010).
- `published → draft` (unpublish): the article disappears from all employee surfaces and its `/news/<slug>`
  detail is no longer accessible (US3).
- No AI-governance lifecycle, typed reviews, or approval matrix apply — News is outside the Registry
  governance model by design (Principle VI is Registry-scoped; clarified).

## Validation rules

- `slug` MUST be unique across all articles (DB `unique` + a friendly collision message).
- `title`, `body`, `status` are required; `author` and `slug` are auto-populated but required after
  create.
- A `published` article MUST have a `publishDate` (defaulted on publish) — ordering depends on it.

## Reused / unchanged entities

- **Users** — reused only as the target of `author`; no change.
- **Auth.js → Payload bridge** (`auth/payload-strategy.ts`, Phase 1) — reused unchanged; it authenticates
  both the employee read paths (via `requireSession`) and the back-office authoring.
- **Role model** (`@kihub/governance-core`) — the `Role` type is reused for the access predicate; the
  permission matrix / lifecycle FSM are **not** extended (research §3).
- All Registry collections (`artifacts`, `catalog-entries`, `reviews`, `audit-log`, `discovery-*`) —
  untouched; News has no relationship to them.

## Configuration (not data)

- Register `News` in `payload.config.ts` `collections` (the only config change).
- Dev: Payload schema push creates the `news` table; a migration is generated for prod parity, and
  `payload-types.ts` is regenerated. Admin import map unaffected (no custom admin components).
