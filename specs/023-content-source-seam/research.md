# Research: Content Source Seam (023)

All decisions below were made against the code on `main` @ 673fefa. There are no open
`NEEDS CLARIFICATION` items.

## R1 — Where the seam sits: keep the `lib/<module>.ts` read functions as the public API

**Decision**: The existing read-layer functions (`listPublishedNews`, `listPublishedNewsPage`,
`getPublishedNewsBySlug`, `listUpcomingEvents`, `listEventsInRange`, `getPublishedEventBySlug`,
`listPublishedProjects`, `getPublishedProjectBySlug`, `readLearningLibrary`,
`getPublishedLearningPageBySlug`, `getFrontpageContent`, `getSiteChrome`) keep their names and
files. Each becomes a one-line **facade** that delegates to the source selected for its module.
The Payload query code moves, unchanged, into `lib/content/payload/<module>.ts`, together with the
mapping from Payload documents to KI Hub view models.

**Rationale**: Pages already call only these functions (13 call sites, all in `src/app/(app)` and
`SiteHeader`/`SiteFooter`), so call sites don't change. What changes is the **return types**: they
become view models, not `@/payload-types`. The facade is also the single place where "which source
serves this module" is decided.

**Alternatives considered**:
- *Pages call the source objects directly.* This touches every page and leaves two ways to read
  content. Rejected.
- *A generic repository (`getContent('news', 'bySlug', slug)`).* This loses per-module typing and
  hides the guarantees each function makes. Rejected.

## R2 — View models are KI Hub-owned, flat, and minimal

**Decision**: There is one module, `lib/content/types.ts`, with `NewsArticle`, `NewsPage`,
`EventItem`, `ProjectItem`, `LearningArticle`, `Author`, `ContentImage`, `ImageRendition`, `NewsHero`
and `RichTextContent`. The existing neutral types stay where they already are:
- `LearningLibrary`/`LearningTree*` in `learning-view.ts`
- `SiteChrome`/`FrontpageContent`/`Tile`… in `site-content-defaults.ts`

The rules:
- **Ids** are `string`. Umbraco keys are GUIDs; ids are only used as React keys, so nothing changes
  in the output.
- **`slug`** is a required `string`, mapped as `doc.slug ?? ''`. That is exactly what every page
  does inline today, so the output is the same.
- **Dates** stay ISO strings.
- **Relations are resolved** (`author → {name, email}`, learning `category → categoryTitle`), so no
  "id or populated doc" union reaches a page.
- Only fields a page, component or pure helper reads are carried. `status`, `createdAt` and the
  inert News `featured` are dropped. The Events `featured` flag is NOT carried: featured-first
  ordering is applied inside the source, which is where it is today.

**Rationale**: FR-005/FR-006. Each shape can be supplied by a non-Payload source without faking
Payload internals.

**Alternatives considered**: Re-exporting the Payload types under new names. That is cosmetic: pages
would still depend on Payload's relation unions and nullable shapes. Rejected.

## R3 — `ContentImage` mirrors today's image inputs exactly, so the image helpers are retyped, not rewritten

**Decision**: `ContentImage` has:
- `url`, `width`, `height`, `alt`
- `focalX`, `focalY` (0–100, `null` = unset)
- `updatedAt` (the version-marker source for `?v=`)
- `renditions`, keyed by **KI Hub's own rendition names** (`card`, `card2x`, `content`,
  `content2x`)

It keeps the same nullability Payload has today (e.g. a rendition may have a `url` of `null`).
`pickCardImage`, `pickArticleImage` and `LearningImage`'s size choice become pure functions of
`ContentImage`. Only property paths change (`media.sizes?.card` → `image.renditions.card`); the
logic stays the same.

**Rationale**: Parity is guaranteed by construction (FR-001, FR-007). That includes the 020 edge
cases: exact-16:10 detection, srcset dedupe-by-width, `??` for focal 0, and `?v=updatedAt`. The
rendition names describe KI Hub's design (16:10 cards at 800/1600 px, reading width at 1200/2400
px), not Payload. Umbraco can produce the same renditions with image-cropper crops plus
ImageSharp query parameters, so the next source has a clear target.

**Alternatives considered**: A "cleaner" image model (non-null `url`, renditions without a url
dropped). The difference only shows up in states Payload never produces, but strict parity is
cheaper than arguing about which impossible states don't matter. Tightening is deferred.

## R4 — News hero is resolved inside the source: `NewsHero = image | legacy | none`

**Decision**: `NewsArticle.hero` is the already-resolved union
`{ kind: 'image', image } | { kind: 'legacy', url } | { kind: 'none' }`. `resolveHeroSource` (upload >
legacy > none, with populated-and-has-url checks) moves from `news-view.ts` into the Payload news
mapper, unchanged. Its unit tests move with it.

**Rationale**: The legacy `heroImageUrl` fallback is Payload-era history. An Umbraco source will
only ever produce `image` or `none`, so precedence is source logic, not view logic. `NewsCard` and
the article page then only branch on `hero.kind`.

## R5 — Rich text: one tagged value, one KI Hub component, two render profiles

**Decision**:
- `RichTextContent = { format: 'lexical'; document: LexicalDocument }`. This is a discriminated
  union with one member today; a later feature adds e.g. `{ format: 'html'; html }`. `LexicalDocument`
  is the hand-declared lexical root shape that already exists as `RichTextValue` in
  `site-content-defaults.ts`; it is renamed and moved to `lib/content/rich-text.ts`.
- `<RichTextBody value profile>` in `components/RichTextBody.tsx` is the ONLY rich-text entry
  point for pages and components. It switches on `value.format`. The `lexical` branch is
  `components/rich-text/LexicalRichText.tsx`, the only file in the employee app that imports
  `@payloadcms/richtext-lexical/react`.
- Profiles:
  - `standard` (default converters): used today by news, event, project and the subscriptions
    banner.
  - `learning`: Payload's default converters plus overrides for `upload`, the `Code` block and the
    `youtube` block. Today these live in `LearningBody.tsx`; they move into the lexical renderer.
- `LearningImage`, `LearningCodeBlock` and `LearningVideo` take **neutral props**:
  `{ image: ContentImage | null; decorative }`, `{ code; language }` and `{ url; title; caption }`.
  The lexical converters map nodes to these props (the upload node's Media goes through the Payload
  media mapper), so a future HTML/Umbraco renderer reuses the same three components.

**Rationale**: FR-008/FR-009. Keeping two profiles preserves output exactly. News, events and
projects use Payload's *default* upload converter today. Applying the learning converters to them
would change the markup of any inline image in a news body.

**Alternatives considered**:
- *Convert Lexical to HTML in the source and render HTML everywhere.* This changes the markup, and
  shiki code blocks are React elements by design (014 research §3: no `dangerouslySetInnerHTML`).
  Rejected.
- *Converting to a portable AST.* That would mean building a CMS-neutral document model now, for
  one consumer. YAGNI (Principle VII); deferred to the feature that introduces the second format.

## R6 — Source selection: six env settings, read once, validated strictly, fail fast

**Decision**:
- **Modules**: `news`, `events`, `projects`, `learning`, `frontpage`, `siteChrome`.
- **Settings**: `CONTENT_SOURCE_NEWS`, `CONTENT_SOURCE_EVENTS`, `CONTENT_SOURCE_PROJECTS`,
  `CONTENT_SOURCE_LEARNING`, `CONTENT_SOURCE_FRONTPAGE`, `CONTENT_SOURCE_SITE_CHROME`.
- **Values**: today only `payload`. A value is trimmed and lower-cased; absent, empty or whitespace
  means `payload`.
- A pure `readContentSourceConfig(env)` returns the full module→source map, or throws one
  `ContentSourceConfigError` that lists **every** bad setting with its rejected value and the
  accepted values. Other `CONTENT_SOURCE_*` names are not read, so they're ignored (US2 scenario 4).
- Validation runs in two places:
  1. **At boot**, in `src/instrumentation.ts`, for the Node.js runtime in every `NODE_ENV`, placed
     before the existing production-only Payload init.
  2. **Lazily**, memoised, the first time any facade resolves a source. This covers scripts,
     tests, and any runtime where the boot hook's error is only logged rather than fatal.

**Rationale**: FR-010–FR-013. This uses the same env-selected, throw-on-misconfig pattern as
`MEDIA_STORAGE_MODE` (`lib/media-storage.ts`). Lower-casing tolerates `Payload` but still rejects
typos like `paylod`. No setting is needed in any environment today, so there is **no infra
change**.

**Implementation check (T-task)**: confirm under `next start` that an error thrown in
`register()` aborts startup. The existing comment there assumes it does ("crashes the boot
loudly"). If Next only logs it, the lazy check still guarantees no editorial page is served from a
misconfigured module (it returns a 500 with the message), and quickstart §4 records which behaviour
was observed.

**Alternatives considered**:
- *One `CONTENT_SOURCE` JSON map.* Harder to set in Azure Container Apps and harder to read in a
  revision diff. Rejected.
- *A runtime toggle in `/cms`.* The spec makes this deploy-time; a CMS-stored switch would make
  Payload a dependency of the decision to stop using Payload. Rejected.

## R7 — The registry resolves adapters from a static table; tests replace it with `vi.mock`, not a production hook

**Decision**: `lib/content/registry.ts` holds:
- `const SOURCES = { payload: payloadSources }`
- per-module getters: `newsSource()`, `eventsSource()`, …
- a pure `resolveModuleSources(config, table)`

The stand-in test (US3) uses `vi.mock('@/lib/content/registry', importOriginal)` to swap only
`projectsSource()` for a fixture source. The pure resolver is unit-tested with a fake table that
contains a second source id, which proves per-module independence.

**Rationale**: No test-only code ships in production. Adding Umbraco later is one line in `SOURCES`
plus its adapter, and one config value per module (SC-004).

## R8 — Parity is proven by a DB-free golden-HTML harness, captured before the refactor

**Decision**: `tests/unit/content-parity.test.ts`:
- Mocks `payload` (`getPayload` → an in-memory fake `find`/`findGlobal` over fixed fixture
  documents, honouring only `slug` equality, `status: published` and paging), `@payload-config`
  and `@/auth`.
- Pins the clock with `vi.setSystemTime`.
- Renders every editorial surface to static HTML with `react-dom/server`, and compares each one
  with `toMatchFileSnapshot('__parity__/<surface>.html')`.

The surfaces covered:
- the frontpage
- `/news` p1 and p2
- the news article with upload hero, legacy hero and no hero
- `/events` in list and calendar view
- the event page and its ICS body
- `/prosjekter` and a project page
- `/laering` and a learning page with code, video, image and a decorative image
- the site header and footer

The goldens are **captured on unchanged `main` code first** and committed in their own commit.
Every later task must pass against them **without `-u`**.

The fixtures use fixed ids, filenames and `updatedAt`, so the HTML is deterministic. Because the
fake replaces `getPayload` itself, the same harness exercises the old code (Payload calls in
`lib/*.ts`) and the new code (Payload calls in `lib/content/payload/*.ts`) through the same seam.
That makes it a true before/after comparison.

**Rationale**: SC-001 and FR-001 need a byte-level check that runs in CI, not just a one-off
manual look. The goldens also become the **acceptance target for the Umbraco adapters**: the next
feature renders the same surfaces from equivalent Umbraco fixtures and must match the same files.

**Risks and fallback**:
- `next/link`, `next/navigation` (`SiteNav`'s `usePathname`) and Designsystemet client components
  have to render outside a Next request. They are expected to (no router context means a plain
  `<a>` and a `null` pathname).
- If a surface can't render outside Next, the harness falls back to rendering that surface's
  components with the read-layer output. That page's composition is then covered by the quickstart
  §3 HTTP diff instead.
- The first task is a spike that settles this.

**Alternatives considered**:
- *Integration snapshots against the shared dev DB.* Non-deterministic: auto-increment ids,
  `?v=` timestamps, whatever content is in the DB. Rejected.
- *A manual browser diff only.* Not repeatable and not in CI. It is kept as a secondary check
  (quickstart §3).

## R9 — Guardrail: ESLint `no-restricted-imports` on the employee surface

**Decision**: An `eslint.config.mjs` override for `src/app/(app)/**`, `src/components/**`,
`src/lib/*-view.ts`, `src/lib/frontpage-select.ts`, `src/lib/site-content-defaults.ts` and
`src/lib/content/*.ts` forbids imports of `@/payload-types`, `payload`, `@payload-config` and
`@payloadcms/*`. The error message points to `lib/content/types.ts`.

Exempt (they are Payload-specific by definition):
- `src/components/cms/**` (Payload admin custom components)
- `src/components/rich-text/LexicalRichText.tsx` (the lexical renderer)
- `src/lib/content/payload/**`

Registry libs (`lib/catalog.ts`, `governance.ts`, `discovery.ts`, `search.ts`) are not in the
restricted set, so FR-015 holds.

**Rationale**: FR-016/SC-003. `pnpm --filter web lint` is already a quality gate, and the rule
names the right replacement in its message. The registry pages under `(app)` don't import Payload
directly today (they go through `lib/catalog.ts`), so the rule costs them nothing.

## R10 — No extra round-trips; the same queries, the same depths

**Decision**: The Payload adapters issue exactly today's queries, with the same `where`, `sort`,
`limit`, `depth` and `overrideAccess`. Mapping is synchronous and in memory. The learning page read
keeps its default depth, so `category`, `subcategory`, `author` and inline uploads arrive populated
for the mapper.

**Rationale**: SC-006. The one check that matters is that no adapter adds a query to resolve a
relation the old code got from `depth`.

## R11 — Constitution: no amendment in this feature

**Decision**: Principle II ("Payload owns native content") is still literally true after 023,
because Payload remains the only source. The amendment that names Umbraco, and the Stack /
Deployment constraint changes, belong to the first feature that serves a module from Umbraco.

**Rationale**: Amending ahead of the change would leave the constitution describing a system that
doesn't exist. Principle VII's YAGNI test is met because the seam is justified by a concrete,
already-decided next phase: the Projects pilot on Umbraco.

## R12 — Frontpage defaults keep their stored (lexical) shape; the merge wraps them

**Decision**: `DEFAULT_FRONTPAGE` stays exactly as it is. It doubles as the Payload global's
`defaultValue`, so it must remain in Payload's stored shape. `mergeFrontpage` moves to
`lib/content/payload/site-content.ts`. It returns `FrontpageContent`, whose `Chip.description` and
`requestAccess.body` are now `RichTextContent` (wrapped `{ format: 'lexical', document }`) for both
stored and defaulted sections. `subscriptions-banner-view.test.ts` only changes its import of the
renamed `LexicalDocument` type.
