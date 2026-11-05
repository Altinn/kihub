# Data Model: Editorial Drafts with Preview, and CMS-Managed Pages (027)

Payload collection shapes are contracts (constitution, Development Workflow). Decisions referenced as
R# are in [research.md](./research.md).

## 1. Draft-enabled content collections (changed)

Applies to `news`, `learning-pages`, `projects`, `events`, and the new `pages`.

| Change | Before | After |
|---|---|---|
| Visibility field | `status: select('draft' \| 'published')`, required, default `draft` | **removed** |
| Payload status | — | `_status: 'draft' \| 'published'` (added by `versions.drafts`), default `draft` |
| Versions | none | `versions: { maxPerDoc: 50, drafts: { autosave: { interval: 2000 }, schedulePublish: { timeFormat: 'HH:mm', timeIntervals: 15 } } }` (R1) |
| Access | `read`, `create`, `update`, `delete` | + `readVersions: isEditor` (R10); `read` filter uses `_status` |
| Admin | `defaultColumns: [..., 'status', ...]` | `'_status'`; `admin.preview` → `/api/preview?path=…` (R4) |
| Required fields | NOT NULL columns | nullable in DB (drafts may be partial); enforced on publish (R1) |

### State transitions (per document)

```text
            create (save draft / autosave)
   ∅ ───────────────────────────────────────▶ DRAFT-ONLY            main row: _status=draft
                                                │  publish (manual or scheduled)
                                                ▼
                                            PUBLISHED               main row: _status=published
                                              │   ▲                  (readers see main row)
             save draft / autosave            │   │ publish
                                              ▼   │
                                  PUBLISHED + PENDING DRAFT          main row unchanged;
                                              │                      versions: latest=draft
             unpublish (from either published state)
                                              ▼
                                          DRAFT-ONLY                 main row: _status=draft
   restore version N  → creates a new latest version with N's content (draft, or published if chosen)
   delete             → removes the main row and all versions (and pending scheduled jobs)
```

Visible to readers ⇔ main row `_status = 'published'`. Visible in preview ⇔ `latest` version
(any status), only on that item's detail page, only for an active preview (R3/R5).

### Collection-specific notes

- **news**: `beforeChange` stamps `publishDate` when `_status === 'published'` and it is empty (R9).
  `tags` (hasMany text) → versioned child table `_news_v_texts`. `heroImage` FK remains ON DELETE SET
  NULL in both main and version tables.
- **learning-pages**: subcategory-belongs-to-category hook unchanged (runs on draft saves too).
  `body` editor moves to the shared `articleEditor` (R11) — config-identical, no data change.
- **projects**, **events**: no other changes. `.ics` reads published only.

## 2. `pages` (new)

| Field | Type | Rules |
|---|---|---|
| `title` | text | required; non-blank (Project precedent) — label «Tittel» |
| `slug` | text | unique, indexed; derived from `title` when blank (`slugify`); `validatePageSlug` — single segment `^[a-z0-9]+(?:-[a-z0-9]+)*$`, not in `RESERVED_PAGE_SLUGS` (R12) — label «Adresse», description «Sidens adresse: /<adresse>. …» |
| `summary` | textarea | optional — «Ingress» |
| `body` | richText | required on publish; `articleEditor` (h2–h4, bold/italic/inline code, lists, links, quote, hr, media upload with `decorative`, Code block, YouTube block) |
| `author` | relationship → users | sidebar; defaults to creator on create |
| `_status`, versions | — | as §1 |

Access: identical to §1. Labels: `{ singular: 'Side', plural: 'Sider' }`. Public address `/<slug>`.

Not modelled (deliberate, R11): parent/child hierarchy, SEO meta fields, layout blocks, nav placement
(navigation stays in the `site-chrome` global's `nav` / `footer.links` arrays, which already take any
`href`).

## 3. `payload-jobs` (new, Payload-managed)

Created because `schedulePublish` is enabled (R8). One row per scheduled publish/unpublish:
`taskSlug: 'schedulePublish'`, `input: { type, doc: { relationTo, value }, user, timezone }`,
`waitUntil`, `queue: 'default'`, processing/completed/error state. Hidden in the admin; read/run/
queue/cancel restricted to editors. Rows are deleted on completion (Payload default).

## 4. Reserved address list (code, not data)

`lib/page-slug.ts` → `RESERVED_PAGE_SLUGS` (R12). Kept in sync with the app's route tree by a unit test
that scans `src/app/**` top-level segments and `public/`.

## 5. Preview session (cookie state, not data)

| Element | Value |
|---|---|
| Cookie | Next's `__prerender_bypass`, re-issued with `maxAge: 3600`, `httpOnly`, `secure`, `sameSite=lax` |
| Effective only when | cookie present **and** a fresh lookup of the signed-in user's role is contributor+ (R5) |
| Ends | `/api/preview/exit`, cookie expiry (60 min), browser session end, or role loss (next request) |

## 6. Migration `<timestamp>_drafts_pages` (R2)

`up`: create `_status` + version tables + `pages` (+ `_pages_v`) + `payload_jobs` → copy `status` →
`_status` → seed one `latest` version row per existing document (incl. child tables) → drop `status`
columns. The `enum_<table>_status` types are shared by old `status` and new `_status`, so they stay. `down`: reverse, restoring `status` from `_status`; `IF EXISTS` hand-patch.

Invariant to verify (SC-003): per collection, `count(*)` and `count(*) filter (where published)` and
the set of `(slug, title)` are identical before and after `up`.
