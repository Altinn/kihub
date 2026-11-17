# Implementation Plan: Designsystemet alignment and Digdir profile

**Branch**: `026-designsystemet-alignment` (work currently on `main`; no branch hook ran) |
**Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-designsystemet-alignment/spec.md`

## Summary

The employee-facing app is rebuilt on Designsystemet directly:

- **Theme.** Digdir's official theme (accent `#0062BA`, brand1–3 Rød, Gul and Blå, neutral
  Blåsvart `#1E2B3C`), generated with no overrides.
- **Components.** Plain HTML elements carrying the documented `ds-*` classes, in Server
  Components.
- **Behaviour.** `@digdir/designsystemet-web` is loaded once, as progressive enhancement.
- **Custom CSS.** Only page layout, plus a few components that Designsystemet lacks: header,
  footer, calendar, timeline and code. It uses `--ds-*` tokens only.
- **Removed.** The custom kihub token and component layer, the bridge, and the design-project sync.

Accessibility (WCAG 2.2 AA) drives the component choices:

- a skip link and one main landmark;
- a correct heading outline;
- native form filters;
- per-scheme focus;
- rem-based type;
- Norwegian UI text.

Delivery is page by page, in eight slices (research R12), with an interim bridge so unconverted
pages keep working.

## Technical Context

**Language/Version**: TypeScript 5.7, React 19.2, Next.js 16.3 (App Router, Turbopack dev)

**Primary Dependencies**:
- `@digdir/designsystemet-css` 1.18.0 (all component styling);
- `@digdir/designsystemet-web` 1.18.0 (added as a direct dependency; it is already in the tree);
- `@digdir/designsystemet` 1.18.0 CLI (theme build);
- Payload 3.85.2 (`@payloadcms/richtext-lexical` JSX converters);
- react-markdown with remark-gfm;
- `next/font/local` (Inter).

`@digdir/designsystemet-react` is no longer imported by employee-facing code (R2).

**Storage**: N/A. No schema, collection, global or migration change (FR-023).

**Testing**:
- vitest 4.1, unit tests for the new pure helpers;
- eslint, `tsc --noEmit`, `next build`;
- browser-pane accessibility checks (R13): axe-core, keyboard, headings, 24px font, 320px.

**Target Platform**: Evergreen desktop and mobile browsers. Invoker Commands is native in
Chromium; elsewhere it is polyfilled by `-web`.

**Project Type**: Web application. This is the `apps/web` employee surface; the Payload admin is
untouched.

**Performance Goals**: No regression. The JS shipped to employee pages should go down, because
Designsystemet React client references are removed from static content.

**Constraints**:
- zero new client components beyond the `-web` loader;
- the feature must work without JS (filters, disclosures, cards, pagination);
- no hard-coded colours, sizes or spacing;
- no inline visual styles;
- saved CMS content renders unchanged.

**Scale/Scope**:
- 14 routes;
- about 31 components;
- about 2,070 lines of CSS today, targeting at most about 1,000;
- 141 inline style props, targeting about 0.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution v3.2.0:

| Principle / constraint | Status | Notes |
| --- | --- | --- |
| I–VI Registry principles | PASS | Presentation only. Registry data, discovery and governance logic are untouched. |
| VII / VIII Two surfaces | PASS | Employee app only; the Payload admin is exempt and unchanged (FR-024). |
| Design System §1 Theme ("pinned to the KIHub Design System design project") | **AMEND** | The theme now follows Digdir's official theme and profile (R1). |
| Design System §2 Token layer ("kihub layer is the styling API", bridge required) | **AMEND** | The layer and bridge are retired (FR-020), as the user decided on 2026-10-21. |
| Design System §3 Components ("Designsystemet React components default for interactive primitives") | **AMEND** | Native HTML plus `ds-*` CSS is the default; React only where it adds behaviour (R2). |
| Design System §4 No restyling or forking of primitives | PASS | Kept; documented `--dsc-*` variables are the only customisation. |
| Start Simple / YAGNI | PASS | No new dependencies except promoting `-web` to direct. No E2E harness (R13). |

**Gate result: PASS conditional on the v4.0.0 amendment (R14).**
- The user explicitly approved retiring the kihub layer and realigning the theme.
- The amendment is task 1 of the final cleanup slice. It is drafted in research R14.
- The interim bridge keeps the current constitution literally satisfied until that slice lands.

**Post-design re-check:** PASS. No further deviations were introduced by the contracts below. The
one custom-component list (header, footer, calendar, timeline, code highlighting, design element)
fits amended §3.

## Project Structure

### Documentation (this feature)

```text
specs/026-designsystemet-alignment/
├── plan.md              # This file
├── research.md          # R1–R14 decisions
├── data-model.md        # Presentation "entities": theme config, CMS value → UI mappings
├── quickstart.md        # Validation guide (gates + browser a11y checks)
├── contracts/
│   ├── theme.md         # designsystemet.config.json + token usage rules
│   └── components.md    # Per-component Designsystemet mapping + markup contract per route
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks output
```

### Source Code (repository root)

```text
apps/web/
├── designsystemet.config.json        # R1: official Digdir theme, no overrides
├── design-tokens/ , design-tokens-build/kihub.css   # regenerated (theme:build)
└── src/
    ├── app/
    │   ├── themed-html.tsx           # skip link, Inter variable, -web loader, CSS imports
    │   ├── (app)/layout.tsx          # owns <main id="main-content" tabindex="-1">
    │   ├── (app)/**/page.tsx         # 14 routes, converted slice by slice
    │   └── (auth)/signin/page.tsx
    ├── components/
    │   ├── DesignsystemetWeb.tsx     # NEW: 'use client'; import '@digdir/designsystemet-web'
    │   ├── SiteHeader/SiteNav/SiteFooter.tsx
    │   └── … (31 components, rewritten to ds-* markup)
    ├── lib/
    │   └── ds-richtext.tsx           # NEW: heading level/size + class mapping for RichText & Markdown
    └── styles/
        ├── app.css                   # NEW: --ds-font-family, layout primitives, custom components
        ├── portal.css                # shrinks per slice; folded into app.css in the final slice
        ├── kihub/ , kihub-ds-bridge.css , kihub-fonts.css   # DELETED in the final slice
tests/unit/
    ├── ds-richtext.test.ts           # NEW
    └── (existing events-view / registry-view / frontpage tests extended for form-state helpers)
.specify/memory/constitution.md       # v4.0.0 amendment (R14)
```

**Structure Decision**: The structure is unchanged: a single `apps/web` app. The work replaces
markup and CSS in place. There are two new files: one helper and one client loader.

## Delivery slices (detail in tasks.md)

| # | Slice | Covers | Gate |
| --- | --- | --- | --- |
| 0 | Foundation | theme, `-web` loader, skip link and main, `app.css`, header, nav, footer, interim bridge | lint/tsc, keyboard and axe on `/` chrome |
| 1 | Frontpage | hero, tiles (R8), subscriptions (R7), contribute, events and news sections | axe `/` |
| 2 | News and projects | cards (R5), pagination, article pages, rich text (R9) | axe `/news`, `/news/[slug]`, `/prosjekter*` |
| 3 | Events | head, toggle, filters (R6), day list, month calendar (R10), detail | axe `/events` ×2 views, `/events/[slug]` |
| 4 | Learning | shell, `ds-details` nav, overview, page body, code | axe `/laering*` |
| 5 | Registry, artifacts and sign-in | Norwegian UI text, filters (R6), search label, governance, agent card | axe ×3 |
| 6 | /bidra | buttons, tags, table, details, alerts, headings | axe `/bidra` |
| 7 | Cleanup | delete the kihub layer and bridge; constitution v4.0.0; README; CLAUDE.md; full sweep | SC-001…SC-008 |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --- | --- | --- |
| Interim bridge kept during slices 0–6 | Unconverted pages keep rendering while the work ships page by page | A single big-bang PR across 14 routes cannot be reviewed page by page, as the user asked |
| One new client module (`DesignsystemetWeb`) | Invoker Commands polyfill and card click delegation (R3) | No JS would break dialogs in browsers without native Invoker Commands |
