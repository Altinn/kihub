# Contract: /events page UI (URL, views, components)

## URL contract (FR-001/005/006/018)

| State | Param | Example | Fallback |
|---|---|---|---|
| Active view | `view` | `/events?view=kalender` | absent/unknown → liste |
| Calendar month | `month` | `/events?view=kalender&month=2026-08` | malformed/absent → current Oslo month |
| TYPE filter (multi) | `type` (repeat) | `/events?type=webinar&type=kurs` | unknown values ignored |
| FORM filter (single) | `form` | `/events?form=digitalt` | unknown/absent → Alle |

Filters apply to the list view; `view=kalender` ignores `type`/`form` (legend instead).
"Nullstill filtre" links to `/events`. All state changes are plain links — the page works with
client-side scripting disabled (SC-004).

## Page composition (`(app)/events/page.tsx`, server component)

```
<header>  kihub-h1 "Arrangementer"  +  <EventsViewToggle/>          (.ev-head)
liste:    <EventsFilters/> sidebar  |  <EventsDayList/>             (.ev-layout: ~260px | 1fr)
kalender: <month nav ‹ › + title> + <legend> + <EventsMonthCalendar/>
```

## Components (server, presentational, token-only styling)

- **EventsViewToggle** — two links "Kalender" / "Liste"; active gets `aria-current="page"` and
  the raised segment treatment; hrefs preserve nothing but the view (switching views resets
  month/filters deliberately — each view owns its params).
- **EventsFilters** — `<nav aria-label="Filtrer arrangementer">`; TYPE group: five
  checkbox-styled links (`aria-pressed`), each toggles its value in `type[]`; FORM group:
  four radio-styled links (Alle first, `aria-pressed`), single-valued; "Nullstill filtre"
  link shown when any filter is active. Eyebrow-style group headings (TYPE / FORM).
- **EventsDayList** — for each day group: a date chip (`.ev-datechip`, tinted surface,
  "Fredag 3. juli") then rows: `HH:mm` (Inter, subtle) · title (Source Serif, links to
  detail) · meta line (`placeText · channel? · seatsText`) · `<EventTypeBadge/>` · `→`
  affordance. Empty states: no events → "Ingen kommende arrangementer."; active filters →
  "Ingen arrangementer matcher filtrene." + reset link.
- **EventsMonthCalendar** — `<table>` semantics (weekday `<th scope="col">` MAN–SØN);
  6×7 cells; adjacent-month cells `.ev-cell--dim`; today `.ev-cell--today` (accent ring/disc
  on the day number); each entry an `<a>` with type-colored dot + `HH:mm` + truncated title,
  `aria-label="{title}, {type}, {time}"`; > 3 entries → 3 + `"+N flere"` text. Legend above:
  five swatch+label pairs (swatch = `--ev-cat-*` dot, label = type name). Month nav: `‹`/`›`
  links (`aria-label="Forrige måned"/"Neste måned"`) + `formatMonthTitle` heading.
- **EventTypeBadge** — `<span>` uppercase Inter 12px on the type's tinted surface,
  text `--kihub-text`.

## Detail page (`(app)/events/[slug]/page.tsx`) — FR-013/014

kihub-restyled, Norwegian: "← Til arrangementer" back link, `EventTypeBadge`, kihub-h1 title,
when (formatEventWhen) · organizer, meta block (place/format, channel, onlineUrl "Delta
digitalt", seatsText), "+ Legg til i kalender" → `/events/<slug>/ics` (existing route,
unchanged), `kihub-prose` rich text. Draft/unknown → 404 (unchanged).

## Frontpage touch (FR-015)

`NextEventCard` + `EventsTimeline`: replace `event.tags?.[0]` with
`EVENT_TYPE_LABELS[event.eventType]`. No other change; ICS link and selection logic untouched.

## Categorical color tokens (research §3)

Defined in `portal.css` events block; components never use raw hex:

```css
--ev-cat-webinar: var(--kihub-accent);        --ev-cat-webinar-surface: var(--kihub-surface-accent);
--ev-cat-verksted: var(--kihub-warning);      --ev-cat-verksted-surface: var(--kihub-warning-surface);
--ev-cat-kurs: var(--kihub-success);          --ev-cat-kurs-surface: var(--kihub-success-surface);
--ev-cat-konferanse: var(--kihub-danger);     --ev-cat-konferanse-surface: var(--kihub-danger-surface);
--ev-cat-internt: var(--kihub-text-subtle);   --ev-cat-internt-surface: var(--kihub-bg-tinted);
```

Accessibility invariants: color never sole carrier (SC-007); badges keep `--kihub-text` on
tinted surfaces (AA); focus ring never removed; toggle/filters expose state via
`aria-current`/`aria-pressed`.
