# Research: Frontpage Redesign

Phase 0 decisions. No NEEDS CLARIFICATION markers remained after `/speckit-clarify`; the decisions
below resolve the technical unknowns the spec leaves open.

## 1. Editor-managed content: Payload globals (2), not collections

**Decision**: Store chrome + frontpage content in two Payload **globals**: `site-chrome` (header
nav items, footer contact + links) and `frontpage` (hero, two tiles, subscriptions banner).

**Rationale**: The spec is explicit that sections are *fixed* while their *content* is dynamic —
the singleton shape of a global models that exactly (no counts to police, no orphan rows). Arrays
inside globals (nav items, chips, footer links) give editors add/reorder/remove in the admin UI
for free, with `minRows`/`maxRows` enforcing the fixed tile count (2). Two globals rather than one
because they have different blast radii (chrome renders on every page; frontpage only on `/`) and
editors think of them separately. Access mirrors News/Events: `read: () => true` (the app is
already session-gated; drafts don't exist for globals), `update: isEditor` — the same
Contributor+ posture, enforced server-side (Principle VIII).

**Alternatives considered**: (a) A `navigation-items` collection + a `footer-links` collection +
a `frontpage` global — more admin surface, referential plumbing, and count policing for zero
benefit at this scale. (b) One mega `site-settings` global — couples every-page chrome edits to
frontpage edits and makes the admin form unwieldy. (c) Code-only content — fails FR-011 (the whole
point is no-deploy edits).

## 2. Seeded defaults: code-level merge, not DB seeding

**Decision**: `lib/site-content-defaults.ts` exports typed `DEFAULT_SITE_CHROME` /
`DEFAULT_FRONTPAGE` objects (Norwegian content mirroring the old site: nav Hjem/KI Læring/
Prosjekter/Nyheter/Verktøy/Om KITT as applicable to existing routes, tiles Katalog→/registry &
Oversikt→prosjekter destination, GitHub Copilot + Claude Teams chips, kitt@digdir.no contact).
`lib/site-content.ts` reads the global and **falls back per-section** to defaults when the global
is unset/empty.

**Rationale**: FR-012 demands a complete first render on a fresh environment. Payload's
field-level `defaultValue` only materializes when a document is first *saved* in the admin, so an
untouched environment would render empty sections — the exact failure FR-012 forbids. A code merge
is deterministic, needs no seed migration/script ordering, and is purely unit-testable. Per-section
(not per-field) fallback keeps merge semantics simple and predictable for editors: once you save a
section with content, you own all of it.

**Alternatives considered**: (a) Seed script/migration — another moving part per environment, and
the repo's convention (Phases 7/8) has no committed migrations to hang it on. (b) Payload
`defaultValue`s alone — insufficient (above), though we still set them so the admin form starts
pre-filled with the same defaults (single source: the defaults module).

## 3. "+ Legg til i kalender": pure ICS generator + route handler

**Decision**: `lib/ics.ts::buildEventIcs(event)` produces an RFC 5545 `VCALENDAR`/`VEVENT` string
(UID = `<slug>@kihub`, `DTSTART`/`DTEND` as UTC stamps, `SUMMARY`/`LOCATION`/`URL`/`DESCRIPTION`
with proper text escaping and CRLF line endings). A route handler at
`app/(app)/events/[slug]/ics/route.ts` serves it as `text/calendar` with a
`Content-Disposition: attachment; filename="<slug>.ics"` header, 404 for unknown/unpublished
slugs (it reuses `getPublishedEventBySlug`, so the published-only invariant holds).

**Rationale**: Phase 8 shipped no calendar-file capability (verified: no ICS code in the repo), so
the spec's assumption "reuse if present, otherwise add" resolves to *add*. ICS is a tiny stable
text format — a dependency (e.g. `ics` npm) would violate the no-new-deps posture for ~40 lines of
pure, unit-testable code. Living under `(app)` keeps it behind `requireSession()` like every other
employee resource.

**Alternatives considered**: (a) `ics` npm package — new dependency for trivial output. (b)
Client-side data-URI generation — needs client JS and duplicates event data into the DOM. (c)
Google/Outlook deep links — ties an internal portal to external calendar products; a standards
file works with all of them.

## 4. Section ordering: pure chronological re-selection over the existing read libs

**Decision**: Keep `listUpcomingEvents` / `listPublishedNews` unchanged (they return
featured-first for the /events and /news pages). New pure `lib/frontpage-select.ts`:
`selectEventsSection(events, now)` re-sorts by `startDateTime` ascending and partitions into
`{ next: Event | null, timeline: Event[] (≤4) }` regardless of calendar month (clarification);
`selectLatestNews(news, 4)` re-sorts by `publishDate` descending ignoring the `featured` boost
(FR-008 says *most recently published*).

**Rationale**: Changing the shared read libs' ordering would silently reorder the /events and
/news pages (out of scope); a parameter would fork their contracts. Pure selection over
already-visibility-filtered lists is the exact pattern 010 established (`home-select.ts`) and unit
tests it without Payload. The "Utover måneden" label is kept as designed; the clarified rule
(next 4, month-agnostic) is a selection rule, not a label change.

**Alternatives considered**: (a) New Payload queries with `sort` params — more IO paths to test
for identical data. (b) Reusing the featured-first order — violates FR-006/FR-008 and the
clarified timeline rule.

## 5. Chrome placement: `(app)/layout.tsx`, retiring per-page `PortalHeader`

**Decision**: `SiteHeader` + `SiteFooter` render once in `(app)/layout.tsx` around `{children}`.
`PortalHeader` is deleted; the five pages that composed it just drop that line. The header keeps
the capabilities `PortalHeader` carried — compact signed-in identity, sign-out (server action),
and the admin-only links — folded into its right-hand cluster next to the search affordance, so no
existing affordance regresses. The `(auth)/signin` page keeps its own chrome-less layout.

**Rationale**: The clarification says the new chrome replaces the old on **all** employee pages —
the layout is the one place that guarantees "every page, exactly once" and removes five duplicated
composition points. Sign-out/admin affordances exist today and are not spec'd away; dropping them
would be a regression outside this feature's scope.

**Alternatives considered**: Per-page composition (status quo) — repetitive and driftable; the
010 plan already noted the header belongs to shared chrome.

## 6. Mobile menu: one small client component

**Decision**: `SiteNav.tsx` is the feature's only client component: a hamburger `<button>` with
`aria-expanded`/`aria-controls` toggling the nav list; nav data arrives as props from the server
`SiteHeader`. Desktop renders the horizontal list without the toggle (CSS breakpoint).

**Rationale**: FR-013 requires an accessible collapse; a `<details>`-only approach has known
keyboard/AT inconsistencies for site navigation and styles poorly across browsers. Everything else
on the page stays server-rendered.

**Alternatives considered**: CSS-only checkbox hacks (inaccessible), `<details>/<summary>`
(semantics mismatch for nav), a menu library (new dependency).

## 7. Search affordance: link to `/registry`

**Decision**: The header's search icon/button is a plain link to `/registry` (which owns
`SearchBar` + full-text search), labeled "Søk".

**Rationale**: The portal's only search today is the Registry's (Phase 5). A header-embedded live
search box or overlay is real scope (results surface, keyboard interactions) not requested by the
spec. The affordance satisfies FR-009 ("leads to the portal search") minimally.

**Alternatives considered**: Inline search input in the header (new results UX, out of scope);
search overlay/modal (client JS + focus-trap complexity, out of scope).

## 8. Design-system posture: kihub token layer as the styling source

**Decision**: All new components style exclusively with `--kihub-*` tokens / `.kihub-*` classes
(the imported design system). Designsystemet CSS stays globally loaded; existing pages keep their
Designsystemet React components untouched. The deviation from "employee UI MUST be built with
Designsystemet React components" is recorded in plan.md Complexity Tracking with a recommended
constitution amendment (the kihub tokens are Digdir accent/neutral scale values, so cross-service
visual compatibility — the constraint's purpose — is preserved).

**Rationale**: The user-approved design direction cannot be expressed by stock Designsystemet
components without restyling them, which the constitution forbids outright; honest custom
components on a Digdir-derived token layer are the compliant-in-spirit path.

**Alternatives considered**: documented in Complexity Tracking (restyling primitives — prohibited;
stock look — contradicts approved design).

## 9. specs/010 retirement scope

**Decision**: `/` page rewritten; `HomeWidget.tsx` deleted; `lib/home.ts`'s
`getHomeRecommendedArtifacts` + `lib/home-select.ts::selectRecommendedArtifacts` (and their tests)
deleted; what remains of home read/selection folds into `lib/site-content.ts` /
`lib/frontpage-select.ts`. `/registry`, `/news`, `/events` pages and their read libs are untouched
except for dropping the per-page header line (research §5).

**Rationale**: The spec replaces the widgets dashboard wholesale; keeping dead widget plumbing
around contradicts the repo's "retire what's replaced" precedent (008 reconcile). The
010 invariants that still matter (latest news reachable from `/`, upcoming events reachable from
`/`) are re-covered by the new sections' tests.

## 10. Hero illustration: static code asset slot

**Decision**: The hero's illustration slot renders a static asset from `apps/web/public/` (or an
inline SVG component), not CMS-managed media. The slot degrades gracefully (hero text grid works
with the slot empty).

**Rationale**: The repo has no upload/Media collection (news images are URL strings); introducing
file uploads for one decorative image is out of proportion (Principle VII). Final artwork is
explicitly "provided later" per the spec's assumption.

**Alternatives considered**: Payload upload collection + Azure Blob wiring — real infrastructure
for a decoration; URL-string field in the `frontpage` global — possible later without schema
ceremony if editors ever need to swap the artwork.
