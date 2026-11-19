# Tasks: Agentic-AI guideline deck («Retningslinje for agentisk KI i Digdir»)

**Input**: Design documents from `/specs/029-agentic-guideline-deck/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: INCLUDED. The constitution requires new modules to test access control, and the spec's success
criteria SC-002/SC-003/SC-009 are test-shaped. Tests use the **synthetic fixture deck only** (FR-015).

**Organization**: grouped by user story. US1 and US2 are both P1; US2 (protected delivery) is built first
because the page in US1 has nothing to show without it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md; none for Setup, Foundational and Polish
- All paths are relative to the repo root (`apps/web/...`)

## HARD RULES for every task

- **Never `git add` or commit any real deck file.** The INTERN bundle stays outside the repo (the
  reference copy is in the session scratchpad, `deck183/extract/agentisk-ki-retningslinje-dist-v2.2/`).
  Local dev copies it into the gitignored `apps/web/protected-static/retningslinje/`.
- Do not stage the unrelated working-tree edits (`.claude/launch.json`, specs 024/025 docs,
  `documentation/mcp-content-authoring.md`).
- Nothing is deployed, uploaded to Azure, or switched on in any deployed environment by these tasks.

---

## Phase 1: Setup

- [ ] T001 Add `apps/web/protected-static/` to `.gitignore` (repo root) and verify with `git check-ignore -v apps/web/protected-static/retningslinje/index.html`
- [ ] T002 Add `@azure/storage-blob` at the exact version `12.34.0` as a direct dependency and `axe-core` as a devDependency in `apps/web/package.json` (`pnpm --filter web add --save-exact @azure/storage-blob@12.34.0` and `pnpm --filter web add -D axe-core`); confirm `pnpm-lock.yaml` gains no second `@azure/storage-blob` version
- [ ] T003 [P] Document the new variables in `apps/web/.env.example` next to the `MEDIA_STORAGE_MODE` block: `GUIDELINE_DECK_ENABLED` (default unset = off), `GUIDELINE_DECK_CONTAINER` (azure mode, e.g. `kihub-protected`), `GUIDELINE_DECK_DIR` (optional disk override); comment that the deck is INTERN and must never be committed
- [ ] T004 [P] Create the synthetic stand-in deck in `apps/web/tests/fixtures/deck/`: `index.html` (links `assets/deck.css`, `assets/deck.js`, uses `assets/fonts/test.woff2`), `assets/deck.css`, `assets/deck.js` (sets the heading from `location.hash` like the real deck), `assets/fonts/test.woff2` (tiny valid-enough binary, ≤1 KB), `README.md` (must NOT be served), and a unique marker string `FIXTURE-DECK-MARKER-7f3a` in `index.html` so tests can assert it never leaks

**Checkpoint**: dependencies resolve, fixture exists, nothing deck-related is tracked.

---

## Phase 2: Foundational (blocks all user stories)

- [ ] T005 Create `apps/web/src/lib/guideline-deck.ts` with the pure parts: `DECK_ENTRY = '/retningslinje/deck/index.html'`, `isGuidelineDeckEnabled(env = process.env)` (exactly `"true"`), `CONTENT_TYPES` whitelist map (html, css, js, woff2, svg, png, jpg, jpeg, webp, gif, json — per contracts/deck-route.md §B; `md` and `map` excluded), `resolveDeckPath(segments)` (1–4 segments, each URL-decoded once and matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`, extension whitelist, returns `{ok:true,key,contentType}|{ok:false}`) and `parseDeckHash(hash)` (accepts only `/^#\d{1,3}(\.\d{1,2})?$/`, else `''`)
- [ ] T006 Extend `apps/web/src/lib/guideline-deck.ts` with the store seam per contracts/deck-route.md §D: `DeckStore {read, exists}`, `diskDeckStore(root)` (asserts `path.resolve(root,key)` starts with `root + path.sep`; streams via `createReadStream` → web `ReadableStream`), `azureDeckStore(cfg)` (`BlobServiceClient.fromConnectionString`, blob key `retningslinje/<key>`, `BlobNotFound`/404 → `null`/`false`, never creates the container), `resolveAzureDeckConfig(env)` (requires `AZURE_STORAGE_CONNECTION_STRING` and `GUIDELINE_DECK_CONTAINER`, throws naming every missing variable, mirroring `lib/media-storage.ts`) and `getDeckStore(env)` selecting by `resolveMediaStorageMode(env)` (disk root = `GUIDELINE_DECK_DIR` or `<cwd>/protected-static/retningslinje`)
- [ ] T007 [P] Add `apps/web/tests/unit/guideline-deck.test.ts`: flag only for `"true"`; `resolveDeckPath` accepts `index.html`, `assets/deck.js`, `assets/fonts/InterVariable.woff2`, `assets/blob.svg` and rejects `..`, `.`, `%2e%2e` (decoded once, then literal `%` fails), `..%2f`, backslash, NUL, empty segment, dotfile, spaces, `README.md`, `x.map`, no extension, 5 segments, bare `assets`; `parseDeckHash` accepts `#1 #53 #70.2 #104`, rejects `# #0x #53;x #1234 #53.123 53`; `resolveAzureDeckConfig` names every missing variable; `diskDeckStore` against `tests/fixtures/deck` reads `index.html`, returns null for missing, and refuses a key that resolves outside the root
- [ ] T008 Reserve the address: add `'retningslinje'` under `// src/app/(app)` in `RESERVED_PAGE_SLUGS` in `apps/web/src/lib/page-slug.ts`; the drift test in `apps/web/tests/unit/page-slug.test.ts` needs no edit but MUST be run after T010 creates the route directory (it fails before the entry exists once the directory is there)

**Checkpoint**: `pnpm --filter web exec vitest run tests/unit/guideline-deck.test.ts` is green.

---

## Phase 3: User Story 2 — Only employees can reach the deck (P1) 🎯 security-first MVP slice

**Goal**: deck files are served only to signed-in employees, only whitelisted files, never when the
feature is off.

**Independent Test**: the access matrix in quickstart.md §2 against the fixture (no browser needed).

- [ ] T009 [US2] Write `apps/web/tests/integration/guideline-deck-route.test.ts` first (it must fail): mock `@/auth` as in `tests/integration/route-protection.test.ts`; set `GUIDELINE_DECK_DIR` to `tests/fixtures/deck` and `MEDIA_STORAGE_MODE=disk`; cases — switch off → 404 with and without session; switch on + no session → 303 `Location: /signin` for entry, `assets/deck.js`, `assets/fonts/test.woff2`; session → 200 with `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, correct `Content-Type`, and the CSP header on HTML only; `README.md`, `..%2f..%2fpackage.json`, `%2e%2e/.env`, `assets/`, unknown extension, 5 segments → 404; no 303/404 body contains `FIXTURE-DECK-MARKER-7f3a`; missing file → 404
- [ ] T010 [US2] Implement `apps/web/src/app/(app)/retningslinje/deck/[...path]/route.ts` (GET only) exactly per contracts/deck-route.md §A–§C: enabled check → `auth()` → `resolveDeckPath` → `getDeckStore().read` → streamed `Response`; the CSP string for `.html`; store errors other than not-found → logged `500`. No `revalidate`/`force-static`
- [ ] T011 [US2] Add the deck route to the no-static-caching list in `apps/web/tests/unit/route-caching.test.ts` (new `ROUTES`-style entry that does NOT require `getPreviewState()`), then run `T009`, `T007`, `page-slug.test.ts` and `route-caching.test.ts` until green
- [ ] T012 [US2] Manual access matrix with the REAL deck on `pnpm --filter web dev --port 3029` (`GUIDELINE_DECK_ENABLED=true`, bundle copied into `apps/web/protected-static/retningslinje/`): run every row of quickstart.md §2 with `curl`, and a guest / other-tenant mock sign-in (`Guest Consultant`, `Other Tenant User`) to confirm they are refused; record results in this file's Notes section

**Checkpoint**: US2 holds — no session, no deck; nothing off-whitelist ever leaves the server.

---

## Phase 4: User Story 1 — Read the guideline inside KI Hub (P1)

**Goal**: card on the frontpage → `/retningslinje` → deck visible at slide 1, usable with its own controls.

**Independent Test**: quickstart.md §3 steps 1–3 and 7.

- [ ] T013 [P] [US1] Add `.app-deck-frame` to `apps/web/src/styles/app.css` using only `--ds-*` tokens (`width:100%; aspect-ratio:16/9; border:1px solid var(--ds-color-neutral-border-subtle); border-radius:var(--ds-border-radius-md)`); no hard-coded colour/spacing/radius
- [ ] T014 [P] [US1] Create `apps/web/src/components/DeckFrame.tsx` (`'use client'`) per contracts/guideline-page.md §B, **without hash handling yet**: renders the «Åpne i fullskjerm» link (`target="_blank" rel="noopener"`, `href=DECK_ENTRY`), mounts the iframe after hydration (`title="Retningslinje for agentisk KI i Digdir (presentasjon)"`, `allowFullScreen`, class `app-deck-frame`), and a `<noscript>` `ds-alert` with the same link
- [ ] T015 [US1] Create `apps/web/src/app/(app)/retningslinje/page.tsx` (Server Component) per contracts/guideline-page.md §A: `notFound()` when the switch is off; `metadata.title`; one `h1`, intro paragraph (104 slides, 1–69 + «Vedlegg» 70–104), `ds-alert` «Slik bruker du presentasjonen» (arrow keys/click, Home/End, back button, full screen best, **browser zoom does not enlarge the text**, desktop-first); chooses `DeckFrame` when `getDeckStore().exists('index.html')`, otherwise a `ds-alert` «Presentasjonen er ikke tilgjengelig akkurat nå» (FR-012); no contact line yet
- [ ] T016 [P] [US1] Create `apps/web/src/components/GuidelineBanner.tsx` (Server Component) modelled on `ContributeBanner.tsx`: `a.ds-card.app-banner` linking to `/retningslinje`, `aria-labelledby="fp-guideline-heading"`, tag «Retningslinje», `h2` «Retningslinje for agentisk KI i Digdir», one sentence, CTA «Åpne retningslinjen» with the existing arrow chip; neutral card surface (NOT the solid accent used by `ContributeBanner`)
- [ ] T017 [US1] Render `<GuidelineBanner />` in `apps/web/src/app/(app)/page.tsx` between `SubscriptionsBanner` and `ContributeBanner` only when `isGuidelineDeckEnabled()` (same `marginTop` wrapper pattern as its neighbours)
- [ ] T018 [P] [US1] Add page + banner tests in `apps/web/tests/unit/guideline-deck.test.ts` or a new `apps/web/tests/unit/guideline-page.test.ts`: banner renders only when enabled and links to `/retningslinje` with the heading as accessible name; page source has no `revalidate|force-static|generateStaticParams|unstable_cache|use cache` (extend `route-caching.test.ts` `FORBIDDEN` check to `retningslinje/page.tsx`)
- [ ] T019 [US1] Browser verification with the REAL deck (dev server from T012): quickstart.md §3 steps 1–3 — banner visible/absent with the switch off, page content, deck at slide 1, step to slide 104, back button; phone (375) and 320 px width; screenshot the page and the frontpage for the report

**Checkpoint**: US1 + US2 together are a complete, safe, releasable-behind-the-switch MVP.

---

## Phase 5: User Story 3 — Full screen, new tab and slide links (P2)

**Goal**: `/retningslinje#N` opens slide N inside the page and in the full-screen tab.

**Independent Test**: quickstart.md §3 step 4.

- [ ] T020 [US3] Add hash forwarding to `apps/web/src/components/DeckFrame.tsx`: `useSyncExternalStore` over `hashchange` (server snapshot `''`), value passed through `parseDeckHash`; iframe `src` and the full-screen `href` become `DECK_ENTRY + hash`; `hashchange` updates `src` by fragment only (no reload); the iframe is mounted after the first client render so the browser performs a single load
- [ ] T021 [P] [US3] Extend `apps/web/tests/unit/guideline-deck.test.ts` with a pure `buildDeckSrc(hash)` helper test (export `buildDeckSrc` from `lib/guideline-deck.ts`; `DeckFrame` uses it): `#53` → `/retningslinje/deck/index.html#53`, `#70.2` → `…#70.2`, invalid hash → bare entry, `#53"onload="x` → bare entry
- [ ] T022 [US3] Browser verification with the REAL deck: quickstart.md §3 step 4 for `#1`, `#53` («Nødstoppen stanser hele løsningen…»), `#70` («Vedlegg: kravene ordrett»), `#70.2`, `#104`, on the page and in the «Åpne i fullskjerm» tab (same slide); out-of-range `#999` and malformed `#abc` do not break the page; F11/fullscreen in the new tab letterboxes

**Checkpoint**: US3 holds; slide links are shareable.

---

## Phase 6: User Story 4 — Update the deck without touching the page (P3)

**Goal**: a new export is published by uploading blobs, with no code change or release; the procedure and
the release gate are documented.

**Independent Test**: quickstart.md §4–§5.

- [ ] T023 [US4] Document in `documentation/runtime-config.md`: the three new variables (table rows with required/optional, values, the INTERN note), the container requirement (`kihub-protected`, **private, no anonymous access**, provisioned out of band), the manual publish command (`az storage blob upload-batch --account-name stkihubmedia --destination kihub-protected --destination-path retningslinje --source <bundle> --auth-mode login`, **owner-run, never by the app**), the release steps (quickstart §6) and the rule that release needs Roberto Carrera's written confirmation on #183
- [ ] T024 [US4] Production-like proof with Azurite (quickstart §4): `docker run` Azurite blob on a free port, create container `kihub-protected`, upload the REAL bundle under `retningslinje/` with the Azure CLI/SDK against the emulator only, start the dev (or built) server with `MEDIA_STORAGE_MODE=azure`, the Azurite connection string, `GUIDELINE_DECK_CONTAINER=kihub-protected`, `GUIDELINE_DECK_ENABLED=true`; repeat quickstart §2; then unset `GUIDELINE_DECK_CONTAINER` and confirm the failure names it. Nothing touches the real Azure account
- [ ] T025 [US4] Update-procedure proof (SC-006): in Azurite replace `index.html` with a copy whose first slide title differs, reload `/retningslinje`, confirm the new title shows with no restart or build; then restore the original
- [ ] T026 [US4] Draft the constitution amendment as a SEPARATE uncommitted proposal in `specs/029-agentic-guideline-deck/constitution-amendment.md` (4.3.0 → 4.4.0, one sentence under the **Pages** module per research R9, plus the Sync Impact Report lines). **Do not edit `.specify/memory/constitution.md` unless the user approves.**

**Checkpoint**: US4 holds; operators know how to publish, and the release gate is written down.

---

## Phase 7: Polish & Cross-Cutting

- [ ] T027 [P] Accessibility: `axe-core` (from `apps/web/node_modules/axe-core/axe.min.js`, injected through the browser pane — no CDN) on `/retningslinje` and `/` → zero violations; keyboard-only pass (skip link → banner → page controls → into and out of the frame); record results in Notes
- [ ] T028 [P] Zero-external-requests check (SC-004) with the REAL deck in the browser pane: `performance.getEntriesByType('resource')` over slides 1→104 shows only the KI Hub origin, no `Set-Cookie` on deck responses, and the deck's CSP reports no violations; if the CSP in T010 blocks something the real deck needs, relax ONLY that directive and note why in research R3
- [ ] T029 Production build check (SC-009, quickstart §4): `pnpm --filter web build` against a migrated scratch DB with `AUTH_MODE=entra` (see CLAUDE.md 016/020 notes), then confirm `find apps/web/.next/standalone \( -path '*retningslinje*' -o -name 'deck.js' -o -name 'InterVariable*' \)` lists no deck file and `git ls-files | grep -iE 'retningslinje|deck.js|InterVariable'` lists only test fixtures and source files
- [ ] T030 Full gate: `pnpm --filter web exec vitest run` (unit + integration; export env first: `set -a; source apps/web/.env; set +a`), `pnpm --filter web lint`, `pnpm --filter web exec tsc --noEmit`; all green. Record counts in Notes
- [ ] T031 [P] Update the `CLAUDE.md` feature paragraph (status → implemented, counts, gotchas learned) and the Notes section below
- [ ] T032 [P] Draft the follow-up issue text for the Dockerfile `public/` finding (research R10) in `specs/029-agentic-guideline-deck/follow-ups.md` — do not file it or fix it here
- [ ] T033 Final repository scan before any commit: `git status --short` and `git diff --stat` show no real deck file, no `protected-static/`, no scratchpad path content; remove the local `apps/web/protected-static/` copy after verification (the bundle remains only in the scratchpad)

---

## Dependencies & Execution Order

- **Setup (T001–T004)** → **Foundational (T005–T008)** → stories.
- **US2 (T009–T012)** needs Foundational. T009 (failing test) before T010; T011 after T010; T012 after T011.
- **US1 (T013–T019)** needs US2's route (the page's iframe loads it) and Foundational. T014 and T016 are
  independent files and can run in parallel; T015 needs T014 and T013; T017 needs T016; T019 last.
- **US3 (T020–T022)** needs US1's `DeckFrame` (T014). T021 can be written in parallel with T020.
- **US4 (T023–T026)** needs Foundational (store seam) and a working route (T010); T024/T025 need Azurite; T026 is independent.
- **Polish (T027–T033)** after all stories; T033 last.

### Parallel opportunities

- Setup: T003 ∥ T004 (after T001–T002).
- Foundational: T007 ∥ T008 (after T005–T006).
- US1: T013 ∥ T014 ∥ T016; T018 ∥ T019 once T017 is done.
- Polish: T027 ∥ T028 ∥ T031 ∥ T032.

## Implementation Strategy

1. **MVP = Setup + Foundational + US2 + US1** (T001–T019): a safe, switch-gated deck inside KI Hub. Stop
   and show the user here, with screenshots, before US3.
2. Add **US3** (slide links), then **US4** (publish/update procedure, Azurite proof, amendment draft).
3. Polish gates (axe, zero-external-requests, build-contents check, full suite).
4. **Not part of implementation**: creating the real container, uploading the real deck, switching the
   feature on in any deployed environment, filing the follow-up issue, applying the constitution
   amendment. Each needs the user's explicit go-ahead, and release needs Roberto's confirmation (SC-008).

## Notes

- (filled in during implementation: access-matrix results, axe results, test counts, gotchas)
