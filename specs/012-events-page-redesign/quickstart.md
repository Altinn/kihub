# Quickstart: Events Page Redesign (Kalender + Liste)

Validation guide for 012. Contracts: [events-collection-v2](contracts/events-collection-v2.md),
[events-read](contracts/events-read.md), [events-page-ui](contracts/events-page-ui.md).

## Prerequisites

```bash
colima start && docker compose up -d          # local Postgres (from repo root)
pnpm install
source apps/web/.env                          # test/dev env vars
pnpm --filter web dev                         # push mode syncs the new columns
```

## Automated validation

```bash
source apps/web/.env && pnpm --filter web test
```

Expected: full suite green (141 pre-existing + new `unit/events-view.test.ts` and the extended
`integration/events-access.test.ts` cases). Type check via `pnpm --filter web build`.

## Manual scenarios

Seed via `/cms` (Contributor+): create events covering each type, each format, one with
capacity 24 / seatsTaken 15, one with no capacity, one multi-day span, one draft, one in a past
week of the current month, two on the same day.

1. **List default** — open `/events`: grouped date chips ("Fredag 3. juli" style), rows show
   HH:mm, title, meta (place · channel · "9 av 24 plasser igjen" / "Åpen for alle"), type
   badge, arrow. Draft and fully-past events absent. Norwegian copy only.
2. **Filters** — check `?type=webinar&type=kurs` shows only those; `?form=digitalt` narrows;
   combined filters AND; "Nullstill filtre" returns to `/events`; nonsense values ignored;
   impossible combination shows "Ingen arrangementer matcher filtrene."
3. **No-JS** — disable JavaScript: toggle, filters, month nav still work (plain links).
4. **Calendar** — `/events?view=kalender`: Monday-first grid, MAN–SØN headers, month title,
   today highlighted, adjacent-month days dimmed, legend maps five types to five colors,
   past-in-month event visible, multi-day event in every spanned cell, 4+ events on one day →
   3 + "+N flere". Entries link to detail pages.
5. **Month nav** — `‹`/`›` update `?month=YYYY-MM`; URL is shareable; `?month=garbage` falls
   back to the current month.
6. **Detail** — restyled kihub page: type badge, when/where/form/channel/seats, organizer,
   "+ Legg til i kalender" downloads the same ICS as before, "← Til arrangementer" back link.
   Draft slug → 404.
7. **Frontpage regression** — `/` "Hva skjer i BOD" still renders; cards show the event-type
   label where `tags[0]` used to be; ICS link works.
8. **Backfill** — an event created before 012 (or with the new fields cleared) renders as
   Internt / inferred format / "Åpen for alle" in both views.

## Production migration check

```bash
pnpm --filter web migrate                     # against a production-like DB
```

Expected: `events_type_format_capacity` applies after the baseline; existing rows get
`event_type='internt'`, inferred `format`, NULL capacity.
