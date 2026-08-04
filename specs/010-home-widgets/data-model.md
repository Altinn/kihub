# Phase 1 Data Model: Home-Page Widgets

**No new entities, no schema change, no migration.** This feature stores nothing. It *reads* existing
content and renders it. This document records the **read shapes** the dashboard consumes and the
**pure selection contracts** applied to them.

## Consumed entities (all pre-existing, unchanged)

| Entity | Source (unchanged) | Read via | Visibility guarantee |
|--------|--------------------|----------|----------------------|
| **News** article | `news` collection (`specs/007-news/`) | `lib/news.ts::listPublishedNews()` | published-only, featured-first, newest-first — by construction |
| **Event** | `events` collection (`specs/009-calendar-events/`) | `lib/events.ts::listUpcomingEvents()` | published + upcoming only, featured-first, soonest-first — by construction |
| **Artifact** + **Governance** | `artifacts` + `catalog-entries` (`specs/002-catalog/`, `003-governance/`) | `lib/catalog.ts::listArtifacts()` (active-only) + `lib/governance.ts::getGovernance(artifactId)` | active-only; `Governance` exposes `featured` / `recommended` booleans + `lifecycleState` |

No field is added or modified on any of these. The dashboard is a consumer only.

## Read helpers (new, impure — `lib/home.ts`)

Thin composition over the existing reads; no new query semantics beyond composing them.

- `getHomeNews(limit = HOME_WIDGET_LIMIT): Promise<News[]>`
  → `takeTopN(await listPublishedNews(), limit)`
- `getHomeEvents(limit = HOME_WIDGET_LIMIT): Promise<Event[]>`
  → `takeTopN(await listUpcomingEvents(), limit)`
- `getHomeRecommendedArtifacts(limit = HOME_WIDGET_LIMIT): Promise<RecommendedArtifact[]>`
  → resolve `listArtifacts()`, attach `getGovernance(artifactId)` per artifact (the pattern the
    catalog page already uses), then `selectRecommendedArtifacts(entries, limit)`.

```
HOME_WIDGET_LIMIT = 3          // single shared cap for all three widgets (FR-002)

RecommendedArtifact = {
  artifact: { artifactId, name, type, description, tags }   // ArtifactCardData shape
  governance: Governance                                     // for LifecycleBadge (featured/recommended/lifecycleState)
}
```

## Pure selection contracts (new — `lib/home-select.ts`, unit-tested failing-first)

These are pure functions (no Payload, no I/O) so they unit-test in isolation (mirrors
`lib/event-dates.ts`).

### `takeTopN<T>(items: T[], n: number): T[]`
- Returns the first `n` items **in input order** (the read libs already apply featured-first +
  recency ordering, so "top N" = slice).
- `n <= 0` → `[]`; `items.length <= n` → all items; never mutates input.

### `selectRecommendedArtifacts(entries: RecommendedArtifact[], n: number): RecommendedArtifact[]`
- **Filter**: keep only entries where `governance.featured === true || governance.recommended === true`.
- **Order**: featured entries first (stable within the featured / non-featured groups, preserving the
  incoming `listArtifacts` name order) — mirrors how the news/events libs surface `featured`.
- **Cap**: at most `n`.
- No qualifying entries → `[]` (drives the Registry widget's empty state; note an "active but not
  featured/recommended" artifact does **not** appear — the widget curates, it is not "all artifacts").

## Validation / invariants

- **No draft/past/inactive leak**: guaranteed upstream by the read libraries (news/events published-
  only; events upcoming-only; artifacts active-only). The selection helpers never widen visibility —
  they only filter/slice what the libraries already returned.
- **Caps**: every widget shows ≤ 3 items (FR-002); fewer available → show only those (no padding).
- **Ordering**: featured-first in all three widgets; within groups, news newest-first, events
  soonest-first, artifacts by the `listArtifacts` order (name).
