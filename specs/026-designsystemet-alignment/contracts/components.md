# Contract: components and markup (026)

All markup lives in Server Components unless marked **client**. Class names and attributes are
Designsystemet 1.18 CSS (`@digdir/designsystemet-css`).

## Global shell (slice 0)

```html
<body>
  <a class="ds-skip-link" href="#main-content">Hopp til hovedinnhold</a>
  <header class="app-header">…</header>
  <main id="main-content" tabindex="-1">{page}</main>
  <footer class="app-footer" data-color-scheme="dark">…</footer>
</body>
```

- Pages MUST NOT render their own `<main>`. `LearningShell` and `signin` stop doing so.
- Each page renders exactly one `<h1 class="ds-heading">`.
- **Header**:
  - brand link (`<a>` with logo image `alt="Kitt"` plus the wordmark "KI HUB"; accessible name
    "Kitt KI HUB, forside");
  - `<nav aria-label="Hovedmeny"><ul>` of `<a class="ds-link" data-color="neutral">`, with
    `aria-current="page"` shown as an underline bar;
  - "Søk" inside the list;
  - the user's name as text;
  - an Admin `ds-link`;
  - `<button class="ds-button" data-variant="secondary" data-size="sm">Logg ut</button>`.
- **SiteNav** (**client**, existing): the toggle is `button.ds-button[data-variant=tertiary]` with
  the fixed label "Meny" and `aria-expanded` plus `aria-controls`.
- **Footer**:
  - an `<h2 class="ds-sr-only">` or a visible heading per list;
  - links are `ds-link`;
  - focus comes from the dark scheme.
- **DesignsystemetWeb** (**client**): a side-effect import only. It renders `null`.

## Mapping (replaces → with)

| Today | Designsystemet |
| --- | --- |
| `.kihub-h1…h4`, `p.kihub-h3` | `<hN class="ds-heading" data-size>`; level follows the outline, size follows R4 |
| `.kihub-lead`, `.kihub-prose`, plain `<p>` | `<p class="ds-paragraph" data-size data-variant="long">` |
| `.kihub-eyebrow` | removed, or `<p class="ds-paragraph" data-size="sm">` in `text-subtle` |
| `.kihub-link`, bare `<a>`/`<Link>` | `<a class="ds-link">` |
| `.kihub-btn--primary/secondary/tertiary` on `<a>` | `<a class="ds-button" data-variant="primary\|secondary\|tertiary">` |
| `.kihub-btn` on `<button>` | `<button class="ds-button" data-variant>` |
| `.kihub-tag`, `.bidra-pill`, `EventTypeBadge`, `LifecycleBadge`, news tags | `<span class="ds-tag" data-color>` |
| `.kihub-card`, `Card` | `<div\|article class="ds-card" data-variant="default\|tinted">` |
| whole-card links (NewsCard, ProjectCard, ArtifactCard) | `article.ds-card[data-clickdelegatefor]` with `h* > a#id` (R5) |
| FrontpageTile, ContributeBanner | `<a class="ds-card" data-variant="tinted" data-color>` with a `ds-heading` inside |
| `.bidra-note/.bidra-tip`, signin Alert | `<div class="ds-alert" data-color="info\|warning\|danger">`; add `role="status"`/`"alert"` only for dynamic messages |
| `<details>` (learning nav, FAQ, /bidra) | `<details class="ds-details"><summary>…</summary><div>…</div></details>`; remove custom markers |
| `.bidra-table`, calendar grid | `<table class="ds-table">` with `<caption>`; the scroll wrapper keeps `role="region" aria-label tabindex="0"` |
| `NewsPagination` | `<nav class="ds-pagination" aria-label="Sidenavigering"><ul><li><a class="ds-button" data-variant aria-current="page">` (current = `aria-current="page"` on a link); prev/next omitted when unavailable |
| `EventsViewToggle` | `<nav aria-label="Visning">` with two `ds-button` links, the current one `data-variant="primary" aria-current="page"` |
| `EventsFilters`, `CatalogFilters` | `<form method="get">` with `<fieldset class="ds-fieldset"><legend class="ds-label">` and `<label class="ds-chip"><input type=checkbox\|radio class="ds-input" …>` per option, `ds-button` submit "Bruk filter" and `ds-link` "Nullstill" (R6) |
| `SearchBar` (client, DS `Search`) | **server** `<form method="get" role="search">` with a visible `<label class="ds-label">`, `<div class="ds-search">` containing `input[type=search].ds-input` and `button.ds-button` "Søk" |
| `SubscriptionsBanner` dialogs | `<dialog class="ds-dialog" id closedby="any">` with a `ds-heading` `h2` and a close `button.ds-button[data-variant=tertiary][data-icon]` (`command="close"`); triggers stay plain buttons with `command="show-modal"`; the card is `data-color-scheme="dark"`, and the dialogs are siblings |
| `CopyButton` (client) | `button.ds-button[data-variant=secondary][data-size=sm]`, plus a `role="status"` live region announcing "Kopiert" |
| `Markdown`, Lexical `RichText` | `lib/ds-richtext` mapping (R9); content `h1` → `h2`; the README container gets `lang="en"` when it is known to be English |
| Decorative "→", "‹ ›", "▾" | `<span aria-hidden="true">`, or removed (Designsystemet supplies markers) |
| inline `style={{}}` | app classes on tokens; allowed only for dynamic values (media `object-position`) |

## Heading outlines (per route)

- `/`: h1 hero → h2 "Hva skjer i Digdir", "Siste nytt", the subscriptions heading and the
  contribute heading → h3 cards. The tiles carry an h2 each, inside the "Snarveier" section, which
  has a visually hidden h2.
- `/events`: h1 → h2 per day (list) or the month (calendar) → h3 entries. The filter legends are
  not headings.
- `/laering/[slug]`: h1 page title. The sidebar nav uses `<nav aria-label="KI Læring">` with
  `summary` text, not headings. Body content starts at h2.
- `/registry`: h1 "Verktøy og ressurser"; the filter fieldsets have legends; result cards are h2.
- `/artifacts/[id]`: h1 artifact name → h2 sections (Installasjon, Styring, Agentkort, README).
  `AgentCardPanel` and `GovernancePanel` take a `headingLevel` prop (default 2), so `/bidra`
  embeds them at 4 under its h3 step.

## Norwegian UI text (slice 5)

Registry, artifact detail, sign-in, `SearchBar`, `GovernancePanel`, `LifecycleBadge`,
`AgentCardPanel` and `CatalogFilters` labels are translated. Dates use `nb-NO` everywhere,
including `toLocaleString`.
