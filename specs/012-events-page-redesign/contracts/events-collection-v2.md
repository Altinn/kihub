# Contract: `events` collection v2 (012 extension)

Extends the 009 collection contract (`specs/009-calendar-events/contracts/events-collection.md`).
All 009 guarantees hold unchanged (slug derivation/uniqueness, interval validation, draft
default, Contributor+ writes, published-only reads for non-editors).

## New fields

```ts
{ name: 'eventType', type: 'select', required: true, defaultValue: 'internt',
  options: ['webinar', 'verksted', 'kurs', 'konferanse', 'internt'] }
{ name: 'format', type: 'select', required: true, defaultValue: 'digitalt',
  options: ['digitalt', 'oppmote', 'hybrid'] }   // label "Oppmøte" on oppmote
{ name: 'channel', type: 'text' }                 // optional, e.g. "Teams"
{ name: 'capacity', type: 'number', min: 1 }      // optional, integer
{ name: 'seatsTaken', type: 'number', min: 0 }    // optional, integer
```

## Validation (beforeValidate, additive to 009)

- `capacity`/`seatsTaken` must be integers within their `min` bounds when present.
- `seatsTaken > capacity` (both present) → validation error with an editor-friendly message.
- Implemented via pure `validateSeatCapacity(capacity?, seatsTaken?)` exported from
  `src/lib/events-view.ts` (throws like `validateEventInterval`).

## Migration contract

- New migration `events_type_format_capacity` registered in `src/migrations/index.ts`,
  bundled into `prodMigrations` (boot-time, Phase B seam).
- Adds the five columns; `event_type` and `format` NOT NULL with defaults
  (`'internt'`, `'digitalt'`).
- Backfills `format` by inference before the feature reads it:
  `location AND online_url → 'hybrid'; location only → 'oppmote'; else 'digitalt'`.
- Down migration drops the columns (and enum types).
- Local dev: push mode picks the fields up automatically; the migration is a production
  concern (never runs locally in dev).

## Invariants

- Pre-existing events render in both views with defaulted values and "Åpen for alle" (SC-005).
- `payload-types.ts` regenerated; `Event` gains `eventType`, `format`, `channel?`,
  `capacity?`, `seatsTaken?`.
