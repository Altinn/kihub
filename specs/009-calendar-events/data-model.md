# Phase 8 Data Model

Phase 8 adds **one** new collection, `events`, and no changes to any existing collection. Events is native
Payload-owned content (Principle II): no Git source, not an artifact, no `artifactId`, and no relationship
to any Registry collection. Unlike News it has **no relationship at all** (`organizer` is free-text — see
research §7).

## New collection: `events`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | text | yes | Event name; source for the slug. |
| `slug` | text | yes (auto) | Unique, indexed, URL-safe. Derived from `title` by a `beforeValidate` hook (reusing `lib/slug.ts`) when empty; editable. The public handle in `/events/<slug>` (FR-005/013). |
| `description` | richText (lexical) | yes | Event details; rendered on the detail page via `@payloadcms/richtext-lexical/react`. |
| `startDateTime` | date (date+time) | yes | When the event starts. Drives ordering and the upcoming filter (FR-004/011). Interpreted/displayed in Europe/Oslo (FR-015). |
| `endDateTime` | date (date+time) | no | When it ends. When present MUST be ≥ `startDateTime` (FR-011, validated). |
| `location` | text | no | Free-text place (e.g. "Room A3, Oslo"). Optional (research §6). |
| `onlineUrl` | text (URL) | no | Optional online-meeting link; rendered as a link on the detail page (research §6). |
| `organizer` | text | no | Free-text attribution of who runs the event (person, team/unit, or external). Shown on the detail page (research §7). |
| `status` | select `draft` \| `published` | yes | Defaults to `draft`. Only `published` is visible to employees (FR-003/006). |
| `tags` | hasMany text | no | Free-form labels (no formal taxonomy this phase). |
| `featured` | checkbox | no | Surfaced in the list (US1); defaults false. |

Indexes: `slug` (unique); an index on `(status, startDateTime)` supports the published + upcoming +
soonest-first list query.

Note vs News: there is **no** `summary` field (research §8 — the card is when/where-led) and **no**
`author`/`users` relationship (research §7 — organizer is free-text). There is no `publishDate` — events
order by `startDateTime`, not by publish time.

## Access matrix (`events`)

| Action | Rule | Effect |
|--------|------|--------|
| `read` | Contributor+ → `true`; otherwise → `{ status: { equals: 'published' } }` | Editors see drafts + published (back-office/API); Readers/anonymous see only published — API-path defense in depth for US3. |
| `create` | `isEditor` (Contributor+, `role !== 'reader'`) | Only editors author; Reader/anonymous refused (FR-002/007). |
| `update` | `isEditor` (Contributor+) | Only editors edit/publish/unpublish. |
| `delete` | `isEditor` (Contributor+) | Only editors delete. |

`isEditor(user)` = `Boolean(user) && (user.role as Role) !== 'reader'` — identical to `collections/News.ts`.
Server-side enforced by Payload for both the admin UI and the REST/GraphQL API. Employees additionally only
ever reach events through `lib/events.ts`, which always filters `status: published` (and, for the list,
upcoming) — correct by construction. Events uses the Phase 6 Contributor+ back-office entry gate; these
per-action rules are the authoritative guard behind it.

## Lifecycle / state

- `draft → published`: an editor sets `status = published`. Immediately visible to employees on the next
  request (FR-010), appearing in the list if still upcoming.
- `published → draft` (unpublish): the event disappears from all employee surfaces and its `/events/<slug>`
  detail is no longer accessible (US3).
- No AI-governance lifecycle, typed reviews, or approval matrix apply — Events is outside the Registry
  governance model by design (Principle VI is Registry-scoped; clarified).

## Validation rules (pure logic in `lib/event-dates.ts`, enforced in the collection)

- `slug` MUST be unique across all events (DB `unique` + a friendly collision message).
- `title`, `description`, `startDateTime`, `status` are required; `slug` is auto-populated but required
  after create.
- **`validateEventInterval(start, end)`**: when `end` is present, `end` MUST be ≥ `start`; otherwise the
  `beforeValidate` hook throws a friendly error (FR-011). All-day events are out of scope (every event has
  a specific start time).

## Derived read logic (pure logic in `lib/event-dates.ts`)

- **`isUpcoming(event, now)`**: `true` when `(endDateTime ?? startDateTime) ≥ now` — an in-progress event
  (started, not yet ended) still counts as upcoming; only fully-past events are excluded from the list
  (FR-004). The list read query encodes the equivalent `where`; `isUpcoming` is the unit-tested source of
  truth for the boundary.
- **`formatEventWhen(start, end)`**: renders the start (and end, if set) in `nb-NO` / `Europe/Oslo`
  (FR-015) for display on the card and detail page.

## Reused / unchanged entities

- **Auth.js → Payload bridge** (`auth/payload-strategy.ts`, Phase 1) — reused unchanged; authenticates both
  the employee read paths (via `requireSession`) and back-office authoring.
- **Role model** (`@kihub/governance-core`) — the `Role` type is reused for the `isEditor` predicate; the
  permission matrix / lifecycle FSM are **not** extended (research §3).
- **`lib/slug.ts`** (Phase 7) — `slugify` reused unchanged for the event slug.
- All Registry collections (`artifacts`, `catalog-entries`, `reviews`, `audit-log`, `discovery-*`), the
  `users` collection, and the `news` collection — untouched; Events has no relationship to any of them.

## Configuration (not data)

- Register `Event` in `payload.config.ts` `collections` (the only config change).
- Dev: Payload schema push creates the `events` table; regenerate `payload-types.ts` with
  `pnpm --filter web payload generate:types`. **No migration** (push-only repo; research §10). Admin import
  map unaffected (no custom admin components).
