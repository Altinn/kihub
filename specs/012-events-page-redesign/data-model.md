# Data Model: Events Page Redesign (Kalender + Liste)

**Feature**: 012-events-page-redesign | **Date**: 2026-08-05

## Event (existing collection `events`, extended)

Unchanged fields (009/011): `title` (text, required), `slug` (text, unique, indexed,
auto-derived), `description` (richText, required), `startDateTime` (date, required),
`endDateTime` (date, optional, ≥ start), `location` (text, optional), `onlineUrl` (text,
optional), `organizer` (text, optional), `status` (select draft|published, default draft),
`tags` (text hasMany), `featured` (checkbox, default false).

### New fields

| Field | Type | Required | Default | Constraints / notes |
|---|---|---|---|---|
| `eventType` | select | yes | `internt` | Options: `webinar`, `verksted`, `kurs`, `konferanse`, `internt`. Drives badge, calendar color, TYPE filter. |
| `format` | select | yes | `digitalt` | Options: `digitalt`, `oppmote`, `hybrid` (ASCII values; label "Oppmøte"). Drives FORM filter and "Digitalt" place text. |
| `channel` | text | no | — | Delivery channel shown in the meta line when digital/hybrid (e.g. "Teams"). |
| `capacity` | number | no | — | Integer ≥ 1. Present ⇒ seat availability shown; absent ⇒ "Åpen for alle". |
| `seatsTaken` | number | no | — | Integer ≥ 0. Only meaningful when `capacity` set; MUST be ≤ `capacity` (FR-012). |

### Enums and display labels (single source: `lib/events-view.ts`)

```
EVENT_TYPES:   webinar → "Webinar"   verksted → "Verksted"   kurs → "Kurs"
               konferanse → "Konferanse"   internt → "Internt"
EVENT_FORMATS: digitalt → "Digitalt"   oppmote → "Oppmøte"   hybrid → "Hybrid"
```

Calendar categorical colors (research §3): webinar→accent, verksted→warning, kurs→success,
konferanse→danger, internt→neutral — as `--ev-cat-*` aliases, never raw hex.

### Validation rules

1. `endDateTime` ≥ `startDateTime` (existing, `validateEventInterval`).
2. `capacity`, when set: integer, ≥ 1 (field-level `min: 1` + integer check).
3. `seatsTaken`, when set: integer, ≥ 0.
4. `seatsTaken` ≤ `capacity` when both set; `seatsTaken` without `capacity` is stored but has
   no display effect ("Åpen for alle" — capacity is the switch). Enforced in the collection's
   `beforeValidate` hook via pure `validateSeatCapacity(capacity, seatsTaken)`.
5. Access rules unchanged: read = published-only for non-editors; create/update/delete =
   Contributor+ (`role !== 'reader'`), server-enforced.

### Derived display values (pure functions, not stored)

- `seatsText(capacity, seatsTaken)`:
  - no capacity → `"Åpen for alle"`
  - remaining = max(0, capacity − (seatsTaken ?? 0)); remaining = 0 → `"Fullt"`
  - else → `"{remaining} av {capacity} plasser igjen"`
- Place text: `format === 'digitalt'` → `"Digitalt"`, else `location` (falling back to
  `"Digitalt"` when hybrid/oppmøte has no location and an onlineUrl exists — never blank).
- Meta line: `place · channel? · seatsText` (no dangling separators, existing pattern).

### Backfill (FR-010, migration `events_type_format_capacity`)

| Existing data | eventType | format | capacity |
|---|---|---|---|
| any | `internt` (column default) | see below | NULL → "Åpen for alle" |
| `location` AND `onlineUrl` | | `hybrid` | |
| `location` only | | `oppmote` | |
| `onlineUrl` only / neither | | `digitalt` | |

## Events page view state (URL, not persisted)

| Param | Values | Fallback (FR-018) |
|---|---|---|
| `view` | `kalender` | anything else / absent → list view |
| `month` | `YYYY-MM` (calendar only) | malformed/absent → current Oslo month |
| `type` | repeatable, each ∈ EVENT_TYPES | unknown values ignored |
| `form` | ∈ EVENT_FORMATS | unknown/absent → Alle (no constraint) |

## Calendar grid cell (computed, `buildMonthGrid`)

`{ dayKey: 'YYYY-MM-DD' (Oslo), dayNumber: 1–31, inMonth: boolean, isToday: boolean }` ×
6 weeks × 7 days, Monday-first. Events are placed by intersecting each event's
`eventDayKeys(event)` (start→end Oslo days, inclusive) with cell `dayKey`s; a cell renders at
most 3 entries + `"+N flere"`.
