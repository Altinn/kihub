# Contract: Frontpage read & render (`/`)

What the frontpage page composes, section by section. All reads are server-side; the page is a
server component. The only client JS on the page is the header's mobile menu toggle.

## Section order (FR-001)

`SiteHeader` → `FrontpageHero` → tiles (2 × `FrontpageTile`) → `SubscriptionsBanner` →
events section → news section → `SiteFooter`. Header/footer come from `(app)/layout.tsx` (all
employee pages); the five middle sections are the page itself.

| Section | Source | Ordering / cap | Empty state |
|---|---|---|---|
| Hero | `getFrontpageContent().hero` | — | Never empty (seeded defaults) |
| Tiles | `getFrontpageContent().tiles` | Exactly 2, admin-ordered | Never empty (seeded defaults) |
| Subscriptions | `getFrontpageContent().subscriptions` | Chips admin-ordered | Never empty (seeded defaults) |
| Events "Hva skjer i BOD" | `listUpcomingEvents()` → `selectEventsSection(events, now)` | Chronological; 1 featured card + ≤4 timeline rows, month-agnostic | Friendly empty state; "Se kalender →" always shown |
| News "Siste nytt" | `listPublishedNews()` → `selectLatestNews(news, 4)` | Newest-first by `publishDate`, `featured` ignored; exactly ≤4 | Friendly empty state; "Alle nyheter →" always shown |

## Links out

- Tile → its `href`. Whole tile is ONE anchor (`.kihub-tile`), no nested interactive elements.
- Next-event card: title + "Se arrangementet" → `/events/[slug]`; "+ Legg til i kalender" →
  `/events/[slug]/ics` (download, [event-ics.md](./event-ics.md)); timeline row → `/events/[slug]`.
- News card → `/news/[slug]`. "Se kalender →" → `/events`. "Alle nyheter →" → `/news`.
- Header: brand → `/`; nav items → their `href`; search ("Søk") → `/registry`; sign-out server
  action + admin links preserved from `PortalHeader`. Footer links → their `href`;
  contact → `mailto:`.

## Presentation rules (FR-002/013/014)

- Styling exclusively via `--kihub-*` tokens / `.kihub-*` classes; two surfaces only (white +
  `--kihub-surface-accent`), footer on `--kihub-surface-inverted`; no gradients; focus ring never
  removed.
- Event card date parts (Oslo timezone, `nb-NO`): day numeral (2-digit), "måned år" line, weekday
  short + "· HH:mm"; timeline rows "dd. MMM" + "HH:mm". Formatting via `lib/event-dates.ts`
  helpers (unit-tested).
- Event category chip = first tag, uppercased eyebrow style; meta line joins present parts with
  " · " (no dangling separators). News image absent/broken → `.kihub-media--placeholder` well.
- Breakpoints: sections collapse to single column ≤ ~720 px; header nav collapses behind the
  `SiteNav` toggle; no horizontal scroll at 360 px (SC-004).
- Landmarks: one `<header>`, `<main>` with one `<h1>` (hero heading), sections with `<h2>`
  (visually the eyebrow+heading pair), one `<footer>` (`role="contentinfo"`).

## Replacement guarantees (SC-006)

The 010 dashboard is deleted, but its user-visible guarantees survive: latest news reachable from
`/` (news section), upcoming events reachable from `/` (events section), Registry reachable from
`/` (tile + nav + search affordance). The recommended-artifacts widget is retired per clarified
spec (assumption section).
