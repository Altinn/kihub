# Quickstart / Validation: 027 Drafts with Preview + Pages

Validation guide only — implementation lives in `tasks.md`. Contracts:
[content-drafts](./contracts/content-drafts.md), [preview-route](./contracts/preview-route.md),
[pages](./contracts/pages.md).

## 0. Prerequisites

```bash
colima start && docker compose up -d   # kihub-postgres on :55432
```

```bash
cd apps/web && set -a && source .env && set +a
```

- Use a per-branch DB clone (`kihub_027`) — this feature DROPS the `status` columns, which makes
  push-mode prompt and hang the suite on the shared `kihub` DB (017/020 gotcha, research R2).
- `AUTH_MODE=mock` locally; personas: a **reader** and a **contributor** (e.g. «Ada Employee»).

## 1. Migration on a scratch DB (SC-003)

1. Restore a copy of real-shaped data into `kihub_migtest_027` (published + draft items in all four
   collections; a news item with tags + hero image; a learning page with a subcategory).
2. Record per collection: total count, published count, and the `(slug, title)` set.
3. `pnpm --filter web migrate` → re-run the same queries against `_status`: **identical**.
4. `select count(*) from _news_v where latest` = `select count(*) from news` (and likewise for the
   other three) — the version backfill (R2 step 3).
5. `migrate:down` → `status` restored, counts identical; `migrate` again → clean.

## 2. Automated suite

```bash
pnpm --filter web test && pnpm --filter web lint && pnpm --filter web exec tsc --noEmit
```

Expect new/updated tests to pass: content-drafts A1–A9 per collection, `preview-paths` +
`isSafeInternalPath` unit tables, `page-slug` (validation table + route-tree drift test), route
"no static caching" grep test, `getPreviewState` (reader-with-cookie → inactive). Then `next build`
against the migrated scratch DB with `AUTH_MODE=entra` (the only gate that catches some type errors).

## 3. Browser walkthrough (dev server, mock auth)

**US1 – preview a new draft**
1. Contributor: `/cms` → Nyheter → new article, title «Test 027», body text → *Lagre utkast*.
2. Click **Forhåndsvis** → `/news/test-027` renders with the article layout + the yellow
   «Forhåndsvisning» banner.
3. Reader (other browser profile): `/news/test-027` → 404; `/` and `/news` don't list it;
   `/api/preview?path=/news/test-027` → still 404, no banner.
4. Contributor: *Avslutt forhåndsvisning* → banner gone, `/news/test-027` → 404.

**US2 – edit published content**
1. Publish «Test 027». Reader sees it.
2. Contributor edits the title to «Test 027 v2» → *Lagre utkast* (or wait for autosave).
3. Reader: still «Test 027» on detail page, `/news` and frontpage «Siste nytt».
4. Contributor preview: «Test 027 v2». Publish → reader sees v2.
5. Change slug in a draft to `test-027-ny`; reader keeps `/news/test-027`; preview opens `/news/test-027-ny`.
6. *Avpubliser* → reader 404; document still in `/cms` as draft.

**Pre-existing content** — preview an item created **before** the migration → renders (R2 backfill).

**US3 – pages**
1. `/cms` → Sider → new page «Om KI Hub», body with heading, image, code block and YouTube block → preview `/om-ki-hub` → publish.
2. Reader: `/om-ki-hub` renders in portal layout, tab title «Om KI Hub · KI Hub».
3. Try addresses `news`, `/Laering/`, `om/kontakt` → Norwegian validation errors; a second page with `om-ki-hub` → uniqueness error.
4. `/news`, `/laering`, `/prosjekter`, `/events`, `/registry`, `/bidra` still render their built-in sections.
5. Site Chrome → footer link `{ «Om KI Hub», /om-ki-hub }` → link works; unpublish page → link shows 404.

**US4 – history** — three saves → *Versjoner* tab → compare v1 vs current → restore v1.

**US5 – autosave** — type, wait ~3 s, reload `/cms` → text kept; published version unchanged for reader.

**US6 – scheduling** (dev: `PAYLOAD_JOBS_AUTORUN=true`) — schedule publish 2 minutes ahead → reader
404 before, visible ≤ 1–2 min after. Cancel a second schedule → nothing happens. Restart the dev server
after a due time passes → boot run publishes it.

**Role loss** — contributor in preview; admin downgrades them to reader → next navigation: banner
gone, draft 404s.

## 4. After deploy (prod)

- Container boot log: migration `*_drafts_pages` applied; app healthy.
- Spot-check three existing published items per collection still visible to a reader; one draft still hidden.
- Editors' release note: «Status»-feltet er erstattet av *Lagre utkast / Publiser*; bruk *Forhåndsvis*;
  planlagt publisering skjer innen ett minutt når nettstedet er i bruk (scale-to-zero, research R8).
