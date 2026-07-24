# Contract: Home Dashboard (`/`)

The employee-app landing route `/` (`app/(app)/page.tsx`), behind the existing
`(app)/layout.tsx` `requireSession()` gate. No query params are interpreted (it does **not** branch on
`q` — search lives on `/registry`).

## Rendered structure

A `PortalHeader` (see `registry-route.md`) followed by three `HomeWidget`s, in order:

| Widget | Source read | Cap | Ordering | Card | "View all →" |
|--------|-------------|-----|----------|------|--------------|
| **News** | `getHomeNews(3)` → `listPublishedNews` | 3 | featured-first, newest-first | `NewsCard` | `/news` |
| **Events** | `getHomeEvents(3)` → `listUpcomingEvents` | 3 | featured-first, soonest-first | `EventCard` | `/events` |
| **Registry** | `getHomeRecommendedArtifacts(3)` → `listArtifacts` + `getGovernance` + `selectRecommendedArtifacts` | 3 | featured-first | `ArtifactCard` (+ `LifecycleBadge`) | `/registry` |

## `HomeWidget` wrapper contract

Props: `title` (string), `viewAllHref` (string), `viewAllLabel` (default `"View all →"`),
`isEmpty` (boolean), `emptyMessage` (string), `children` (the card list).
- Renders a Designsystemet heading (`title`) and a link to `viewAllHref`.
- When `isEmpty`, renders `emptyMessage` in a friendly card/paragraph — **never** an error or a blank
  gap (FR-005). The "View all →" link is still shown (the module may have a full list even when the
  widget's curated slice is empty; e.g. Registry has active artifacts but none featured).
- Otherwise renders `children`.

## Behavior guarantees

- **Access**: only signed-in employees reach `/`; every role (incl. Reader) sees the same dashboard
  (FR-006). Unauthenticated → redirected to `/signin` by the layout (unchanged).
- **Visibility**: no draft news, no draft/ended event, no inactive artifact ever appears — enforced by
  the read libraries, not by dashboard code (FR-004, SC-003).
- **Empty states**: each widget independently shows its friendly empty state when its slice is empty
  (SC-004). All three empty simultaneously still renders a clean page.
- **Caps**: ≤ 3 items per widget; 1–2 items render without padding/placeholder rows (FR-002).
- **Designsystemet only** (FR-007); cards reused as-is.
- **Links**: news → `/news`, events → `/events`, Registry → `/registry`; each card links to its
  detail as it already does (`/news/<slug>`, `/events/<slug>`, `/artifacts/<id>`).

## Acceptance mapping

- US1 AS1–AS5 → the three widgets + their "View all →" targets + Designsystemet rendering.
- US2 AS1–AS5 → draft/past/inactive exclusion + three independent empty states.
