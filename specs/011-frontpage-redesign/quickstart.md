# Quickstart: Frontpage Redesign — validation guide

Runnable scenarios proving the feature end-to-end. Contracts referenced, not duplicated:
[site-content-globals.md](./contracts/site-content-globals.md),
[frontpage-read.md](./contracts/frontpage-read.md), [event-ics.md](./contracts/event-ics.md).

## Prerequisites

```bash
cd apps/web
# .env present (DATABASE_URI, PAYLOAD_SECRET, AUTH_MODE=mock for local dev)
pnpm --filter web dev   # http://localhost:3000 — sign in via mock auth
```

Automated suites (all must pass):

```bash
cd apps/web && set -a && source .env && set +a && pnpm test && pnpm lint
```

## Scenario 1 — Fresh environment renders complete (FR-012 / SC-001)

With globals never saved in the admin:
1. Open `/` signed in as any employee (reader).
2. Verify all seven sections render in order (header → hero → 2 tiles → subscriptions banner →
   events → news → footer) with Norwegian seeded defaults; no empty/broken section.
3. Verify styling: white ground, one blue accent, serif headings, footer on dark ink surface —
   no dark-theme remnants, no third background color.

## Scenario 2 — Editor edits are live without deploy (FR-011 / SC-002)

1. Sign in as Contributor+ and open `/cms` → Globals.
2. Change: a nav label, the hero headline, a tile title, a subscription chip, the footer email.
3. Reload `/` as an employee — all five changes visible. (Server-rendered per request; no
   cache/ISR step needed.)
4. As a `reader`, attempt the same update via API → rejected (also covered by
   `tests/integration/site-content-access.test.ts`).

## Scenario 3 — Events section (FR-006/007, clarifications)

Seed via `/cms`: ≥6 published future events spanning two calendar months, plus one draft and one
past event.
1. `/` shows the chronologically soonest event in the "Neste arrangement" card: date numeral,
   month/year, weekday + time (Europe/Oslo), first-tag chip, title, meta line without dangling
   "·" separators.
2. Timeline lists the NEXT 4 events after it, crossing the month boundary, chronological.
3. Draft and past events appear nowhere. "Se arrangementet" and the card title →
   `/events/[slug]`; "Se kalender →" → `/events`.
4. "+ Legg til i kalender" downloads `<slug>.ics`; file imports into a calendar client with
   correct title/time; re-download updates (same UID) rather than duplicates.
5. `curl -i` the ICS URL for a draft event's slug → 404.
6. Unpublish all future events → friendly empty state; "Se kalender →" still present.

## Scenario 4 — News section (FR-008)

Seed: ≥5 published articles (varied `publishDate`, at least one `featured` that is NOT newest,
one without `heroImageUrl`), plus one draft.
1. `/` shows exactly the 4 newest by publish date, newest first — the featured-but-older article
   must NOT jump the order (chronology beats the featured boost here).
2. Imageless article renders the placeholder media well. Cards → `/news/[slug]`;
   "Alle nyheter →" → `/news`.
3. Draft appears nowhere.

## Scenario 5 — Chrome on every page (clarification / FR-009/010)

1. Visit `/`, `/registry`, `/news`, `/events`, one news article, one event, one artifact detail:
   same header (brand, nav, "Søk" → `/registry`, user + sign-out; admin sees admin links) and
   same footer on all.
2. Sign-out works from the header. No page still renders the old `PortalHeader`.

## Scenario 6 — Responsive + accessibility (FR-013/014 / SC-004/005)

1. At 360 px width: no horizontal scroll; sections stack single-column; nav collapses behind the
   menu button (operable by keyboard, `aria-expanded` toggles).
2. At 1440 px: two-up tiles, events split card/timeline, 2×2 (or 4-up) news grid.
3. Keyboard-tab the whole page: every link/button reachable, kihub focus ring visible (3px outer
   + 3px inner), tiles/cards are single tab stops.
4. Landmarks: one `h1` (hero), sections under `h2`s, `header`/`main`/`footer` present.

## Scenario 7 — Regression guard (SC-006)

```bash
cd apps/web && set -a && source .env && set +a && pnpm test
```
Full suite green — including the new `frontpage-select`, `ics`, `event-dates` unit tests and the
`site-content-access` integration test; `/registry`, `/news`, `/events` behave exactly as before
(only the shared chrome changed).
