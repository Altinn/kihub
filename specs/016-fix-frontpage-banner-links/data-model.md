# Data Model: Projects

## Entity: Project (Payload collection `projects`)

Represents one AI project underway in BOD, shown to employees on `/prosjekter`. Native platform
content (Constitution Principle II) — no Git source, no relationship to `Artifact`.

| Field     | Type                              | Required | Notes |
|-----------|-----------------------------------|----------|-------|
| `title`   | text                              | yes      | Display title, list + detail. |
| `slug`    | text, unique, indexed             | no       | URL handle (`/prosjekter/<slug>`); auto-derived from `title` via `beforeValidate` when left blank (same hook pattern as `News.ts`/`slugify`). Explicit values are preserved so a later title edit doesn't move the URL. |
| `summary` | textarea                          | no       | Short preview shown on the `/prosjekter` list. |
| `body`    | richText (lexical)                | yes      | Full description shown on the detail page. |
| `status`  | select: `draft` \| `published`    | yes, default `draft` | Governs employee visibility (FR-006/007). |
| `order`   | number, default `100`             | no       | Manual display order on the list page, ascending (Learning-collection pattern). |

Standard Payload timestamps (`updatedAt`, `createdAt`) apply automatically; no custom fields needed
for them.

### Validation rules

- `slug` uniqueness is enforced at the database level (`unique: true`), matching `News.slug`.
- `status` defaults to `draft`; only `published` entries are ever returned to non-editors (FR-007).

### State transitions

`draft → published` and `published → draft`, both editor-initiated in the CMS at any time — no
workflow/approval gate (unlike Registry governance), matching News's authoring model.

### Access control

- `read`: editors (Contributor+, same `isEditor` check as `News.ts`) see all statuses in the
  back-office/API; everyone else is constrained to `{ status: { equals: 'published' } }` —
  defense in depth alongside the read-layer's own filter (FR-007, FR-009).
- `create` / `update` / `delete`: editors (Contributor+) only.

### Relationships

None. A Project has no relationship to `Artifact`, `Users` (no author field — not required by the
spec), or any other collection. This keeps the model intentionally minimal (Constitution Principle
VII).

## Frontpage content (existing entities, edited by this feature)

- `apps/web/src/lib/site-content-defaults.ts` — `DEFAULT_FRONTPAGE.tiles[1].href`:
  `/registry` → `/prosjekter`.
- `apps/web/src/globals/Frontpage.ts` — the `tiles` field's `defaultValue` (imported from the
  constant above) picks up the same change automatically; no separate edit needed there beyond
  confirming it still imports `DEFAULT_FRONTPAGE.tiles`.
