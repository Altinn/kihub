# Data Model: Frontpage Redesign

Two **new Payload globals** (additive; no changes to existing collections). Existing News/Event
shapes are consumed read-only. Pure selection contracts sit between the read layers and the page.

## Global: `site-chrome`

Chrome content rendered on every employee page. Update gated to Contributor+ (`isEditor`, same
predicate as News/Events); read open (app is session-gated upstream).

| Field | Type | Rules |
|---|---|---|
| `nav` | array | Header navigation. `minRows: 1`, `maxRows: 8`. Order = render order. |
| `nav[].label` | text, required | e.g. "Nyheter" |
| `nav[].href` | text, required | Internal path (`/news`) or absolute URL |
| `footer` | group | |
| `footer.contactLabel` | text | e.g. "Kontakt oss:" |
| `footer.contactEmail` | email | Rendered as `mailto:` link |
| `footer.links` | array | `maxRows: 10`; order = render order |
| `footer.links[].label` | text, required | |
| `footer.links[].href` | text, required | |

## Global: `frontpage`

Frontpage-only content. Same access posture as `site-chrome`.

| Field | Type | Rules |
|---|---|---|
| `hero` | group | |
| `hero.eyebrow` | text | e.g. "Digdir / BOD / KITT-teamet" |
| `hero.heading` | text, required-when-saved | Full headline, e.g. "Kunstig intelligens i BOD" |
| `hero.accentWord` | text | Substring of `heading` rendered in accent color; no match → whole heading in ink |
| `hero.lead` | textarea | |
| `hero.primaryCta` / `hero.secondaryCta` | group | `label` (text), `href` (text) — CTA omitted when label empty |
| `tiles` | array | `minRows: 2`, `maxRows: 2` (fixed two-up design) |
| `tiles[].tag` | text | e.g. "Katalog" |
| `tiles[].title` | text, required | e.g. "Verktøy" |
| `tiles[].href` | text, required | Whole tile is one link |
| `tiles[].variant` | select: `tinted` \| `accent` | Visual: left tile tinted, right tile accent (default per index) |
| `subscriptions` | group | |
| `subscriptions.eyebrow` | text | e.g. "Tilgjengelige abonnementer" |
| `subscriptions.heading` | text | |
| `subscriptions.description` | textarea | |
| `subscriptions.chips` | array | `maxRows: 12` |
| `subscriptions.chips[].name` | text, required | e.g. "Claude Teams" |
| `subscriptions.chips[].href` | text | Optional link; chip renders as span when absent |

## Read shapes (lib/site-content.ts)

```ts
interface SiteChrome { nav: NavItem[]; footer: FooterContent }
interface NavItem { label: string; href: string }
interface FooterContent { contactLabel: string; contactEmail: string; links: NavItem[] }

interface FrontpageContent {
  hero: { eyebrow: string; heading: string; accentWord?: string; lead: string;
          primaryCta?: Cta; secondaryCta?: Cta };
  tiles: [Tile, Tile];
  subscriptions: { eyebrow: string; heading: string; description: string; chips: Chip[] };
}
```

**Merge rule (FR-012)**: `getSiteChrome()` / `getFrontpageContent()` read the global and fall back
**per-section** (`nav`, `footer`, `hero`, `tiles`, `subscriptions`) to
`site-content-defaults.ts` when that section is unset/empty. Defaults are also wired as Payload
`defaultValue`s so the admin form starts pre-filled from the same module (single source of truth).

## Pure selection contracts (lib/frontpage-select.ts)

- `selectEventsSection(events: Event[], now: Date): { next: Event | null; timeline: Event[] }` —
  input: output of `listUpcomingEvents()` (already published + upcoming, featured-first); re-sorts
  strictly by `startDateTime` ascending; `next` = soonest; `timeline` = following ≤4 regardless of
  calendar month (clarification). Empty input → `{ next: null, timeline: [] }`.
- `selectLatestNews(news: News[], n = 4): News[]` — input: output of `listPublishedNews()`
  (published, featured-first); re-sorts by `publishDate` descending (ignoring `featured`), caps at
  `n` (FR-008).

## Pure ICS contract (lib/ics.ts)

`buildEventIcs(event: Event, baseUrl: string): string` — RFC 5545 output; see
[contracts/event-ics.md](./contracts/event-ics.md).

## Existing entities (read-only, unchanged)

- **News** (Phase 7): `title, slug, summary, publishDate, heroImageUrl, status, featured` — via
  `listPublishedNews()`.
- **Event** (Phase 8): `title, slug, startDateTime, endDateTime?, location?, onlineUrl?,
  organizer?, tags[], status, featured` — via `listUpcomingEvents()` /
  `getPublishedEventBySlug()`. Category chip = first tag (spec assumption); meta line composes
  `location · onlineUrl-presence("Digitalt") · organizer`, omitting absent parts.

## State transitions

None — globals are single-version documents (no draft/publish lifecycle); News/Events lifecycles
unchanged.
