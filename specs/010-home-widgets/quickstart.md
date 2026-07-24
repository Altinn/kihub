# Quickstart: Home-Page Widgets — Validation Guide

End-to-end checks that prove the feature works. Assumes the Phase 1–8 dev setup (local Postgres
`kihub-postgres` on 55432, `AUTH_MODE=mock`).

## Prerequisites

- Local Postgres running (docker `kihub-postgres`).
- From `apps/web`, env sourced for tests/integration:
  ```bash
  set -a; . ./.env; set +a
  ```
  (the `.env:21 tenant-id` sourcing warning is harmless.)

## 1. Automated gates (must all pass)

```bash
# from apps/web
NODE_OPTIONS=--no-deprecation npx vitest run          # full suite: baseline 97/97 + new home-select unit tests, never regresses
npx tsc --noEmit                                      # from apps/web — clean
pnpm -r lint                                          # clean
```

- **New**: `tests/unit/home-select.test.ts` covers `takeTopN` and `selectRecommendedArtifacts`
  (written failing-first).
- **Unchanged & still green**: `news-access`, `events-access` (visibility invariant),
  `catalog-filters`, `search`, `route-protection` (route-agnostic — the catalog move does not touch
  them).

## 2. Seed content (for browser validation)

Author in `/cms` as a Contributor+ persona, or use a throwaway `apps/web/scripts/*.tsx` Payload
local-API script (delete it + the seed data afterwards — the pattern used to verify Phase 8):
- ≥ 4 **published** news articles (mark one `featured`) + ≥ 1 **draft** article.
- ≥ 4 **published upcoming** events (mark one `featured`) + ≥ 1 **draft** and ≥ 1 **past** event.
- Catalog seeded (`pnpm --filter web index` against a local `ai-artifacts` checkout); in `/cms` mark
  ≥ 1 catalog entry `featured` and/or `recommended`, leave others plain.

## 3. Browser validation

```
preview_start name "kihub-web"   # port 3000
```
Sign in at `/signin` as **Ada Employee (reader)** — the lowest-privilege employee — and verify:

### Dashboard (`/`)
- [ ] `/` shows a **dashboard**, not the catalog. Three widgets: **News**, **Events**, **Registry**.
- [ ] News widget: up to **3** published articles, the `featured` one surfaced first; drafts absent.
- [ ] Events widget: up to **3** published **upcoming** events, `featured` surfaced; draft & past absent.
- [ ] Registry widget: up to **3** artifacts that are `featured`/`recommended`; plain artifacts absent.
- [ ] Each widget's **"View all →"** goes to `/news`, `/events`, `/registry` respectively.
- [ ] Pure Designsystemet; consistent with the rest of the app.

### Empty states (temporarily unpublish/clear, or a fresh DB)
- [ ] With no published news → news widget shows a friendly empty state (not an error/blank).
- [ ] With no upcoming events → events widget shows a friendly empty state.
- [ ] With no featured/recommended artifacts → Registry widget shows a friendly empty state.
- [ ] All three empty at once → page still renders cleanly.

### Registry route (`/registry`)
- [ ] `/registry` shows the catalog browse (filters, counts, governance badges) exactly as `/` used to.
- [ ] Full-text search works via the search box (`/registry?q=…`); filters compose; results identical
      to prior behavior.
- [ ] Reachable from the header **Registry** nav link.

### Consistent navigation (FR-012 / US3)
- [ ] Header nav (Registry · News · Events) is present and consistent on `/`, `/registry`, `/news`,
      `/events`, and an artifact detail page.
- [ ] "← Back to catalog" on `/news`, `/events`, and an artifact detail page lands on `/registry`.

### Access
- [ ] Signed out → visiting `/` redirects to `/signin` (unchanged gate).
- [ ] Ada (reader) sees the full dashboard — no role beyond an employee session is required.

## 4. Scope / non-regression assertions (SC-006)

- [ ] `git status` shows **no** `migrations/` file and **no** change under `payload.config.ts`
      collections / `payload-types.ts` (no schema delta).
- [ ] `package.json` diffs show **no** new dependency.
- [ ] Changes are confined to the employee-app landing + navigation surface (dashboard page, moved
      `/registry` page, `PortalHeader`, `HomeWidget`, `lib/home*.ts`, and the six `/`→`/registry`
      link/prop retargets). If anything else changed (a collection, access rule, News/Events/Registry
      internals, governance, shared package) — **stop and flag it**.
