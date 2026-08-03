# Implementation Plan: Frontpage Redesign

**Branch**: `feat/new-architecture` (single-branch workflow) | **Date**: 2026-08-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-frontpage-redesign/spec.md`

## Summary

Rebuild `/` from the specs/010 widgets dashboard into the full portal frontpage matching the old
KI HUB site's layout, restyled with the **kihub design system** (direction 1a — imported in commit
`2b30418` under `apps/web/src/styles/kihub/`): white ground, one Digdir-blue accent, Source Serif 4
display type. Top to bottom: CMS-driven **site header** (brand lockup, editor-managed nav, search
affordance, compact user/sign-out), CMS-driven **hero**, two CMS-driven **navigation tiles**, the
CMS-driven **"Tilgjengelige abonnementer" banner**, the **"Hva skjer i BOD" events section** (next
event card + "Utover måneden" timeline of the next 4, from the existing Events read layer), the
**"Siste nytt" news section** (latest 4 published articles from the existing News read layer), and
a CMS-driven **site footer** on the inverted surface. Header + footer replace `PortalHeader` on
every employee page.

Editor-managed content lands in **two new Payload globals** — `site-chrome` (header nav + footer)
and `frontpage` (hero, tiles, subscriptions banner) — read-only from the employee app, update-gated
to Contributor+ exactly like News/Events, with **code-level seeded defaults** so the page renders
complete before editors touch anything. News/Events remain read-only reuse; the only Events-module
addition is a per-event **ICS download route** backing "+ Legg til i kalender" (a pure, unit-tested
generator). The specs/010 recommended-artifacts widget is retired; Registry is reached via
tile + nav.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 22+ (unchanged).

**Primary Dependencies**:
- Next.js 16 (App Router) + Payload CMS 3.85 — already present; **no new dependency**.
- **kihub design-system layer** (`apps/web/src/styles/kihub/` — tokens.css, components.css,
  tokens.ts; already wired into `themed-html.tsx` on top of `@digdir/designsystemet-css`). All new
  frontpage/chrome components style exclusively via `--kihub-*` tokens and `.kihub-*` classes.
- `@digdir/designsystemet-react` stays loaded and remains the base for existing pages; see
  Complexity Tracking for the brand-layer justification.
- Existing read layers reused: `lib/news.ts::listPublishedNews`, `lib/events.ts::listUpcomingEvents`
  (both return featured-first — the frontpage re-selects **chronologically** via new pure helpers),
  `lib/event-dates.ts` (Oslo-timezone formatting, extended with date-part helpers).

**Storage**: PostgreSQL via Payload. **Two new globals** (`site-chrome`, `frontpage`) — additive;
no collection or field changes to News/Events/Registry. Schema sync follows the repo's existing
dev-push convention (no committed migrations, same as Phases 7/8). `payload generate:types` NOT
used (repo pattern: hand-typed shapes in read libs).

**Testing**: Vitest. **Unit (failing-first)**: `lib/frontpage-select.ts` (pure: chronological
next-event/timeline partition, latest-4 news selection), `lib/ics.ts` (pure ICS generation,
escaping, date formatting), `lib/event-dates.ts` additions (date-numeral/weekday/time/timeline-row
parts). **Integration (constitution gate — new module MUST test access control)**:
`site-content-access.test.ts` — reader cannot update globals, Contributor+ can; employee read
returns seeded defaults when unset and editor values when set. Existing `home-select.test.ts`
shrinks (recommended-artifacts selection retired). Existing news/events access tests unchanged —
they already guarantee the published-only/upcoming-only invariant the sections depend on.

**Target Platform**: Local dev (`AUTH_MODE=mock`) and Azure (Entra). Employee app only; the
back-office gains two globals in the Payload admin nav.

**Project Type**: Web app monorepo — `apps/web` only; `packages/*` unchanged.

**Performance Goals**: None specific — one server-rendered page composing two global reads + two
existing list reads at portal scale. No client data fetching; the only client JS is the mobile
menu toggle.

**Constraints**:
- `/` renders all seven sections in order (FR-001); never the catalog (unchanged from 010).
- New-visual styling comes only from kihub tokens/classes (FR-002); no gradients/extra hues.
- Chrome (header/footer) replaces `PortalHeader` on **all** employee pages (clarification), and
  the sign-out/admin affordances it carried must survive the swap.
- Events: chronological selection (next 1 + following 4, month-agnostic); "Se arrangementet" →
  detail page; no registration concept (clarification). News: exactly latest 4, newest-first,
  ignoring `featured` boost (FR-008).
- Globals are editor-writable only (server-side access rules), employee-read-only (FR-011);
  seeded defaults guarantee a complete first render (FR-012).
- Responsive to 360 px with accessible mobile menu (FR-013); kihub focus ring everywhere (FR-014).

**Scale/Scope**: 2 new globals + seeded defaults; ~8 new presentational components (header, footer,
hero, tile, banner, next-event card, events timeline, news card grid); 1 rewritten page (`/`);
1 new ICS route + pure lib; 2 pure selection/format libs (1 new, 1 extended); `PortalHeader`
retired across 5 pages; ~4 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle / Constraint | Compliance | Status |
|------------------------|------------|--------|
| I. Git is source of truth (AI artifacts) | No artifact content touched; frontpage reads News/Events and new chrome/frontpage globals only. | ✅ PASS |
| II. Payload owns context & native content | New editor-managed chrome/frontpage content is exactly the "native platform content" Payload legitimately owns; News/Events read-only reuse. | ✅ PASS |
| III. Every AI asset is an Artifact | No new asset types; nav items/tiles/chips are content, not artifacts, and are NOT forced into the artifact model. | ✅ PASS |
| IV. Stable artifact identity | Untouched (Registry reached by link only). | ✅ PASS |
| V. Git-centric, APM distribution | Untouched. | ✅ PASS |
| VI. Governance is the core value (Registry) | No governance surface changes; recommended-artifacts widget retirement removes a read-only display, bypasses nothing. | ✅ PASS |
| VII. Start simple, design for growth | Two globals instead of N collections; code-seeded defaults instead of seed migrations; pure selection helpers instead of new query layers; ICS = one pure lib + one route. Personalization, media uploads, i18n of chrome all deferred. | ✅ PASS |
| VIII. Two surfaces | Employee app gets read-only rendering; ALL authoring in Payload admin (globals editor). Update access gated server-side to Contributor+ (same `isEditor` posture as News/Events). | ✅ PASS |
| Design System (employee app) | ⚠ Deviation, justified: new components are custom presentational components styled with the **kihub token layer** rather than Designsystemet React primitives. See Complexity Tracking. | ⚠ JUSTIFIED |
| Auth (employees only, roles) | `(app)/layout.tsx` `requireSession()` unchanged; globals update rules enforced in Payload access (server-side). | ✅ PASS |
| Testing gate (new module) | New globals get an access-control integration test; pure ICS/selection/date logic gets failing-first unit tests. | ✅ PASS |
| Contract-first | Global shapes + frontpage read contract + ICS contract documented in `contracts/`; global shape changes henceforth follow the contract-versioning rule. | ✅ PASS |

**Result**: One justified deviation (Design System brand layer) recorded in Complexity Tracking
with a recommended constitution amendment; all other gates pass. Re-checked after Phase 1 design —
unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/011-frontpage-redesign/
├── plan.md              # This file
├── research.md          # Phase 0 decisions (globals shape, defaults, ICS, chronology, chrome swap, DS deviation)
├── data-model.md        # Phase 1 — site-chrome + frontpage globals, read shapes, selection contracts
├── quickstart.md        # Phase 1 — end-to-end validation scenarios
├── contracts/
│   ├── site-content-globals.md   # global field shapes, access rules, seeded defaults, versioning
│   ├── frontpage-read.md         # section-by-section read contract: sources, ordering, caps, empty states
│   └── event-ics.md              # /events/[slug]/ics response contract
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      globals/
        SiteChrome.ts               # NEW: `site-chrome` global — header nav items[], footer (contact, links[]); isEditor update gate
        Frontpage.ts                # NEW: `frontpage` global — hero group, tiles[2], subscriptions banner group; isEditor update gate
      payload.config.ts             # CHANGED: register `globals: [SiteChrome, Frontpage]`
      app/
        (app)/
          layout.tsx                # CHANGED: renders SiteHeader + SiteFooter around {children} (chrome on every employee page)
          page.tsx                  # CHANGED (rewrite): the frontpage — Hero, tiles, banner, events section, news section
          events/[slug]/ics/route.ts # NEW: ICS download route ("+ Legg til i kalender")
          registry/ news/ events/ artifacts/  # CHANGED (light): drop per-page <PortalHeader /> (chrome now in layout)
      components/
        SiteHeader.tsx              # NEW (server): brand lockup, nav from global, search link, compact user/sign-out; hosts signOut action
        SiteNav.tsx                 # NEW (client): the only client piece — accessible mobile menu toggle (aria-expanded)
        SiteFooter.tsx              # NEW (server): inverted surface — brand, contact block, link list from global
        FrontpageHero.tsx           # NEW: eyebrow, headline + accent word, lead, CTA pair, illustration slot
        FrontpageTile.tsx           # NEW: .kihub-tile — tag, title, arrow; whole tile one link
        SubscriptionsBanner.tsx     # NEW: tinted banner — eyebrow, heading, description, chips
        NextEventCard.tsx           # NEW: date numeral, weekday/time, tag, title, meta, "Se arrangementet", "+ Legg til i kalender"
        EventsTimeline.tsx          # NEW: dotted timeline rows — date, time, title, type · location
        FrontpageNewsCard.tsx       # NEW: image (or .kihub-media placeholder), date, serif title, summary
        PortalHeader.tsx            # REMOVED (replaced by SiteHeader/SiteFooter; sign-out + admin links move into SiteHeader)
        HomeWidget.tsx              # REMOVED (010 widget wrapper no longer used)
      lib/
        site-content.ts             # NEW (impure): getSiteChrome() / getFrontpageContent() — findGlobal + merge with code defaults
        site-content-defaults.ts    # NEW (pure): DEFAULT_SITE_CHROME / DEFAULT_FRONTPAGE (FR-012 seeded content)
        frontpage-select.ts         # NEW (pure): selectEventsSection(events, now) → {next, timeline[≤4]} chronological; selectLatestNews(news, 4) newest-first ignoring featured
        ics.ts                      # NEW (pure): buildEventIcs(event) → RFC 5545 text (escaping, UTC stamps, UID from slug)
        event-dates.ts              # CHANGED: add Oslo date-part helpers (day numeral, month+year, weekday, HH:mm, timeline "dd. MMM")
        home.ts / home-select.ts    # CHANGED: shrink to what remains (recommended-artifacts selection retired) or fold into frontpage-select
      styles/kihub/                 # (already imported — used, not modified here)
    tests/
      unit/
        frontpage-select.test.ts    # NEW (failing-first): chronology, caps, month-agnostic timeline, news latest-4
        ics.test.ts                 # NEW (failing-first): VCALENDAR/VEVENT fields, escaping, all-day/timed, UID stability
        event-dates.test.ts         # CHANGED: cover new date-part helpers
      integration/
        site-content-access.test.ts # NEW: globals access matrix + seeded-defaults read (constitution gate)
```

**Structure Decision**: Same monorepo, same `(app)` route group behind `requireSession()`. Chrome
moves from per-page `<PortalHeader />` composition into `(app)/layout.tsx`, so every employee page
gets the header/footer once and page files shed their header lines. Editor content is two Payload
**globals** (singletons — matching "fixed sections, dynamic content"), each with the same
`isEditor` access posture as News/Events; the employee app never reads globals directly from
components but through `lib/site-content.ts`, which merges code defaults so a fresh environment
renders completely (FR-012) and tests can assert the merge purely. All list logic that the design
needs but the read libs don't provide (strict chronology, latest-4) is in pure
`lib/frontpage-select.ts`, unit-tested without Payload — the same split Phases 8/10 used
(`event-dates.ts`, `home-select.ts`).

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New frontpage/chrome components use the kihub token layer (custom presentational components) instead of Designsystemet React primitives for their look | The approved visual direction (design project "KIHub Design System", imported `2b30418`) specifies serif display type, tile/banner/timeline layouts and button styling that Designsystemet React components cannot express without restyling them — which the constitution forbids more strongly than custom components. The kihub tokens ARE Digdir's accent/neutral scale values, so visual compatibility with Digdir services is preserved by construction. | (a) Restyling Designsystemet primitives — explicitly prohibited ("MUST NOT restyle or fork its primitives"). (b) Building the old layout with stock Designsystemet look — contradicts the user-approved design direction. **Follow-up**: propose a constitution PATCH/MINOR amendment recognizing the kihub brand layer as the sanctioned token source for employee-app presentational components. |

> **Resolved 2026-08-03 by constitution v3.0.0**: the Design System constraint was amended to
> Designsystemet's own foundation-plus-own-theme model (official theming pipeline via
> `designsystemet.config.json` + the kihub token layer bridged onto the generated theme). What
> this table records as a deviation is now the sanctioned pattern; no deviation remains.
