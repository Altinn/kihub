# Phase 1 Data Model: News Page Redesign (013)

**No schema change. No migration.** This feature reads the existing `news` collection and adds one
derived, in-memory view model. The section below records the shape it reads and the shape it derives,
so the contracts and tasks have one reference.

---

## 1. `news` collection (existing — unchanged)

Source of truth: `apps/web/src/collections/News.ts` (Phase 7, unmodified by 013).

| Field | Type | Used by 013 | Notes |
|---|---|---|---|
| `title` | text, required | list card, detail | The headline (display typeface) |
| `slug` | text, unique, indexed | list card link, detail route | Auto-derived from `title` in `beforeValidate` when blank |
| `summary` | textarea, optional | list card | Omitted from the card when absent (FR-002, US1-6) |
| `body` | richText, required | detail only | Rendered with `RichText`; never on the list |
| `author` | relationship → `users` | detail byline | Falls back to "KI Hub" when unset |
| `status` | select `draft \| published`, required | every read | All 013 reads filter `published` (FR-012) |
| `publishDate` | date, optional | ordering + date line | **Stamped automatically** on first publish by `beforeChange`; see §4 |
| `tags` | text, hasMany | detail only | **Dropped from list cards** (FR-002, Assumptions) |
| `heroImageUrl` | text, optional | list card media, detail | Arbitrary editor-provided external URL; no managed upload |
| `featured` | checkbox, default false | **nothing, after 013** | Field retained; see §5 |

**Access rules (unchanged)**: `read` returns everything for Contributor+ and
`{ status: { equals: 'published' } }` for everyone else; `create`/`update`/`delete` are
Contributor+. 013 adds no field-level access rules.

---

## 2. Derived entity: `NewsPagination` (new, in-memory only)

The spec's "News list page state" (a page position) materialises as one plain object built by
`lib/news-view.ts` from three numbers. It is never persisted.

```
NewsPagination
  page          number   the page actually rendered (1-based, already clamped)
  totalPages    number   0 when the archive is empty
  totalDocs     number   published articles in the whole archive
  hasPrev       boolean  page > 1
  hasNext       boolean  page < totalPages
  prevHref      string?  present only when hasPrev
  nextHref      string?  present only when hasNext
  label         string   "Side X av Y"
  visible       boolean  totalPages > 1 — the whole control bar is omitted when false (FR-009)
```

**Invariants**
- `1 <= page <= max(totalPages, 1)` — enforced by the read layer's clamp, never by the component.
- `visible === false` ⟹ the pagination bar renders nothing at all (not a disabled bar) — FR-009.
- `hasPrev === false` on page 1 and `hasNext === false` on the last page ⟹ that control renders as
  non-actionable text, not as a link (FR-008).
- `prevHref` for page 2 is the bare `/news` (no `?page=1`), so the canonical first-page address has
  no query string.

---

## 3. Page-size constant

`NEWS_PAGE_SIZE = 12` — declared once in `lib/news-view.ts` and imported by the read layer and the
tests. Chosen as six desktop rows of two (Assumptions). Changing this single value is the entire
knob; nothing else encodes the number.

---

## 4. Ordering contract

**Primary**: `publishDate` descending. **Tiebreaker**: `createdAt` descending, appended
automatically by the data layer's sort builder (research §4) — this is what makes offset pagination
safe (no article skipped or repeated at a page boundary, SC-001).

`publishDate` is effectively non-null for every article this surface can see: the collection's
`beforeChange` hook sets it to `now` whenever an article is saved with `status: 'published'` and no
date. A NULL is therefore reachable only by writing to the database directly, in which case Postgres
`DESC` places the row first. The article stays visible and reachable either way, which is the
guarantee FR-005 makes (research §4 explains why a stricter guarantee is not available without raw
SQL).

---

## 5. `featured` after this feature

The flag becomes **inert for news** and is deliberately retained.

- Before 013: `listPublishedNews()` applied a stable `featured`-first sort, and the old list card
  showed a "Featured" chip. Those were the only two readers.
- The frontpage never honoured it — `selectLatestNews` re-sorts strictly by date so that "a
  featured-but-older article must not outrank a newer one" (011 FR-008).
- After 013: the boost is removed from `listPublishedNews()` (research §9) and the chip is gone with
  the old card. The field stays in the collection because dropping a column is a destructive
  migration and because a future featured-hero treatment — explicitly excluded from this feature's
  scope — is exactly what would read it.

---

## 6. What this feature does **not** touch

- No new fields, no field removals, no migration, no `payload-types.ts` regeneration.
- No change to `News` access rules, hooks, or slug derivation.
- No change to article addresses (`/news/<slug>`), so existing links keep resolving (FR-017).
- No change to the `events`, `catalog-entries`, or any other collection.
