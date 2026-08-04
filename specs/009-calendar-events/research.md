# Phase 0 Research: Calendar / Events

Resolves the Technical Context decisions for Phase 8. Every choice favors the simplest correct addition on
the existing foundation (Principle VII) that satisfies the native-content charter (Principle II) and the
two-surface split (Principle VIII). Phase 7 News (`specs/007-news/`) is the direct precedent; this document
notes where Events deliberately diverges from it. No `NEEDS CLARIFICATION` remain (all resolved in the
spec's Clarifications, Session 2026-07-23).

## §1 — Events as a native Payload collection (not an artifact)

**Decision**: Model events as a new `events` Payload collection, owned entirely by Payload, with no
relation to `artifacts`/`catalog-entries` and no Git source.

**Rationale**: The constitution explicitly names "Calendar / Events" as first-class native platform content
and carves it out of the artifact model (Principles I/II/III). A dedicated collection keeps the Registry
boundary clean and lets Events evolve its own fields (datetimes, location, organizer) without polluting the
artifact schema — the same path News took.

**Alternatives considered**: Reusing/extending `Artifact` — rejected (violates III; artifacts are
Git-derived, the opposite of authored native content). A separate service/app — rejected (events share the
same auth/roles/data layer and two-surface model).

## §2 — Published-only visibility for employees (US3, FR-003/006)

**Decision**: Enforce "only published events are visible to employees" at two layers, identical to News:
1. **Read library** (`lib/events.ts`): every employee-facing query includes
   `status: { equals: 'published' }`. The detail lookup is by slug AND `status: published`, so a
   draft/unknown slug resolves to nothing → the page returns 404.
2. **Collection `read` access rule**: non-editors are constrained to published —
   `read: ({ req }) => isEditor(req.user) ? true : { status: { equals: 'published' } }`. This protects the
   REST/GraphQL API surface so a Reader hitting the API directly also only ever sees published events.

**Rationale**: Layer 1 guarantees the employee pages are correct by construction; layer 2 is defense in
depth for the API/admin path (US3 covers list, detail, and direct access). Returning a `Where` constraint
from `access.read` is Payload's idiomatic way to scope readability by role. This is exactly the pattern
already proven in `collections/News.ts` + `lib/news.ts`.

**Note on scope**: the *draft* invariant is enforced at both layers. The *past-event* hiding is a
**list-only** concern (FR-004) applied in `lib/events.ts`'s list query, NOT in the access rule — a
published *past* event is still reachable by its detail URL (it is published; only the upcoming list
excludes it). This keeps "no draft leaks" and "list shows upcoming" as separate, correctly-scoped rules.

**Alternatives considered**: Only filtering in the page/query (no access constraint) — rejected as weaker
(the API path would expose drafts to a signed-in Reader). Payload drafts/versions feature — rejected as
heavier than needed; a simple `status` enum matches the spec and is testable.

## §3 — Authoring/publishing authorization: Contributor+ (FR-002/007)

**Decision**: Gate `create`/`update`/`delete` (and therefore publishing, which is setting `status`) to
**Contributor and above** via the same inline `isEditor` predicate News uses —
`Boolean(user) && (user.role as Role) !== 'reader'`. Events is **not** wired into
`@kihub/governance-core`'s permission matrix or lifecycle FSM.

**Rationale**: The governance-core actions are Registry semantics; overloading them for events would blur
the module boundary (Principles III/VI are Registry-scoped). A dedicated `role !== 'reader'` check expresses
exactly the clarified rule (Contributor+ author and publish; no separate publisher role) and matches the
Phase 6 back-office entry gate, which is already Contributor+. Enforced server-side by Payload for both the
admin UI and the API.

**Alternatives considered**: Add a `manage-events` permission to governance-core — rejected (expands a
Registry-scoped package for a native module with no current need). A separate publisher role — rejected per
the clarification.

## §4 — Slug identity for the detail URL (FR-005/013)

**Decision**: Add a `slug` text field — unique, indexed — derived from the title by a collection
`beforeValidate` hook when empty, **reusing the existing `slugify` from `lib/slug.ts`** (Phase 7,
Norwegian-aware: maps æ/ø/å, strips diacritics, hyphenates). Editable by an editor. The employee detail
route is `/events/[slug]`. Uniqueness is enforced by `unique: true` (DB constraint) + a friendly validation
message on collision. Route name is `/events` (clarified; mirrors `/news`).

**Rationale**: Human-readable, stable, shareable URLs for an internal portal (the clarified choice).
Reusing the proven `slugify` avoids duplicating logic and inherits its Norwegian handling and unit tests.

**Alternatives considered**: Opaque id in the URL — rejected in clarification. A new slug helper — rejected
(the Phase 7 one is already correct and shared).

## §5 — Date/time model, validation, and the "upcoming" rule (FR-004/011/015)

**Decision**:
- `startDateTime` is a required Payload `date` field (date+time). `endDateTime` is an optional `date`.
- **Validation** (FR-011): when `endDateTime` is present it MUST NOT precede `startDateTime`, rejected at
  authoring time via the collection's `beforeValidate` hook, delegating to a pure
  `validateEventInterval(start, end)` in `lib/event-dates.ts` (throws/returns an error message on
  violation). All-day (date-only) events are out of scope — every event carries a specific start time.
- **List "upcoming" rule** (FR-004): an event is *upcoming* (shown) when `(endDateTime ?? startDateTime) ≥
  now` — i.e. an event that has started but not yet ended still counts as upcoming; only fully-past events
  are hidden. Encoded as a pure `isUpcoming(event, now)` and as the read query's `where`. List order is
  **soonest-first** (ascending `startDateTime`), with featured events surfaced (featured-first, ascending
  within each group).
- **Timezone** (FR-015): all datetimes are interpreted and displayed in **Europe/Oslo**. Display uses
  `Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', … })` via a pure `formatEventWhen(start, end)`
  helper. No per-event timezone is stored.

**Rationale**: Factoring the three pure functions into `lib/event-dates.ts` makes the boundary logic
unit-testable without loading `@payload-config` (the same separation `lib/slug.ts` has from `lib/news.ts`),
satisfying the constitution's "new modules MUST test state/validation rules" gate with a fast unit test.
The `(end ?? start) ≥ now` upcoming rule matches the spec edge case ("an event whose start *and* end are in
the past is not listed") and behaves sensibly for in-progress events. Explicit `Europe/Oslo` formatting
makes an event's stated time unambiguous regardless of server/render locale (News only rendered a date, so
it never needed an explicit zone; timed events do).

**Alternatives considered**: `start ≥ now` as the upcoming rule — rejected (would hide an event the moment
it begins, even while it's still running). Storing a per-event timezone — rejected (speculative for an
internal Norwegian portal; Principle VII). A DB-level check constraint for end≥start — rejected (the
push-only repo has no migrations; a `beforeValidate` hook is the idiomatic, testable Payload place).

## §6 — Location shape: optional place + optional online URL (FR-001/005)

**Decision**: Model location as **two optional fields** — `location` (free-text place string) and
`onlineUrl` (URL text) — neither required. The detail page renders whichever are present (place, a link, or
both for hybrid events); the card shows a compact location hint.

**Rationale**: The clarified choice. Two plain optional fields cover in-person, online, and hybrid events
with zero new infrastructure and no forced value — the simplest honest model (Principle VII). Keeping them
as separate fields (rather than one overloaded string) lets the UI render a real link for the online case.

**Alternatives considered**: A single free-text location only — rejected (can't render a proper meeting
link). A structured venue/room sub-object or a Locations collection — rejected (speculative; YAGNI).

## §7 — Organizer attribution: free-text (FR-005; spec Key Entities)

**Decision**: Model `organizer` as an optional **free-text** string (e.g. "People & Culture", "AI Guild",
an external speaker's name), shown on the detail page. This **diverges from News**, whose `author` is a
`relationship → users`.

**Rationale**: An event's organizer is frequently a team/unit or an external party that has no KI Hub user
account, so a `users` relationship would be a poor fit and would force awkward data. Free-text is the
simplest model that always displays sensibly and makes the spec's "organizer no longer active" edge case
moot (there is no account to deactivate). Authorship/creator tracking is not a stated requirement for
events; if a creator audit is later needed, a `createdBy` user relationship is a clean additive seam.

**Alternatives considered**: `organizer → users` (as News's author) — rejected (excludes teams/externals;
adds a relationship with no clear need). A dedicated Organizers collection — rejected (speculative).

## §8 — Rich-text description authoring + rendering

**Decision**: The `description` is a Payload `richText` (lexical) field — the config already registers
`lexicalEditor()`. The employee detail page renders it server-side with `RichText` from
`@payloadcms/richtext-lexical/react` (already available). No separate plain summary field this phase (the
list card shows title + when + location rather than a text preview).

**Rationale**: Reuses the editor already wired into the platform and its official React renderer — no new
dependency, consistent authoring. Events are naturally identified in the list by *when/where* more than by
a prose blurb, so a News-style `summary` adds little; omit it (YAGNI) — it is a trivial additive field
later if wanted.

**Alternatives considered**: Markdown description — rejected (native authoring is better served by the
WYSIWYG lexical editor already present). A `summary` field — deferred (not needed for a when/where-led card).

## §9 — Employee pages, navigation, and data access

**Decision**: Add two server components under the existing protected employee group:
`(app)/events/page.tsx` (list) and `(app)/events/[slug]/page.tsx` (detail), reading through a new
`lib/events.ts` (`listUpcomingEvents()`, `getPublishedEventBySlug(slug)`) that uses the Payload local API
exactly like `lib/news.ts`. The list sorts soonest-first by `startDateTime` with featured events surfaced;
an empty upcoming set renders a friendly Designsystemet empty state. Add an **"Events"** link beside the
existing **"News"** link in the home page header block (`(app)/page.tsx`) — there is no separate shared
header/shell component; that is where the News link lives.

**Rationale**: Reuses the established server-component + local-API read pattern and the `(app)` group's
`requireSession()` gate (only employees read events, no new auth code). Designsystemet components keep the
employee surface on-brand (Principle VIII / Design-System mandate). Placing the nav link where News's link
already is keeps navigation consistent (FR-014) without introducing new shell structure.

**Alternatives considered**: Client-side fetching via the REST API — rejected (server components + local API
are the established, simpler pattern). A shared header component refactor — rejected (out of scope; would
touch shared layout beyond this additive module).

## §10 — Schema & types (no migration — push-only repo)

**Decision**: Registering the collection makes Payload's dev schema-push create the `events` table
automatically (as with every prior collection); regenerate `payload-types.ts` with
`pnpm --filter web payload generate:types`. **Do NOT create a migration** — the repo has no `migrations/`
directory and has always run push-only (News shipped this way). The admin import map is unaffected (Events
adds no custom admin components).

**Rationale**: Matches how every prior phase evolved the schema and the project's stated convention
(push-only dev schema). This is the one place Events deliberately does *not* follow the News plan's prose
(which mentioned a prod-parity migration that was never actually created); it follows the repo's real,
consistent practice instead.

**Alternatives considered**: Generating a one-off migration — rejected (inconsistent with the repo; no
migrations infrastructure exists).

## Resolved unknowns

All Technical Context items are resolved. Phase 8 adds: one `events` collection (native content, slug +
lexical description + start/optional-end datetimes + optional location + optional online URL + free-text
organizer + status + tags + featured), a `lib/events.ts` read layer (published + upcoming only), a pure
`lib/event-dates.ts` (validation, upcoming predicate, Oslo formatting), two Designsystemet employee pages +
a card + a nav link, and access/visibility/date tests — reusing the Entra auth, five-role model, Phase 6
back-office, Phase 7 `slugify`, the lexical editor, and the Payload/PostgreSQL data layer unchanged. No new
dependency, datastore, external service, or migration.
