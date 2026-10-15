# Contract: Content source selection and source ports (023)

## §1 Modules and settings

Six editorial modules are switched independently: `news`, `events`, `projects`, `learning`,
`frontpage`, `siteChrome`. Each module has one setting:

| Module | Setting |
|---|---|
| news | `CONTENT_SOURCE_NEWS` |
| events | `CONTENT_SOURCE_EVENTS` |
| projects | `CONTENT_SOURCE_PROJECTS` |
| learning | `CONTENT_SOURCE_LEARNING` |
| frontpage | `CONTENT_SOURCE_FRONTPAGE` |
| siteChrome | `CONTENT_SOURCE_SITE_CHROME` |

Images have no setting of their own: they are served by the module that owns them.

## §2 Parsing and validation: `readContentSourceConfig(env)`

1. For each module, read its setting. Unknown `CONTENT_SOURCE_*` names are never read, so they are
   ignored.
2. Normalise: `trim()`, then `toLowerCase()`.
3. `''`, or the setting being absent, means `payload`.
4. A normalised value outside the accepted set (`['payload']` today) is an error.
5. If any module is in error, throw **one** `ContentSourceConfigError`. Its `message`:
   - names every offending setting with its raw value, in module order;
   - names the accepted values;
   - has this form:
     ```
     Invalid content source configuration: CONTENT_SOURCE_NEWS="paylod" (accepted: payload)[; …more]
     ```
6. Otherwise, return `Readonly<Record<ContentModule, SourceId>>`.

The function is pure (`env` is passed in) and is unit-tested exhaustively.

**Where it runs**:
- (a) `src/instrumentation.ts` `register()`, for `NEXT_RUNTIME === 'nodejs'` in **every**
  `NODE_ENV`, before the production-only Payload init.
- (b) Lazily and memoised, on the first facade call (`lib/content/registry.ts`). After a failure,
  every facade call rethrows the same error. It never falls back to a default.

## §3 Source ports and guarantees

These signatures live in `lib/content/ports.ts`; the shapes are in `data-model.md`. Every
implementation MUST meet the guarantees below. Today's Payload implementation meets them by moving
the existing queries verbatim.

| Port.method | Guarantee |
|---|---|
| `NewsSource.listPublished()` | Published only; `publishDate` desc (ties by source's stable secondary order); ≤ 200. |
| `NewsSource.listPublishedPage(p)` | Published only; page size `NEWS_PAGE_SIZE`; `p` > last page → the last page's articles and `page = totalPages`; empty archive → `page: 1, totalPages: 0`. |
| `NewsSource.getPublishedBySlug(s)` | The published article with slug `s`, else `null`. |
| `EventsSource.listUpcoming(f?)` | Published, not yet ended (`(end ?? start) >= now`), optional type/format filters, featured first and soonest first within each group; ≤ 200. |
| `EventsSource.listInRange(from, to)` | Published events overlapping `[from, to]` (past included), soonest first; ≤ 200. |
| `EventsSource.getPublishedBySlug(s)` | The published event (past ones included), else `null`. |
| `ProjectsSource.listPublished()` | Published only; editor `order` asc, then creation order; ≤ 200. |
| `ProjectsSource.getPublishedBySlug(s)` | The published project, else `null`. |
| `LearningSource.readLibrary()` | All categories and subcategories, published pages only, each ordered by `order` then `title`; bounded number of reads regardless of size. |
| `LearningSource.getPublishedPageBySlug(s)` | The published page with category/subcategory titles and author resolved, else `null`. |
| `FrontpageSource.getFrontpage()` | Always a complete `FrontpageContent`: an unset or invalid section falls back to `DEFAULT_FRONTPAGE` wholesale (011 merge rule). |
| `SiteChromeSource.getSiteChrome()` | Always a complete `SiteChrome`: per-section fallback to `DEFAULT_SITE_CHROME`. |

A source MUST NOT return a draft or unpublished item from any method. A rich-text value MUST carry
its `format`.

## §4 Facades (unchanged public API)

| Function (file) | Delegates to |
|---|---|
| `listPublishedNews`, `listPublishedNewsPage`, `getPublishedNewsBySlug` (`lib/news.ts`) | `newsSource()` |
| `listUpcomingEvents`, `listEventsInRange`, `getPublishedEventBySlug` (`lib/events.ts`) | `eventsSource()` |
| `listPublishedProjects`, `getPublishedProjectBySlug` (`lib/projects.ts`) | `projectsSource()` |
| `readLearningLibrary`, `getPublishedLearningPageBySlug` (`lib/learning.ts`) | `learningSource()` |
| `getFrontpageContent`, `getSiteChrome` (`lib/site-content.ts`) | `frontpageSource()`, `siteChromeSource()` |

Facades contain no logic beyond delegation. Their return types are the view models.

## §5 Registry

`lib/content/registry.ts`:
- `SOURCES: Record<SourceId, ModuleSources>`, which today is `{ payload: payloadSources }`.
- `resolveModuleSources(config, table)`: pure. It picks `table[config[module]][module]` for each
  module.
- `newsSource()`, `eventsSource()`, `projectsSource()`, `learningSource()`, `frontpageSource()`,
  `siteChromeSource()`: these use the memoised config from §2.

Adding a source = one `SOURCES` entry plus its adapters. Switching a module = one setting.

## §6 Out of scope (FR-015)

`lib/catalog.ts`, `lib/governance.ts`, `lib/discovery.ts`, `lib/discovery-actions.ts`,
`lib/search.ts`, the `/registry` and `/artifacts` pages, the discovery API routes, and the `/cms`
back-office do not read this configuration and are not changed.
