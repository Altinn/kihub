---
description: "Task list for Frontpage Redesign implementation"
---

# Tasks: Frontpage Redesign

**Input**: Design documents from `/specs/011-frontpage-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included per the plan and the constitution's testing gate — the genuinely-new logic gets
**failing-first unit tests** (pure `frontpage-select`, pure `ics`, new `event-dates` helpers) and
the new globals get an **access-control integration test** (`site-content-access`) since they are a
new editor-writable module. The published-only / upcoming-only visibility invariant is already
covered by the existing `news-access` / `events-access` integration tests — no duplicate coverage.
Page/section rendering is validated via quickstart + browser.

**Organization**: By user story — US1=P1 frontpage core (hero + tiles + subscriptions banner, MVP);
US2=P2 "Hva skjer i BOD" events section; US3=P2 "Siste nytt" news section; US4=P3 CMS-driven site
header; US5=P3 CMS-driven site footer.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete deps)
- **[Story]**: US1–US5 (setup/foundational/polish carry no story label)
- Paths relative to the `kihub` repo root

## Path Conventions

Monorepo: all code lives in `apps/web/`. New Payload globals in `src/globals/`; components in
`src/components/`; read/selection/format logic in `src/lib/`; the frontpage is
`src/app/(app)/page.tsx`; shared chrome mounts in `src/app/(app)/layout.tsx`; tests under `tests/`.
Styling comes exclusively from the already-imported kihub layer (`src/styles/kihub/` — tokens +
`.kihub-*` classes); this feature MUST NOT modify those synced files. `packages/*` and all existing
collections are **unchanged**. **No new dependencies.**

---

## Phase 1: Setup (pure logic, TDD)

**Purpose**: The pure, Payload-free logic every section leans on — chronological selection, ICS
generation, Oslo date parts — written failing-first.

- [ ] T001 [P] Write failing-first unit test `apps/web/tests/unit/frontpage-select.test.ts` per data-model.md: `selectEventsSection(events, now)` re-sorts input strictly by `startDateTime` ascending (undoing the read lib's featured-first order), returns `next` = soonest and `timeline` = the following ≤4 events **regardless of calendar month** (clarification), `{ next: null, timeline: [] }` for empty input, timeline shorter than 4 when fewer exist, and does not mutate input; `selectLatestNews(news, n=4)` re-sorts by `publishDate` descending **ignoring `featured`** (a featured-but-older article must NOT outrank a newer one), caps at `n`, handles missing `publishDate` last, and does not mutate input. Must FAIL initially (module absent)
- [ ] T002 [P] Write failing-first unit test `apps/web/tests/unit/ics.test.ts` per contracts/event-ics.md: `buildEventIcs(event, baseUrl)` emits a `BEGIN:VCALENDAR`/`VERSION:2.0`/`PRODID`/`VEVENT` envelope with CRLF (`\r\n`) endings and 75-octet line folding; `UID:<slug>@kihub` stable across calls; `DTSTAMP`/`DTSTART` in UTC basic format (`YYYYMMDDTHHMMSSZ`); `DTEND` omitted when `endDateTime` absent; `LOCATION` omitted when absent; `SUMMARY`/`LOCATION`/`DESCRIPTION` TEXT-escaped per RFC 5545 §3.3.11 (`\\`, `\;`, `\,`, `\n`); `URL` = `<baseUrl>/events/<slug>`. Must FAIL initially
- [ ] T003 [P] Extend `apps/web/tests/unit/event-dates.test.ts` with failing tests for the new Oslo/nb-NO date-part helpers used by the events section (contracts/frontpage-read.md): 2-digit day numeral ("03"), "måned år" line ("juli 2026"), short weekday ("fre."→ normalized per implementation), "HH:mm" time ("10:00"), and timeline date ("08. jul") — all rendered in Europe/Oslo regardless of server TZ. Must FAIL initially (helpers absent)
- [ ] T004 Implement pure `apps/web/src/lib/frontpage-select.ts` to make T001 pass: `selectEventsSection(events: Event[], now: Date): { next: Event | null; timeline: Event[] }` and `selectLatestNews(news: News[], n = 4): News[]`. Types imported as **types only**; MUST NOT import `@payload-config` or any Payload runtime (mirrors `lib/home-select.ts`) (depends on T001)
- [ ] T005 [P] Implement pure `apps/web/src/lib/ics.ts` to make T002 pass: `buildEventIcs(event, baseUrl)` per contracts/event-ics.md — escaping, folding, UTC stamps, stable UID; no dependencies, no Payload imports (depends on T002)
- [ ] T006 [P] Implement the new date-part helpers in `apps/web/src/lib/event-dates.ts` to make T003 pass (keep all existing exports/behavior untouched — `formatEventWhen` et al. are used by the events pages) (depends on T003)

**Checkpoint**: `pnpm test` green on the three unit files; still zero UI/schema changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The editor-content data layer — two globals, seeded defaults, the merge-reading lib,
and its access test. Every user story reads through this layer.

**⚠️ CRITICAL**: Blocks all user stories (US1 needs `frontpage`, US4/US5 need `site-chrome`).

- [ ] T007 [P] Create `apps/web/src/lib/site-content-defaults.ts` per contracts/site-content-globals.md: typed, exported `DEFAULT_SITE_CHROME` (nav: Hjem `/`, Verktøy `/registry`, Nyheter `/news`, Arrangementer `/events`; footer: "Kontakt oss:" + `kitt@digdir.no`, links Om KITT/Verktøy/Prosjekter/Nyheter) and `DEFAULT_FRONTPAGE` (hero eyebrow "Digdir / BOD / KITT-teamet", heading "Kunstig intelligens i BOD" with accentWord "BOD", lead + CTA pair; tiles ["Katalog"/"Verktøy"→`/registry`, tinted] and ["Oversikt"/"KI Prosjekter i BOD"→`/registry`, accent]; subscriptions eyebrow/heading/description + chips GitHub Copilot, Claude Teams). Pure constants — the single source for both Payload `defaultValue`s and the read-lib merge
- [ ] T008 [P] Create global `apps/web/src/globals/SiteChrome.ts` (slug `site-chrome`) per data-model.md: `nav` array (label+href, required, minRows 1, maxRows 8), `footer` group (contactLabel, contactEmail as `email`, `links` array maxRows 10); access `read: () => true`, `update: isEditor` (same `role !== 'reader'` predicate as News/Events); `defaultValue`s wired from `site-content-defaults.ts` (depends on T007)
- [ ] T009 [P] Create global `apps/web/src/globals/Frontpage.ts` (slug `frontpage`) per data-model.md: `hero` group (eyebrow, heading, accentWord, lead textarea, primaryCta/secondaryCta groups of label+href), `tiles` array (tag, title required, href required, variant select tinted|accent; **minRows 2, maxRows 2**), `subscriptions` group (eyebrow, heading, description, chips array of name required + optional href, maxRows 12); same access posture as T008; `defaultValue`s from `site-content-defaults.ts` (depends on T007)
- [ ] T010 Register the globals in `apps/web/src/payload.config.ts`: `globals: [SiteChrome, Frontpage]` alongside the existing `collections` array (depends on T008, T009)
- [ ] T011 Write failing-first integration test `apps/web/tests/integration/site-content-access.test.ts` per contracts/site-content-globals.md test obligations: (1) a `reader` user CANNOT update either global via the Payload local API; (2) a Contributor+ CAN, and the stored value is returned on next read; (3) with no stored globals, `getSiteChrome()`/`getFrontpageContent()` return the complete seeded defaults (every section non-empty); (4) per-section merge — storing only `nav` leaves footer defaults intact, and vice versa. Follow the setup/cleanup pattern of `tests/integration/news-access.test.ts`. Must FAIL on (3)/(4) until T012 (depends on T010)
- [ ] T012 Implement `apps/web/src/lib/site-content.ts` to make T011 pass: `getSiteChrome(): Promise<SiteChrome>` and `getFrontpageContent(): Promise<FrontpageContent>` — `payload.findGlobal` + **per-section** fallback (nav, footer, hero, tiles, subscriptions) to the defaults module when a section is unset/empty; exports the read shapes from data-model.md. Components/pages MUST read only through this lib, never `findGlobal` directly (depends on T007, T010, T011)

**Checkpoint**: Globals visible in `/cms` admin with pre-filled defaults; `site-content-access`
green; full suite green. User stories can start (in parallel if staffed).

---

## Phase 3: User Story 1 - Frontpage core: hero, navigation tiles, subscriptions banner (Priority: P1) 🎯 MVP

**Goal**: `/` opens on the new-design frontpage top: CMS-driven hero (eyebrow, accent-word serif
headline, lead, CTA pair, illustration slot), two navigation tiles, and the "Tilgjengelige
abonnementer" banner — seeded defaults render on a fresh environment; editor edits are live on
reload.

**Independent Test**: Signed in as any employee, `/` shows hero + 2 tiles + banner styled per the
kihub system (white ground, one blue accent, serif display). Change the hero headline and a tile
title in `/cms` → reload shows both. (The old `PortalHeader` may still sit above until US4 — that
is expected mid-flight.)

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create `apps/web/src/components/FrontpageHero.tsx` (server) per contracts/frontpage-read.md: renders `hero` from `FrontpageContent` — `.kihub-eyebrow--accent` eyebrow, `<h1 class="kihub-h1">` with the `accentWord` substring wrapped in `.kihub-accent-word` (no match → whole heading in ink; helper kept pure inside the component file), `.kihub-lead` paragraph, primary/secondary CTAs as `.kihub-btn kihub-btn--primary/--secondary` links (a CTA with empty label is omitted), and a right-hand illustration slot (inline decorative SVG or `public/` asset, `aria-hidden`, hidden gracefully on mobile; layout intact when slot empty)
- [ ] T014 [P] [US1] Create `apps/web/src/components/FrontpageTile.tsx` per contracts/frontpage-read.md: one `<a class="kihub-tile">` per tile (variant `accent` adds `.kihub-tile--accent`) — `.kihub-tag` (`--on-accent` variant on the accent tile), `.kihub-tile__title` with `.kihub-tile__arrow` circle; the WHOLE tile is a single anchor, no nested interactive elements
- [ ] T015 [P] [US1] Create `apps/web/src/components/SubscriptionsBanner.tsx` per contracts/frontpage-read.md: full-width `.kihub-card--tinted` band — eyebrow, `.kihub-h3` heading, description, and the chips row (chip = bordered white pill per the design-system spec; renders as `<a>` when `href` present, else `<span>`)
- [ ] T016 [US1] Rewrite `apps/web/src/app/(app)/page.tsx` as the frontpage: keep `<PortalHeader />` temporarily (removed in US4), then `<main class="kihub-container">` composing `FrontpageHero`, the two-up tile grid (`.kihub-grid-2`, 2px gutter), and `SubscriptionsBanner` from `await getFrontpageContent()`; the 010 `HomeWidget` blocks and their imports are dropped (events/news sections arrive in US2/US3). One `<h1>` (hero); sections wrapped in semantic `<section>`s (depends on T012, T013, T014, T015)
- [ ] T017 [US1] Validate quickstart.md Scenario 1 (fresh defaults render complete, correct order/styling for hero/tiles/banner) and Scenario 2 steps 1–3 (edit hero headline, tile title, chip in `/cms` → live on reload); spot-check 360 px stacking of the three sections in the browser

**Checkpoint**: MVP — the frontpage identity is live with CMS-driven content. Full suite green.

---

## Phase 4: User Story 2 - "Hva skjer i BOD" events section (Priority: P2)

**Goal**: The frontpage shows the next upcoming event as a rich card (date numeral, weekday/time,
tag, title, meta, "Se arrangementet", "+ Legg til i kalender" ICS download) beside an
"Utover måneden" timeline of the next 4 events; "Se kalender →" links to `/events`.

**Independent Test**: Quickstart Scenario 3 — with ≥6 published future events spanning two months
(+1 draft, +1 past): soonest event in the card with correct Oslo date parts; next 4 in the
timeline crossing the month boundary; draft/past invisible; ICS downloads and imports; unknown/
draft slug → 404; zero events → friendly empty state with "Se kalender →" intact.

### Implementation for User Story 2

- [ ] T018 [P] [US2] Create `apps/web/src/components/NextEventCard.tsx` per contracts/frontpage-read.md: "Neste arrangement" eyebrow header on `.kihub-card` with tinted top zone — date-numeral block (day, "måned år", weekday + "· HH:mm" via the T006 helpers), first-tag chip (`.kihub-tag--tinted`, uppercase; omitted when no tags), `.kihub-h4` title linking to `/events/[slug]`, meta line joining present parts of location / "Digitalt" (when `onlineUrl`) / organizer with " · " (no dangling separators), a full-width `.kihub-btn--primary` "Se arrangementet" → `/events/[slug]`, and a "+ Legg til i kalender" link → `/events/[slug]/ics`
- [ ] T019 [P] [US2] Create `apps/web/src/components/EventsTimeline.tsx` per contracts/frontpage-read.md: "Utover måneden" eyebrow + vertical list — each row a decorative colored dot (cycling design-system-palette variation, `aria-hidden`), "dd. MMM" + "HH:mm" column (T006 helpers), title linking to `/events/[slug]`, and a "type · location" line (first tag + location, omitting absent parts); rows separated by `--kihub-border-subtle` rules
- [ ] T020 [P] [US2] Create ICS route `apps/web/src/app/(app)/events/[slug]/ics/route.ts` per contracts/event-ics.md: `GET` resolves `getPublishedEventBySlug(slug)` — found → 200 with `buildEventIcs(event, baseUrl)` body, `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: attachment; filename="<slug>.ics"`; unknown/unpublished → 404. Published-only invariant inherited from the read lib, not re-implemented (depends on T005)
- [ ] T021 [US2] Add the events section to `apps/web/src/app/(app)/page.tsx` between banner and (future) news: "ARRANGEMENTER" eyebrow + `.kihub-h2` "Hva skjer i BOD" + "Se kalender →" link to `/events`; compose `await listUpcomingEvents()` → `selectEventsSection(events, new Date())` → `NextEventCard` (left) + `EventsTimeline` (right) in a responsive two-column grid (stacks ≤ ~720 px); `next === null` → friendly empty state with the "Se kalender →" link retained (depends on T004, T016, T018, T019)
- [ ] T022 [US2] Validate quickstart.md Scenario 3 end-to-end (seed events across a month boundary in `/cms`, verify card/timeline/links, download + import the ICS, `curl -i` a draft slug for 404, unpublish-all for the empty state)

**Checkpoint**: Events section fully functional and independently testable on top of US1.

---

## Phase 5: User Story 3 - "Siste nytt" news section (Priority: P2)

**Goal**: The frontpage ends its content with the 4 most recently published news as designed image
cards; "Alle nyheter →" links to `/news`.

**Independent Test**: Quickstart Scenario 4 — with ≥5 published articles (one featured-but-older,
one imageless, +1 draft): exactly the 4 newest by publish date render newest-first (featured does
NOT jump the order), imageless card shows the placeholder well, links land on `/news/[slug]`,
draft invisible; fewer/none → graceful layout / friendly empty state.

### Implementation for User Story 3

- [ ] T023 [P] [US3] Create `apps/web/src/components/FrontpageNewsCard.tsx` per contracts/frontpage-read.md: whole-card link to `/news/[slug]` — 16:10 `.kihub-media` image well (`<img>` with `alt` from title when `heroImageUrl` present; `.kihub-media--placeholder` otherwise or on broken URL), `.kihub-h4` serif title, `nb-NO` date line (Inter label style), and summary in subtle ink
- [ ] T024 [US3] Add the news section to `apps/web/src/app/(app)/page.tsx` after events: "AKTUELT" eyebrow + `.kihub-h2` "Siste nytt" + "Alle nyheter →" link to `/news`; compose `await listPublishedNews()` → `selectLatestNews(news, 4)` → `FrontpageNewsCard` grid (`.kihub-grid-2`-style two-up on desktop per the reference layout, single column on mobile); zero articles → friendly empty state with the "Alle nyheter →" link retained (depends on T004, T016, T023)
- [ ] T025 [US3] Validate quickstart.md Scenario 4 (chronology beats featured, placeholder well, draft invisible, empty state)

**Checkpoint**: The full frontpage body is complete; `/` now covers everything specs/010 promised
(SC-006) plus the redesign.

---

## Phase 6: User Story 4 - Site header with CMS-managed navigation (Priority: P3)

**Goal**: Every employee page shows the new site header — kitt/KI HUB brand lockup, CMS-managed
nav, "Søk" affordance → `/registry`, compact user identity + sign-out (+ admin links) — collapsing
to an accessible menu on mobile. `PortalHeader` is retired.

**Independent Test**: Quickstart Scenario 5 (header half): all seven page types show the same
header; add/reorder a nav item in `/cms` → reflected on reload; sign-out works from the header;
narrow viewport → keyboard-operable menu toggle with correct `aria-expanded`.

### Implementation for User Story 4

- [ ] T026 [P] [US4] Create client component `apps/web/src/components/SiteNav.tsx` (`'use client'`): receives `nav: NavItem[]` as props; renders the horizontal nav list on desktop and, below the breakpoint, a hamburger `<button aria-expanded aria-controls>` toggling the list (useState; Inter `.kihub-*` label styling; focus ring intact). The feature's ONLY client component
- [ ] T027 [US4] Create server component `apps/web/src/components/SiteHeader.tsx` per contracts/frontpage-read.md: brand lockup ("kitt" accent wordmark + "KI HUB", link → `/`), `<SiteNav nav={chrome.nav} />` from `await getSiteChrome()`, "Søk" search affordance → `/registry`, and the right-hand cluster carried over from `PortalHeader` — compact user name/role, admin-only `/admin/roles` link, and the `'use server'` `signOut({ redirectTo: '/signin' })` form (depends on T012, T026)
- [ ] T028 [US4] Mount the header in `apps/web/src/app/(app)/layout.tsx` (render `<SiteHeader />` above `{children}`), then remove the now-duplicate `<PortalHeader />` line + import from `app/(app)/page.tsx`, `app/(app)/registry/page.tsx`, `app/(app)/news/page.tsx`, `app/(app)/news/[slug]/page.tsx`, `app/(app)/events/page.tsx`, `app/(app)/events/[slug]/page.tsx`, and `app/(app)/artifacts/[artifactId]/page.tsx` (verify with a repo-wide grep), and delete `apps/web/src/components/PortalHeader.tsx` (its affordances now live in SiteHeader) (depends on T027)
- [ ] T029 [US4] Validate quickstart.md Scenario 5 (header on all pages, CMS nav edit live, sign-out; admin link visible only for admin) and Scenario 6 step 1 mobile-menu keyboard check

**Checkpoint**: One shared, CMS-driven header everywhere; no page renders its own.

---

## Phase 7: User Story 5 - Site footer with CMS-managed content (Priority: P3)

**Goal**: Every employee page ends with the inverted-surface footer — brand lockup, "Kontakt oss:"
mailto block, CMS-managed link list.

**Independent Test**: Quickstart Scenario 5 (footer half): footer on all seven page types; change
contact email + a link in `/cms` → reflected on reload; three zones on desktop, stacked on mobile.

### Implementation for User Story 5

- [ ] T030 [US5] Create server component `apps/web/src/components/SiteFooter.tsx` per contracts/frontpage-read.md: `<footer>` on `--kihub-surface-inverted` with inverted ink — brand lockup, contact block (`chrome.footer.contactLabel` + `mailto:` link), and the ordered link list from `await getSiteChrome()`; serif link styling per the reference, `.kihub-container` width, three zones collapsing to a stack on mobile (depends on T012)
- [ ] T031 [US5] Mount the footer in `apps/web/src/app/(app)/layout.tsx` (render `<SiteFooter />` below `{children}`; wrap children so the footer sits at the page bottom on short pages) (depends on T028, T030)
- [ ] T032 [US5] Validate quickstart.md Scenario 5 (footer half — all pages, CMS edits live, mailto works) and its mobile stacking

**Checkpoint**: All five user stories complete — full chrome + full frontpage.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Retire dead 010 plumbing, responsive/a11y sweep, full regression.

- [ ] T033 [P] Retire the unused 010 widget layer (research §9): delete `apps/web/src/components/HomeWidget.tsx`, `apps/web/src/lib/home.ts`, `apps/web/src/lib/home-select.ts`, and `apps/web/tests/unit/home-select.test.ts` after a repo-wide grep confirms zero remaining importers (the frontpage reads `listPublishedNews`/`listUpcomingEvents` + `frontpage-select` directly); keep `NewsCard`/`EventCard`/`ArtifactCard` (still used by `/news`, `/events`, `/registry`)
- [ ] T034 [P] Responsive + accessibility sweep per quickstart.md Scenario 6: 360 px and 1440 px passes over all seven sections (no horizontal scroll, tiles/cards single tab stops, kihub focus ring on every interactive element, `header`/`main`/`footer` landmarks, one `<h1>`, sections under `<h2>`s, decorative dots/illustration `aria-hidden`); fix whatever the sweep finds in the new components
- [ ] T035 Full regression: `cd apps/web && set -a && source .env && set +a && pnpm test && pnpm lint` — entire suite green (incl. new unit + integration tests), lint clean
- [ ] T036 Run quickstart.md end-to-end (Scenarios 1–7) as the final acceptance pass; confirm SC-001…SC-006, then update the CLAUDE.md SPECKIT block status to "tasks + implement done" as part of the implementation commit

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. T001–T003 in parallel; T004–T006 after their tests.
- **Foundational (Phase 2)**: Independent of Phase 1 (different files) but ordered after it here to keep TDD flow; T007 → T008/T009 [P] → T010 → T011 → T012. **BLOCKS all user stories.**
- **US1 (Phase 3)**: Needs T012 (frontpage content read). Components T013–T015 in parallel; then T016 (page) → T017.
- **US2 (Phase 4)**: Needs T004 (selection), T016 (page exists). T018/T019/T020 in parallel; then T021 → T022.
- **US3 (Phase 5)**: Needs T004, T016. T023; then T024 → T025. Independent of US2 (different page section — coordinate the shared `page.tsx` edit if run in parallel).
- **US4 (Phase 6)**: Needs T012. T026 → T027 → T028 → T029. Touches many pages — do not parallelize T028 with US2/US3 page edits.
- **US5 (Phase 7)**: Needs T012, T028 (layout), T030. Then T031 → T032.
- **Polish (Phase 8)**: After all stories. T033/T034 in parallel; then T035 → T036.

### User Story Dependencies

- **US1 (P1)**: Foundational only — the MVP.
- **US2 (P2), US3 (P2)**: Foundational + US1's T016 (the rewritten page they extend). Mutually independent.
- **US4 (P3), US5 (P3)**: Foundational only (layout/chrome — independent of the page body); US5's layout task follows US4's layout task (same file).

### Parallel Opportunities

```bash
# Phase 1 — all failing tests together:
Task: "T001 frontpage-select unit test"   Task: "T002 ics unit test"   Task: "T003 event-dates additions"
# Phase 2 — both globals after defaults:
Task: "T008 SiteChrome global"            Task: "T009 Frontpage global"
# US1 — all three section components:
Task: "T013 FrontpageHero"  Task: "T014 FrontpageTile"  Task: "T015 SubscriptionsBanner"
# US2 — card, timeline, ICS route:
Task: "T018 NextEventCard"  Task: "T019 EventsTimeline"  Task: "T020 ICS route"
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 (pure logic) + Phase 2 (globals/data layer) → foundation green.
2. Phase 3 (US1) → **STOP and VALIDATE**: hero/tiles/banner live from CMS with seeded defaults.

### Incremental Delivery

US1 → US2 → US3 → US4 → US5 → Polish, validating each checkpoint. **Deploy note**: ship `/` only
after US3 — between US1 and US3 the rewritten frontpage temporarily lacks the events/news sections
that SC-006 guarantees (fine mid-flight on the feature branch, not fine deployed).

### Notes

- [P] = different files, no incomplete deps. US2/US3/US4 all edit `page.tsx`/layout at their
  integration step — sequence those specific tasks even with parallel component work.
- Commit after each task or logical group (repo convention: one commit per Spec Kit stage;
  implementation may land as grouped commits per phase).
- The kihub style layer (`src/styles/kihub/`) is consumed, never edited, by this feature.
