# Quickstart: News (validation guide)

Proves Phase 7 end-to-end: Contributor+ editors author and publish news in `/cms`, all employees read
published news at `/news` and `/news/<slug>`, and drafts never leak. Assumes Phases 1–6 running locally
(`AUTH_MODE=mock`) against the local Postgres.

## Prerequisites

- `apps/web` dev server running against local Postgres (Phases 1–6 setup).
- The `news` collection registered; dev schema push has created the `news` table (start the dev server, or
  run a migration). **No new datastore, env, or external service.**

## Scenario 1 — Author & publish in the back-office (US2, FR-001/002/013)

1. Sign in via `/signin` as **Aria Admin** (or any Contributor+ persona); open `http://localhost:3000/cms`.
2. Open the **News** collection → **Create New**. Enter a title, write a rich-text body, add a summary,
   (optionally) tags / hero image URL / featured. Leave slug blank.
3. **Expect**: on save, `slug` is auto-derived from the title and `author` defaults to you; the record
   saves as **draft**.
4. Set **status = published**, Save.
5. **Expect**: `publishDate` is set; the article is now published.

## Scenario 2 — Employees read the feed (US1, FR-004/005/011/012)

1. As any employee (including **Ada Employee (Reader)**), open `http://localhost:3000/news`.
2. **Expect**: the published article appears in the list (newest-first; featured surfaced), with title,
   summary, and publish date.
3. Click it (or open `/news/<slug>`).
4. **Expect**: the detail page shows title, byline (author's name), publish date, and the rendered
   rich-text body (plus hero image / tags if set).
5. With no articles published, open `/news`.
6. **Expect**: a friendly empty state, not an error.

## Scenario 3 — Drafts never leak (US3, FR-003/006, SC-002)

1. As an editor in `/cms`, create an article and leave it **draft** (note its slug).
2. As **Ada Employee (Reader)**, open `/news`.
3. **Expect**: the draft is absent from the list.
4. Request the draft's `/news/<slug>` directly.
5. **Expect**: not found (`notFound()`), no draft content exposed.
6. As the editor, set a published article back to **draft**; as the employee, reload `/news`.
7. **Expect**: the article is gone and its detail URL now 404s.

## Scenario 4 — Authoring is role-gated (US2, FR-007, SC-004)

1. As **Ada Employee (Reader)**, attempt to reach the News authoring in `/cms`.
2. **Expect**: refused by the Phase 6 back-office entry gate (Reader has no admin access).
3. (API path) A create/update against the News REST endpoint as a Reader is refused server-side.

## Automated checks

- Integration: `news-access.test.ts` — Contributor+ can create/update/publish/delete; Reader/anonymous are
  refused; an employee-scoped read returns only `published` articles (draft excluded, including by slug).
- Unit: `news-slug.test.ts` — slug is derived from the title (URL-safe) and uniqueness is enforced.
- Regression: the existing suites (`route-protection`, `governance-access`, `discovery-*`, `search`,
  `admin-*`) remain green — News is additive and does not touch them.

## Boundary & infra (Principles II/VII/VIII)

- News is native Payload-owned content — no Git source, not an artifact; no Registry collection is touched.
- No new datastore/service/dependency; the employee UI is Designsystemet, the back-office is Payload's own
  admin (exempt). Managed image uploads (Azure Blob) and scheduled publishing are deferred.
