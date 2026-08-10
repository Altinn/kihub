# Contract: `/laering` employee-facing UI

**Feature**: `014-learning-pages` | Routes: `/laering`, `/laering/[slug]`

Server-rendered on the kihub token layer, Norwegian (bokmål). **Zero new client components** — the
only client component in the feature is the reused `CopyButton` (research §10). All CSS lives in a
new `014 /laering` section of `portal.css`; `styles/kihub/` is synced from the design project and is
not touched (FR-034).

---

## §A Shell: two columns, sidebar left

```
┌───────────────────────── kihub-container ─────────────────────────┐
│ ┌─── sidebar (nav) ───┐ ┌────────── content (main) ─────────────┐ │
│ │ Utforsk innhold  ▾  │ │ h1                                    │ │
│ │  ▾ Grunnleggende    │ │ Sist oppdatert 10. august 2026         │ │
│ │      Hva er agenter │ │ …body: prose, images, code samples…    │ │
│ │      Instruksjoner  │ │                                       │ │
│ │  ▸ Referanse        │ │                                       │ │
│ └─────────────────────┘ └───────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```

| # | Guarantee | Requirement |
|---|---|---|
| A1 | CSS grid, sidebar column fixed (~260px) + content `minmax(0, 1fr)`. The `minmax(0, …)` is load-bearing: without it a wide `<pre>` widens the whole page (the lesson recorded at `portal.css:626`) | FR-006 |
| A2 | The sidebar renders on **both** routes — overview and page — so it is genuinely persistent | FR-002 |
| A3 | Desktop: the sidebar sticks while the content scrolls (`position: sticky`), so it stays reachable in a long page | spec Edge Cases |
| A4 | Below the layout breakpoint the grid becomes one column and the sidebar collapses into a single `<details>` above the content — the 012 approach of *replacing* the layout, not shrinking it (`portal.css:534`) | FR-006 |
| A5 | No horizontal scrolling at any width from 360 px up, on either route, including pages with wide code blocks or tables | FR-006, SC-004 |

---

## §B The resource navigation

Native `<details>`/`<summary>` per category — no JavaScript (research §10).

```html
<nav class="lp-nav" aria-label="Utforsk læringsinnhold">
  <details class="lp-nav__group" open>            <!-- open when containsCurrent -->
    <summary class="lp-nav__group-title">Grunnleggende</summary>
    <ul>
      <li><a class="lp-nav__link" href="/laering/hva-er-agenter" aria-current="page">…</a></li>
    </ul>
    <div class="lp-nav__subgroup"><h3>Tips &amp; triks</h3><ul>…</ul></div>
  </details>
</nav>
```

| # | Guarantee | Requirement |
|---|---|---|
| B1 | A `<nav>` landmark with the Norwegian accessible name "Utforsk læringsinnhold" | FR-003 |
| B2 | The current page's link carries `aria-current="page"` **and** a visible treatment (weight + accent rule), so the state is not colour-only | FR-003, FR-035 |
| B3 | Every category group and page link is keyboard reachable and shows the design system's focus ring — never suppressed | FR-003 |
| B4 | The group containing the current page renders `<details open>` — emitted server-side from `containsCurrent` | FR-004 |
| B5 | Expanding, collapsing and navigating all work with scripting disabled | FR-005, SC-009 |
| B6 | Subcategory groups render as a labelled subgroup inside their category's `<details>` — one nesting level only, matching the model | FR-002, FR-013 |
| B7 | Ungrouped pages appear before subcategory groups | spec Edge Cases |
| B8 | Empty categories and empty subcategories are absent entirely — never a group that opens onto nothing | FR-008 |
| B9 | Long titles wrap inside the sidebar; no truncation to unreadability, no horizontal scroll | spec Edge Cases |

---

## §C `/laering` — the overview

Derived from category descriptions; no separately authored landing content (spec Assumption 2).

| # | Guarantee | Requirement |
|---|---|---|
| C1 | `h1` "KI Læring", then one section per category: the category title as `h2`, its `description`, and a link into its first page | FR-007 |
| C2 | A category with no description shows its title and entry link, with no empty paragraph | FR-007 |
| C3 | Categories with no published pages are absent | FR-008 |
| C4 | With no published content at all: a Norwegian empty state, and **no** sidebar shell or empty nav landmark | FR-009, spec Edge Cases |

---

## §D `/laering/[slug]` — a learning page

| # | Guarantee | Requirement |
|---|---|---|
| D1 | `h1` is the page title (the body's headings start at `h2`, per learning-editor.md §A) | FR-003 |
| D2 | Breadcrumb-style context shows the category and, when present, the subcategory — derived from the record, not from the address | FR-010 |
| D3 | "Sist oppdatert <nb-NO date>" in Oslo time, from `updatedAt` | FR-018 |
| D4 | The `summary`, when present, renders as a lead paragraph; when absent, nothing is reserved for it | FR-019 |
| D5 | The body renders through `<RichText>` inside `.kihub-prose` per learning-editor.md §B | FR-019 |
| D6 | A draft or unknown slug calls `notFound()` | FR-012 |
| D7 | A Norwegian link back to the learning overview | FR-036 |

---

## §E Copy and typography

| # | Guarantee | Requirement |
|---|---|---|
| E1 | Every string on both routes is Norwegian bokmål — headings, nav label, disclosure labels, breadcrumb separators, empty state, copy-button states ("Kopier" / "Kopiert") | FR-036, SC-005 |
| E2 | Serif (`--kihub-font-display`) for headings and reading text; sans (`--kihub-font-ui`) for nav, labels and the date line — the design system's "serif reads, sans labels" rule | FR-034 |
| E3 | Every colour, space, radius and type value comes from a `--kihub-*` token. No hex, rem or px colour/type literal in any new component or CSS rule (spacing/layout px for grid tracks and breakpoints excepted, as in 012/013) | FR-034 |
| E4 | No Designsystemet primitive is restyled or forked; `CopyButton`'s Designsystemet `Button` is used as-is | FR-034 |
| E5 | All text meets WCAG 2.1 AA contrast, including highlighted code tokens and the current-page nav treatment — measured, not assumed | FR-035, SC-011 |

---

## §F Navigation entry

| # | Guarantee | Requirement |
|---|---|---|
| F1 | `DEFAULT_SITE_CHROME.nav` gains `{ label: 'KI Læring', href: '/laering' }`, and the footer links gain the same | FR-001, FR-040 |
| F2 | No migration writes to the saved `site-chrome` global — an environment with a customised nav keeps editorial control, and the editor adds the entry themselves (research §11, `quickstart.md`) | FR-040 |
| F3 | Both routes sit inside the `(app)` route group, so `requireSession` gates them exactly like every other employee page | FR-033 |
