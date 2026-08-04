# Contract: employee events read surfaces

How employees read events in the Designsystemet app. Lives in `apps/web/src/lib/events.ts` (server-side
reads) with pure helpers in `apps/web/src/lib/event-dates.ts`, and pages in
`apps/web/src/app/(app)/events/`. Protected by the existing `(app)/layout.tsx` `requireSession()` gate —
only signed-in employees reach these routes.

## Read library (`lib/events.ts`)

```ts
// Published-only by construction (mirrors lib/news.ts). The LIST additionally hides past events.
listUpcomingEvents(): Promise<Event[]>
// published AND upcoming ((end ?? start) >= now); soonest-first by startDateTime; featured surfaced.

getPublishedEventBySlug(slug: string): Promise<Event | null>
// returns the event ONLY if status = published; otherwise null (-> 404).
// NOT filtered by past/upcoming: a published PAST event is still reachable by direct URL (research §2).
```

- Both queries include `status: { equals: 'published' }`. A draft or unknown slug resolves to `null`.
- The list query also constrains to upcoming: `(endDateTime >= now) OR (endDateTime is null AND
  startDateTime >= now)`, then sorts ascending by `startDateTime`; featured events are surfaced ahead
  (stable featured-first sort, mirroring `lib/news.ts`).
- Uses the Payload local API (`getPayload({ config })`) with `overrideAccess: true`, consistent with
  `lib/news.ts`/`lib/catalog.ts`.

## Pure helpers (`lib/event-dates.ts`) — unit-tested

```ts
validateEventInterval(start: string, end?: string | null): void   // throws if end < start (FR-011)
isUpcoming(event: {startDateTime: string; endDateTime?: string | null}, now: Date): boolean  // (end ?? start) >= now
formatEventWhen(start: string, end?: string | null): string        // nb-NO / Europe/Oslo display (FR-015)
```

## Routes

| Route | Renders | Notes |
|-------|---------|-------|
| `/events` | `(app)/events/page.tsx` | List of published **upcoming** events, soonest-first, featured surfaced; friendly empty state when none upcoming |
| `/events/<slug>` | `(app)/events/[slug]/page.tsx` | Event detail: title, when (start + end if set, Europe/Oslo), location + online link (if set), organizer, rich-text description, tags; `notFound()` for a draft/unknown slug |

- New routes do not collide with `/`, `/artifacts/*`, `/news/*`, `/admin/*`, `/signin`, or `/cms`.
- The home page header block gains an "Events" link beside the existing "News" link (FR-014).

## Rendering

- List items use a Designsystemet `EventCard` (title, when via `formatEventWhen`, location hint, tags,
  featured marker).
- The detail description (lexical JSON) is rendered with `RichText` from
  `@payloadcms/richtext-lexical/react`. The online URL, when present, renders as a link.
- The employee UI is Designsystemet throughout (Principle VIII / Design-System mandate).

## Observable outcomes (map to FR-004/005/006/010/012/014/015, US1/US3)

| Situation | Expected |
|-----------|----------|
| Employee opens `/events` with published upcoming events | List shows them soonest-first; featured surfaced |
| Employee opens `/events` with a published PAST event only | That event is absent from the list (empty state if nothing upcoming) |
| Employee opens `/events` with none published/upcoming | Friendly empty state (not an error/blank) |
| Employee opens `/events/<published-slug>` | Detail renders title / when (Oslo) / location+link / organizer / description |
| Employee opens `/events/<draft-or-unknown-slug>` | `notFound()` — no draft content exposed |
| Editor publishes, then employee reloads `/events` | New (upcoming) event appears (no redeploy) |
| Editor unpublishes, then employee reloads | Event gone from the list; its detail URL 404s |
| Unauthenticated visit to `/events` | Redirected to sign-in by `(app)/layout.tsx` (employees only) |
