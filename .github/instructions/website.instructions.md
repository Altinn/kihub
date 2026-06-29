---
description: "Use when working on website"
applyTo: "website/**"
---

# Website Area Instructions

Applies to: `website/**`

## Purpose
The `website/` directory is the public-facing KI Hub catalog and documentation site. It lists agents, skills, instructions, hooks, workflows, plugins, and tools sourced from the repo, and hosts the Learning Hub (Starlight docs) and Norwegian-language news/about pages.

## Tech Stack
- **Astro 6.x** — static site generator (islands architecture)
- **@astrojs/starlight** — documentation theme; powers the Learning Hub at `src/content/docs/`
- **@digdir/designsystemet-css** — Norwegian government design system; CSS variables and utility classes (`.ds-*` prefix)
- **Pagefind** — full-text search index, built via custom integration at `src/integrations/pagefind-resources.ts`
- **choices.js** — multi-select filter dropdowns
- **shiki** — syntax highlighting in modals
- **jszip** — lazy-loaded for bulk downloads
- Content: Markdown (Astro content collections) + YAML (`data/`) + JSON (`public/data/`)

## Build Commands (run from `website/`)
```bash
npm run dev           # local dev server
npm run build         # production build (runs design:build first)
npm run design:build  # regenerate design tokens → src/styles/designsystemet/
npm run preview       # preview production build
```
> Design tokens must be regenerated after changing `designsystemet.config.json`.

## Key Directory Map
```
website/
├── src/
│   ├── pages/           # Astro routes (one .astro per catalog page + dynamic [slug])
│   ├── components/      # Shared Astro components (Modal, Header, Footer, PageHeader…)
│   ├── scripts/
│   │   ├── pages/       # Per-page TS entry points (*-render.ts + *.ts pairs)
│   │   └── utils.ts     # Shared helpers (download, copy, share, toast, GitHub URLs)
│   ├── styles/
│   │   ├── global.css
│   │   └── designsystemet/   # AUTO-GENERATED — do not edit by hand
│   ├── content/
│   │   ├── docs/        # Learning Hub articles (Starlight format)
│   │   └── nyheter/     # Norwegian news articles
│   └── content.config.ts     # Content collection schemas
├── public/data/         # JSON data files consumed by catalog pages
├── data/                # YAML source data (tools.yml, project-summary.yml)
└── astro.config.mjs     # Site URL, sidebar, redirects, env vars (SITE_URL, BASE_PATH)
```

## Catalog Page Pattern
Every catalog page (agents, skills, instructions, etc.) follows this structure:
1. **Server-render** the initial item list using a `*-render.ts` function (e.g., `renderAgentsHtml()`)
2. **Embed** the full JSON dataset in the page via `<EmbeddedPageData>` (serialized with `devalue`)
3. **Hydrate** client-side via a `<script>` import (e.g., `import '../scripts/pages/agents'`) that handles search, filters, sorting, and modal interactions
4. Client scripts read embedded data first via `embedded-data.ts`; fall back to `/data/{name}.json`

## File Naming Conventions
| Type | Convention | Example |
|---|---|---|
| Astro components | PascalCase | `Modal.astro` |
| Page scripts | camelCase | `agents.ts` |
| Render helpers | `{resource}-render.ts` | `agents-render.ts` |
| Data files | lowercase | `agents.json` |
| Styles | kebab-case | `global.css` |

## CSS Class Conventions
- `.ds-*` — designsystemet primitives (do not override lightly)
- `.resource-*` — catalog listing items
- `.filter-*` — filter toolbar controls
- `.install-*` — VS Code / extension install dropdowns
- `.modal-*` — modal dialog elements
- `.page-*` — page-level layout structures
- `.v2-*` — home page (redesigned v2 section)
- `.sr-only` — screen-reader-only text

Use scoped `<style>` blocks in `.astro` files for component-specific styles; avoid global overrides unless in `global.css`.

## Data Flow
- `public/data/*.json` — consumed by catalog pages at build time and runtime
- `data/tools.yml` — source for `tools.astro`; parsed via `yaml` package
- Content collections (`nyheter`, `docs`) — defined in `content.config.ts` with typed schemas

## Norwegian Language Pages
Pages `nyheter.astro`, `om-kitt.astro`, and `prosjekter.astro` are in Norwegian (Bokmål). News articles in `src/content/nyheter/` use frontmatter fields: `title`, `description`, `pubDate`, `color`, `draft`.

## Accessibility Requirements
- ARIA labels on all interactive inputs
- `aria-live` regions for dynamic list updates
- Keyboard navigation for modals and dropdowns
- Use `<dialog>` for modals (native semantics)
