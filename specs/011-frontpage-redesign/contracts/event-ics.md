# Contract: Event ICS download

**Route**: `GET /events/[slug]/ics` (inside the `(app)` route group → session-gated by
`requireSession()` like every employee resource).

## Response

| Case | Status | Body / headers |
|---|---|---|
| Published event found | 200 | Body: RFC 5545 text from `buildEventIcs(event, baseUrl)`. Headers: `Content-Type: text/calendar; charset=utf-8`, `Content-Disposition: attachment; filename="<slug>.ics"` |
| Unknown slug or unpublished/draft event | 404 | Uses `getPublishedEventBySlug` — the published-only invariant is inherited, never re-implemented |

## ICS body (`lib/ics.ts`, pure)

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//KI Hub//Events//NB
BEGIN:VEVENT
UID:<slug>@kihub
DTSTAMP:<generation time, UTC basic format>
DTSTART:<startDateTime, UTC basic format>
DTEND:<endDateTime when present; omitted otherwise>
SUMMARY:<title>
LOCATION:<location, when present>
URL:<baseUrl>/events/<slug>
DESCRIPTION:<summary-ish: organizer / online URL when present>
END:VEVENT
END:VCALENDAR
```

Rules:
- CRLF (`\r\n`) line endings; lines folded at 75 octets per RFC 5545 §3.1.
- TEXT values escaped per RFC 5545 §3.3.11 (`\\`, `\;`, `\,`, `\n`).
- `UID` is stable per event (slug-derived) so re-downloads update rather than duplicate in
  calendar clients.
- Date-times emitted as UTC (`...Z` basic format) — clients localize; no VTIMEZONE needed.

## Test obligations

`tests/unit/ics.test.ts` (failing-first): structure (VCALENDAR/VEVENT envelope), UTC formatting,
optional DTEND/LOCATION omission, text escaping (commas/semicolons/newlines in titles), stable
UID, CRLF endings. Route behavior (200/404, headers) validated via quickstart.
