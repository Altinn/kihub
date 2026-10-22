# Tasks: Designsystemet alignment and Digdir profile (026)

**Input**: Design documents from `/specs/026-designsystemet-alignment/`:
- [plan.md](./plan.md);
- [spec.md](./spec.md);
- [research.md](./research.md) R1–R14;
- [data-model.md](./data-model.md);
- [contracts/theme.md](./contracts/theme.md);
- [contracts/components.md](./contracts/components.md);
- [quickstart.md](./quickstart.md).

**Organisation**: by the eight delivery slices in plan.md, as the user asked. Each slice is
independently shippable. Every slice touches several user stories, so each task is labelled with
the story it serves:

| Story | Covers |
| --- | --- |
| US1 | keyboard, screen reader |
| US2 | Digdir look |
| US3 | consistent components |
| US4 | filters |
| US5 | font size, reflow, motion |
| US6 | one design system |

**Tests**: Unit tests only for the new pure helpers (data-model.md). The spec asks for no TDD. UI
verification is the browser checklist in quickstart.md.

**Paths**: `W` = `apps/web/src`. All other paths are relative to the repo root.

**Git**: Never stage or commit (user rule). The user handles git.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup (theme and dependencies)

- [x] T001 Replace the theme in `apps/web/designsystemet.config.json` with contracts/theme.md: colours accent, brand1, brand2, brand3 and neutral `#1E2B3C`; no `overrides`.
- [x] T002 Run `pnpm --filter web theme:build` to regenerate `apps/web/design-tokens/` and `apps/web/design-tokens-build/kihub.css`. Confirm that `--ds-color-brand1-base-default: #F45F63` exists and `--ds-color-pink-*` is gone.
- [x] T003 Add `"@digdir/designsystemet-web": "1.18.0"` (exact version) to `apps/web/package.json` dependencies and run `pnpm install`.

---

## Phase 2: Slice 0, foundation and shared chrome (blocks every other slice)

**Goal**: Every page gets the new theme, skip link, single main landmark, Designsystemet focus,
rem type and Digdir-compliant header and footer. Unconverted pages keep rendering through the
interim bridge.

**Independent test**: Run quickstart browser steps 2–7 on `/`, checking only the header, footer
and skip link.

- [x] T004 [US6] Re-point `W/styles/kihub-ds-bridge.css` at the new theme:
  - `--kihub-pink` → `--ds-color-brand1-base-default`;
  - `--kihub-yellow` → `--ds-color-brand2-base-default`.

  Then add rem-based overrides for every `--kihub-font-size-*` and `--kihub-space-*`, using
  `--ds-font-size-*` and `--ds-size-*`, so unconverted pages scale (contracts/theme.md, "Interim
  bridge").
- [x] T005 [US5] In `W/styles/kihub/tokens.css`'s `body` rule, and through the bridge, stop
  forcing `font-size: 18px`. Let `body` inherit Designsystemet's `data-size="md"` body size.
- [x] T006 [P] [US6] Create `W/styles/app.css`:
  - `--ds-font-family: var(--font-inter), system-ui, sans-serif`;
  - `--app-content-width` and `--app-prose-width`;
  - layout primitives `.app-container`, `.app-section`, `.app-stack`, `.app-grid` (auto-fit,
    rem minmax), `.app-cluster`, all on `--ds-size-*`;
  - `.app-accent-word`;
  - a `prefers-reduced-motion` reset.
- [x] T007 [P] [US3] Create the client module `W/components/DesignsystemetWeb.tsx`: `'use client'`,
  `import '@digdir/designsystemet-web'`, `export function DesignsystemetWeb() { return null; }`.
- [x] T008 [US1] Update `W/app/themed-html.tsx`:
  - rename the font variable to `--font-inter`;
  - import `@/styles/app.css` after the theme and before `portal.css`;
  - render `<a class="ds-skip-link" href="#main-content">Hopp til hovedinnhold</a>` as the first
    child of `<body>`;
  - mount `<DesignsystemetWeb />`.
- [x] T009 [US1] Update `W/app/(app)/layout.tsx` to wrap `{children}` in
  `<main id="main-content" tabIndex={-1}>`.
- [x] T010 [US1] Replace the page-level `<main …>` with `<div …>`, keeping the classes, in:
  - `W/app/(app)/page.tsx`;
  - `news/page.tsx` and `news/[slug]/page.tsx`;
  - `prosjekter/page.tsx` and `prosjekter/[slug]/page.tsx`;
  - `events/page.tsx` and `events/[slug]/page.tsx`;
  - `registry/page.tsx`;
  - `artifacts/[artifactId]/page.tsx`;
  - `bidra/page.tsx`;
  - `W/components/LearningShell.tsx`.

  `W/app/(auth)/signin/page.tsx` keeps its own `<main id="main-content" tabIndex={-1}>`, because
  the auth layout has no shell.
- [x] T011 [US2] Rewrite `W/components/SiteHeader.tsx` per contracts/components.md "Global shell":
  - brand link with accessible name "Kitt KI HUB, forside";
  - "Søk" moved into the nav list (pass it to `SiteNav` as an extra item);
  - user name as `ds-paragraph data-size="sm"`;
  - Admin as `a.ds-link`;
  - Logg ut as `button.ds-button[data-variant=secondary][data-size=sm]`;
  - zero inline styles.
- [x] T012 [US1] Restyle `W/components/SiteNav.tsx`:
  - toggle is `button.ds-button[data-variant=tertiary]` with the fixed label "Meny",
    `aria-expanded` and `aria-controls`;
  - links are `a.ds-link[data-color=neutral]`;
  - keep the `aria-current` logic, and accept the extra "Søk" item.
- [x] T013 [US1] Rewrite `W/components/SiteFooter.tsx`:
  - `<footer data-color-scheme="dark">`;
  - a heading for each list (visible, or `ds-sr-only`) with `aria-labelledby`;
  - contacts and links as `a.ds-link`;
  - remove the inline 18px fonts.
- [x] T014 [US2] In `W/styles/portal.css`, move the header, nav and footer rules (lines ~37–149
  and ~292–361) into `W/styles/app.css` as `.app-header*`, `.app-nav*` and `.app-footer*`:
  - use only `--ds-*` tokens;
  - show the active nav item as a `--ds-border-width-focus` underline bar in
    `--ds-color-accent-base-default`;
  - add no hover-only colour cues.

  Delete the moved rules from portal.css.
- [x] T015 Gate: run lint, `tsc --noEmit` and the unit tests (quickstart "Static gates"), then the
  browser checks for the chrome on `/` and on one unconverted route (`/bidra`) to confirm the
  bridge holds.

**Checkpoint**: The shell is Designsystemet-native, and every route still renders.

---

## Phase 3: Slice 1, frontpage (US2 P1, US3)

**Goal**: The frontpage follows Digdir's profile. Tiles show the graphic colours only as shapes,
cards use Designsystemet patterns, and there are no eyebrows.

**Independent test**: Run quickstart steps 2–9 on `/`.

- [x] T016 [P] [US2] Add `tileAppearance(variant)` to `W/lib/frontpage-select.ts` (or a new
  `W/lib/frontpage-view.ts`):
  - `tinted` → `{ color: 'accent', shape: 'circle' }`;
  - `accent` → `{ color: 'neutral', shape: 'square' }`.

  Add unit tests in `apps/web/tests/unit/frontpage-defaults.test.ts`.
- [x] T017 [US2] Rewrite `W/components/FrontpageTile.tsx` as
  `<a class="ds-card" data-variant="tinted" data-color={color}>` containing:
  - `span.ds-tag`;
  - `h2.ds-heading[data-size=sm]`;
  - an `aria-hidden` arrow;
  - an inline decorative SVG shape filled with `--ds-color-brand1-base-default` (circle) or
    `--ds-color-brand2-base-default` (square), `aria-hidden`, placed in the corner.

  Remove the `.fp-tile--pink/--yellow`, `.kihub-tile` and minHeight inline styles.
- [x] T018 [US2] Rewrite `W/components/FrontpageHero.tsx`:
  - drop the eyebrow, or render it as `p.ds-paragraph[data-size=sm]` in sentence case;
  - `h1.ds-heading[data-size=2xl]` with the `.app-accent-word` span;
  - lead as `p.ds-paragraph[data-size=lg]`;
  - CTAs as `a.ds-button` (primary and secondary) with `aria-hidden` arrows;
  - the design element via the `.app-hero__art` class, with no inline style;
  - `alt=""` without `role`;
  - the art hidden below 40rem.
- [x] T019 [US3] Rewrite `W/components/SubscriptionsBanner.tsx`:
  - the card is `div.ds-card[data-color-scheme=dark]`;
  - chips are `button.ds-chip`, keeping `command="show-modal"`/`commandfor`;
  - the CTA is `button.ds-button[data-variant=secondary]`;
  - dialogs become native `<dialog class="ds-dialog" closedby="any">` siblings with an
    `h2.ds-heading`, `ds-paragraph` text and a close `button.ds-button[data-variant=tertiary]`
    with `command="close"` and an `aria-label` of "Lukk".

  Drop the `@digdir/designsystemet-react` import, and keep the 017 sibling rule.
- [x] T020 [US3] Rewrite `W/components/ContributeBanner.tsx` as
  `a.ds-card[data-variant=tinted][data-color=accent]`. Remove `aria-labelledby`, so the link name
  is the card text. Inside it, put an `h2.ds-heading`, a `ds-paragraph` and an `aria-hidden`
  arrow. Use no gradient and no rgba.
- [x] T021 [US3] Rewrite `W/components/NextEventCard.tsx`:
  - `article.ds-card` with `data-clickdelegatefor`;
  - the date block uses `ds-heading` and `ds-paragraph` sizes;
  - the type is an `EventTypeBadge` tag;
  - the title is `h3 > a.ds-link#id`;
  - one primary action: "Legg til i kalender" as `a.ds-button[data-variant=secondary]`;
  - remove the duplicate link and all 14 inline styles.
- [x] T022 [US3] Rewrite `W/components/EventsTimeline.tsx`:
  - `ol` with `a.ds-link` titles (underlined);
  - the "Senere" label as `h3.ds-heading[data-size=xs]` instead of an eyebrow;
  - the dots as decorative `::before` pseudo-elements;
  - remove the 7 inline styles.
- [x] T023 [US3] Rewrite `W/components/EventTypeBadge.tsx` as `span.ds-tag[data-color]` (webinar
  info, verksted warning, kurs success, konferanse danger, internt neutral). Put the mapping in
  `W/lib/events-view.ts` and remove the inline background (R10).
- [x] T024 [US1] Update `W/app/(app)/page.tsx`:
  - section heads use `h2.ds-heading[data-size=lg]` with no eyebrows;
  - "Se kalender" and "Alle nyheter" become `a.ds-link` with `aria-hidden` arrows;
  - the "Snarveier" section gets `h2.ds-sr-only`;
  - empty states use `div.ds-card` with `ds-paragraph`;
  - remove the 4 inline margins, using `.app-stack` and `.app-section`.
- [x] T025 [US6] Delete the frontpage rules that are now dead from `W/styles/portal.css` (lines
  ~150–291: hero, tiles, subscriptions, events and news section heads). Move the remaining layout
  into `W/styles/app.css` (`.app-hero`, `.app-fp-grid`) on `--ds-*` tokens.
- [x] T026 Gate: run lint, `tsc` and unit tests, then quickstart steps 2–9 on `/`.

---

## Phase 4: Slice 2, news and projects (US3, US1)

**Goal**: Cards, pagination and article pages are Designsystemet-native. Rich text has the
Designsystemet typography and a correct outline.

**Independent test**: Run quickstart on `/news`, `/news?page=2`, one article, `/prosjekter` and one
project.

- [x] T027 [P] [US1] Create `W/lib/ds-richtext.tsx`:
  - `richTextHeading(level)` → `{ tag: h2…h6, size }` (data-model.md);
  - the Payload Lexical `jsxConverters` overrides for heading, paragraph, list, link, table and
    quote, adding `ds-heading`, `ds-paragraph`, `ds-list`, `ds-link` and `ds-table`;
  - a react-markdown `components` map with the same classes.
- [x] T028 [P] [US1] Add `apps/web/tests/unit/ds-richtext.test.ts` covering the level clamp
  (h1→h2), the size mapping, and that the class names come out per element.
- [x] T029 [US3] Rewrite `W/components/NewsCard.tsx` as
  `article.ds-card[data-clickdelegatefor=news-{id}]`:
  - the media well first, keeping the 020 `object-position` focal point as the one allowed inline
    style;
  - an `h{headingLevel}.ds-heading[data-size=sm] > a#news-{id}`;
  - the date as a `time` inside `p.ds-paragraph[data-size=sm]`;
  - the summary as `ds-paragraph`;
  - no `textDecoration` inline and no px fonts.
- [x] T030 [P] [US3] Rewrite `W/components/ProjectCard.tsx` in the same pattern as T029.
- [x] T031 [US1] Rewrite `W/components/NewsPagination.tsx` as
  `nav.ds-pagination[aria-label=Sidenavigering]`:
  - `ul/li` of `a.ds-button` page links;
  - the current page is `data-variant=primary` with `aria-current="page"`; the others are
    tertiary;
  - prev and next are links that are omitted when unavailable;
  - no `aria-disabled` on spans.

  Keep `buildPagination` from `W/lib/news-view.ts`.
- [x] T032 [US1] Update `W/app/(app)/news/page.tsx`:
  - `h1.ds-heading[data-size=xl]`;
  - the grid uses `.app-grid`;
  - the empty state as a `ds-card` with `ds-paragraph`, not `p.kihub-h3`.
- [x] T033 [US1] Update `W/app/(app)/news/[slug]/page.tsx`:
  - back link as `a.ds-link` with an `aria-hidden` arrow;
  - `h1.ds-heading[data-size=xl]`;
  - meta as `ds-paragraph[data-size=sm]`;
  - tags as `span.ds-tag` in a `ul` with no bullets;
  - the body through `ds-richtext`;
  - the legacy hero `alt` uses the article title when the image is not decorative.
- [x] T034 [P] [US1] Update `W/app/(app)/prosjekter/page.tsx` and
  `W/app/(app)/prosjekter/[slug]/page.tsx` in the same patterns as T032 and T033.
- [x] T035 [US6] Delete the dead rules from the news and projects section of `W/styles/portal.css`
  (lines ~785–912). Move the card grid, media well and article layout into `W/styles/app.css` on
  `--ds-*` tokens.
- [x] T036 Gate: run lint, `tsc` and unit tests, then quickstart on the five news and projects
  URLs.

---

## Phase 5: Slice 3, events (US4 P2, US1)

**Goal**: The filters are a real GET form. The calendar and list have a correct outline,
captions, and type in text.

**Independent test**: Run quickstart on `/events`, `/events?view=calendar`, filtered URLs and one
event detail page, with JS disabled for step 8.

- [x] T037 [P] [US4] Add `eventsFilterState(searchParams)` to `W/lib/events-view.ts`. It returns
  the checked type, the checked form, and the preserved hidden params (view, month). Extend
  `apps/web/tests/unit/events-view.test.ts`.
- [x] T038 [US4] Rewrite `W/components/EventsFilters.tsx` as `<form method="get" action="/events">`
  per R6:
  - `fieldset.ds-fieldset` with `legend.ds-label`, "Type" and "Form";
  - `label.ds-chip` wrapping `input.ds-input[type=checkbox name=type]` and `[type=radio name=form]`
    (the "Alle" radio has an empty value);
  - hidden inputs from T037;
  - `button.ds-button[type=submit]` "Bruk filter";
  - `a.ds-link` "Nullstill filter";
  - no `aria-pressed`, no `<nav>` wrapper.
- [x] T039 [US1] Rewrite `W/components/EventsViewToggle.tsx` as `nav[aria-label=Visning]` with two
  `a.ds-button` links. The current one is `data-variant=primary` with `aria-current="page"`; the
  other is secondary.
- [x] T040 [US1] Update `W/components/EventsDayList.tsx`:
  - day headings are `h2.ds-heading[data-size=sm]` (fixing the h1→h3 skip);
  - entries are `h3 > a.ds-link`;
  - the date chip is `ds-tag`;
  - the arrows are `aria-hidden`.
- [x] T041 [US1] Update `W/components/EventsMonthCalendar.tsx`:
  - `table.ds-table` with `<caption>` naming the month (for example "Oktober 2026");
  - the weekday `th` cells use full names via `abbr`, with no uppercase;
  - each entry's accessible name includes the date and type;
  - "+N flere" becomes an `a.ds-link` to the list view for that day;
  - mobile dots get `ds-sr-only` type text.
- [x] T042 [US1] Update `W/app/(app)/events/page.tsx`:
  - `h1.ds-heading[data-size=xl]`;
  - the month h2 in the calendar view;
  - month nav as `a.ds-button[data-variant=tertiary][data-icon]` with `aria-label`s "Forrige
    måned" and "Neste måned" and `aria-hidden` glyphs.
- [x] T043 [US1] Update `W/app/(app)/events/[slug]/page.tsx`:
  - the h1 comes before the badge in the DOM;
  - back link as `a.ds-link`;
  - meta `dl` with `ds-paragraph` sizes, `dt` not uppercase;
  - the ICS link as `a.ds-button[data-variant=secondary]`;
  - the body through `ds-richtext`.
- [x] T044 [US6] Rewrite the events section of `W/styles/portal.css` (lines ~362–784):
  - re-point `--ev-cat-*` at `--ds-color-{info,warning,success,danger,neutral}-*`;
  - delete `.ev-filter*`, `.ev-toggle*` and `.ev-badge`;
  - remove all uppercase, letter-spacing and px fonts, including the 10px mobile `th`.

  Move what remains into `W/styles/app.css` (`.app-events*`).
- [x] T045 Gate: run lint, `tsc` and unit tests, then quickstart on the events URLs, with JS off
  for the filter step.

---

## Phase 6: Slice 4, learning (US3, US1)

**Goal**: The sidebar uses native `ds-details`, the body uses Designsystemet typography, and the
code blocks are accessible.

**Independent test**: Run quickstart on `/laering` and one learning page that has code, an image
and a video.

- [x] T046 [US3] Rewrite `W/components/LearningNav.tsx`:
  - `nav[aria-label="KI Læring"]` containing `details.ds-details` per category, with a `summary`;
  - subgroup titles as plain text or `ds-label`, not h3 (fixes headings appearing before the h1);
  - links as `a.ds-link[data-color=neutral]` with `aria-current="page"`.
- [x] T047 [US3] Update `W/components/LearningShell.tsx`: the mobile shell `<details>` becomes
  `details.ds-details`, with the custom marker removed.
- [x] T048 [US1] Update `W/components/LearningBody.tsx` to use the `ds-richtext` converters from
  T027, merged with the existing upload, code and YouTube converters. Drop `kihub-prose`.
- [x] T049 [US1] Update `W/components/LearningCodeBlock.tsx`: give `pre` `role="region"`, an
  `aria-label` of "Kodeeksempel ({language})" and `tabIndex={0}`. Make the language label
  sentence case, with no uppercase.
- [x] T050 [US1] Update `W/components/CopyButton.tsx`:
  - `button.ds-button[data-variant=secondary][data-size=sm]`, replacing the React `Button`;
  - a sibling `span role="status" class="ds-sr-only"` that announces `copiedLabel`.
- [x] T051 [US1] Update `W/app/(app)/laering/page.tsx` and `W/app/(app)/laering/[slug]/page.tsx`:
  - `h1.ds-heading`;
  - overview sections as h2 → h3 cards using the R5 pattern;
  - "Gå til …" as `a.ds-link` with `aria-hidden` arrows;
  - the context line without uppercase.
- [x] T052 [US6] Rewrite the learning section of `W/styles/portal.css` (lines ~913–1254):
  - delete the custom `summary` markers;
  - re-point the `--shiki-token-*` aliases at `--ds-color-*-text-*`;
  - remove uppercase, letter-spacing and px.

  Move what remains into `W/styles/app.css` (`.app-learning*`).
- [x] T053 Gate: run lint, `tsc` and unit tests, then quickstart on the learning URLs.

---

## Phase 7: Slice 5, registry, artifacts and sign-in (US1, US4)

**Goal**: The UI text is Norwegian, there is a correct h1, filters are native, search has a
visible label, and panels take a configurable heading level.

**Independent test**: Run quickstart on `/registry`, `/registry?type=…&tag=…`, one artifact and
`/signin`.

- [x] T054 [P] [US4] Add `registryFilterState(searchParams)` to `W/lib/registry-view.ts`, together
  with Norwegian labels for lifecycle and decisions. Extend
  `apps/web/tests/unit/registry-view.test.ts`.
- [x] T055 [US4] Rewrite `W/components/CatalogFilters.tsx` as a GET form per R6:
  - `fieldset.ds-fieldset` with the legends "Type" and "Emneord";
  - chip checkboxes;
  - a submit button and a reset link;
  - hidden `q`;
  - no Link-wrapped Tag, no `aria-pressed`, no colour-only state.
- [x] T056 [US1] Rewrite `W/components/SearchBar.tsx` as a server component:
  - `form[method=get][role=search]`;
  - visible `label.ds-label` "Søk i verktøy og ressurser";
  - `div.ds-search` containing `input[type=search].ds-input` and `button.ds-button` "Søk";
  - hidden filter params.

  Remove `'use client'` and the router logic.
- [x] T057 [P] [US1] Rewrite `W/components/ArtifactCard.tsx` with the R5 card pattern (`h2 > a`),
  `ds-tag` tags and a Norwegian lifecycle label, and de-duplicate "Approved".
- [x] T058 [P] [US1] Rewrite `W/components/LifecycleBadge.tsx` as `span.ds-tag[data-color]` with
  a Norwegian label from T054.
- [x] T059 [US1] Rewrite `W/components/GovernancePanel.tsx`:
  - `headingLevel` prop, default 2;
  - `div.ds-card`;
  - `dl` with `ds-paragraph`;
  - Norwegian labels;
  - `toLocaleString('nb-NO')`;
  - remove the 16 inline styles and the `#ddd` fallback.
- [x] T060 [US1] Rewrite `W/components/AgentCardPanel.tsx`:
  - `headingLevel` prop, default 2, with sub-headings at level + 1;
  - `div.ds-card`;
  - links as `a.ds-link`;
  - Norwegian labels;
  - remove the 17 inline styles and the rem font sizes.
- [x] T061 [US1] Update `W/components/Markdown.tsx`: use the `ds-richtext` react-markdown map,
  drop `ds-prose` and the inline style, and add a `lang` prop that the README sets to `en`.
- [x] T062 [US1] Update `W/app/(app)/registry/page.tsx`:
  - `h1.ds-heading` "Verktøy og ressurser" (replacing the h2);
  - Norwegian copy;
  - the `.app-sidebar-layout` class instead of the inline 220px grid;
  - empty states as `ds-card`;
  - drop the React imports.
- [x] T063 [US1] Update `W/app/(app)/artifacts/[artifactId]/page.tsx`:
  - `h1.ds-heading` with the artifact name;
  - back link as `a.ds-link`;
  - `dl` without `<strong>` in `dt`;
  - install as `div.ds-card`;
  - README via `Markdown lang="en"`;
  - Norwegian labels;
  - remove the 17 inline styles and the `#f2f2f2`.
- [x] T064 [US1] Update `W/app/(auth)/signin/page.tsx`:
  - Norwegian copy;
  - `div.ds-alert` for the mock-mode notice;
  - persona buttons as `button.ds-button[data-variant=secondary]` with `aria-describedby`
    pointing at their hint `p.ds-paragraph[data-size=sm]`;
  - its own `main#main-content`;
  - mount `<DesignsystemetWeb />` if `(auth)/layout.tsx` does not use `ThemedHtml`;
  - remove the 9 inline styles and the React imports.
- [x] T065 Gate: run lint, `tsc` and unit tests, then quickstart on the registry, artifact and
  sign-in URLs, with JS off for filters and search.

---

## Phase 8: Slice 6, /bidra (US3, US1)

**Goal**: The longest page uses only Designsystemet patterns and has a correct outline.

**Independent test**: Run quickstart on `/bidra`.

- [x] T066 [US3] Update `W/app/(app)/bidra/page.tsx`:
  - `.bidra-btn` links → `a.ds-button`;
  - `kihub-tag--on-accent` and `.bidra-pill` → `span.ds-tag`;
  - `.bidra-table` → `table.ds-table` with `<caption>`, keeping the labelled scroll region;
  - FAQ and step `<details>` → `details.ds-details`;
  - `.bidra-note` and `.bidra-tip` → `div.ds-alert[data-color=info|warning]`;
  - all headings → `ds-heading` with a correct outline;
  - `AgentCardPanel headingLevel={4}`;
  - TOC links → `a.ds-link`;
  - `aria-hidden` arrows.
- [x] T067 [US2] Restyle the /bidra hero in the same pattern as the frontpage hero (T018). Remove
  the gradient and rgba sweep, and drop the hover lift on the non-interactive `.bidra-benefit` and
  `.bidra-type-card` cards.
- [x] T068 [US6] Rewrite the /bidra and contribute section of `W/styles/portal.css` (lines
  ~1255–1711):
  - delete the rules replaced by Designsystemet components;
  - remove hex, rgba, px, uppercase and the hover lifts;
  - keep the reduced-motion block only if any motion remains.

  Move what remains into `W/styles/app.css` (`.app-bidra*`).
- [x] T069 Gate: run lint, `tsc` and unit tests, then quickstart on `/bidra`.

---

## Phase 9: Slice 7, cleanup, governance and full sweep (US6, all)

- [x] T070 [US6] Amend `.specify/memory/constitution.md` to v4.0.0 per research R14:
  - rewrite the Design System constraint §1–5;
  - write the Sync Impact Report header;
  - set Last Amended to the amendment date.
- [x] T071 [US6] Delete `W/styles/kihub/` (tokens.css, components.css, tokens.ts, README.md),
  `W/styles/kihub-ds-bridge.css` and `W/styles/kihub-fonts.css`. Remove their imports from
  `W/app/themed-html.tsx`. Grep for any remaining `--kihub-` or `kihub-` usage and fix it.
- [x] T072 [US6] Fold whatever remains of `W/styles/portal.css` into `W/styles/app.css`. Delete
  `portal.css` and its import, then confirm that `app.css` is at most about 1,000 lines (SC-007).
- [x] T073 [US6] Run the quickstart "Source checks" greps, then fix any custom duplicate of a
  Designsystemet component, any inline visual style, and any hard-coded colour, px or uppercase.
- [x] T074 [P] [US6] Confirm that no employee-facing file imports `@digdir/designsystemet-react`
  (`grep -rn designsystemet-react W/app W/components`). Keep the dependency only if `/cms`
  or anything else still needs it; otherwise note that it can be removed.
- [x] T075 [P] Update `README.md` (the design system section) and `CLAUDE.md` (the SPECKIT block:
  026 DONE plus durable gotchas).
- [x] T076 Run the full verification: `next build` against a migrated scratch DB with
  `AUTH_MODE=entra` (014 notes), then quickstart browser steps 2–9 on all 14 routes. Record the
  axe results per route in this file's Notes, as evidence for SC-001 through SC-005 and SC-008.

---

## Dependencies & execution order

- **Phase 1 → Phase 2** block everything.
- **Slices 1–6** (Phases 3–8) each depend only on slice 0, so they can run in any order or in
  parallel by separate people:
  - T027, the `ds-richtext` helper in slice 2, is reused by slices 3, 4 and 5. If those run first,
    pull T027–T028 forward.
  - T023, `EventTypeBadge` in slice 1, is reused by slice 3.
- **Slice 7** depends on all slices.
- **Within a slice**: helpers and tests marked [P] come first, then components, then pages, then
  CSS cleanup, then the gate.

## Parallel opportunities

| Slice | Tasks that can run in parallel |
| --- | --- |
| 0 | T006 and T007, alongside T004 and T005 |
| 1 | T016 alongside T018–T023, which touch different component files |
| 2 | T027 and T028; T030 and T034 alongside T029 and T031 |
| 3 | T037 alongside T039–T041 |
| 5 | T054, T057 and T058 |
| 7 | T074 and T075 |

## Implementation strategy

- **MVP = Phases 1 and 2 (slice 0).** On its own it fixes the worst accessibility gaps on every
  page: skip link, main landmark, focus on dark surfaces, rem type through the bridge. It also
  lands Digdir's theme everywhere.
- **Then slice 1, the frontpage.** It is the most visible part of the Digdir look, from US2.
- **Then by risk:** events (filters), registry (filters, language), then news, learning and /bidra.
- **Ship each slice as its own reviewable change.** The user handles git.

## Notes

- Saved CMS content needs no migration. Tile variants, the hero `accentWord` and subscription
  chips are mapped in data-model.md.
- `theme:build --clean` briefly deletes `design-tokens-build/kihub.css`, so a running dev server
  logs a transient "Module not found" (025 gotcha).
- Browser verification needs `apps/web/.env` and a local Postgres (quickstart prerequisites).

### Implementation record: slice 0 (2026-10-21)

- **T001–T014 done.** These deviate from the task text:
  - **T005.** The body size is handed back to Designsystemet in `kihub-ds-bridge.css`, not by
    editing the synced `kihub/tokens.css`.
  - **T008.** `kihub-fonts.css` was deleted in slice 0, not slice 7. Its two jobs moved: the font
    tokens and heading weight went into the bridge, and `--ds-font-family` went into `app.css`.
  - **T014.** The old `.site-*` and `.portal-shell` classes are renamed to `.app-header*`,
    `.app-nav*`, `.app-footer*` and `.app-shell`. The `.portal-shell > main.bidra` override was
    dropped, because pages no longer render `<main>`.
- **T015 is done** (2026-10-21, after local Postgres in Docker plus `apps/web/.env` were set up):
  - **Static gates:** lint clean, `tsc` clean, unit tests 243/243.
  - **Signed in as mock "Ada Employee":**
    - Tab once focuses "Hopp til hovedinnhold"; Enter moves focus to `main#main-content`.
    - The header nav marks the current page with a bar.
    - The footer runs in the dark scheme. Its focus ring is `#ebeced` on `#13181f`, so it is now
      visible.
  - **Mobile (375px, 320px):** one header row (logo plus "Meny"). The toggle sets `aria-expanded`,
    and the panel holds the nav, the user name and "Logg ut". There is no horizontal scroll.
  - **axe 4.10.2 (wcag2a/aa, 21a/aa, 22aa):** every route reachable with the empty DB has a skip
    link first, exactly one `main` and a page title. Routes checked: `/`, `/news`, `/events` (both
    views), `/prosjekter`, `/laering`, `/registry`, `/bidra`. The violations that remain all belong
    to later slices:
    - `/`: `.kihub-tag--on-accent` contrast 4.43:1 (slice 1, T020);
    - `/events`: `aria-pressed` on filter links (slice 3, T038);
    - `/registry`: no h1 (slice 5, T062).
- **Added during verification** (outside the original task text):
  - **Page titles.** Axe found NO `<title>` on any page (WCAG 2.4.2). Both layouts now share the
    `SITE_TITLE` template "%s · KI Hub" from `themed-html.tsx`. The list pages (Nyheter,
    Arrangementer, Prosjekter, Verktøy og ressurser, Logg inn) got titles, and /bidra's title lost
    its hand-written suffix.
  - **Detail-page titles still needed.** `/news/[slug]`, `/events/[slug]`, `/prosjekter/[slug]`,
    `/laering/[slug]` and `/artifacts/[id]` need `generateMetadata` in their own slices. Until
    then they show "KI Hub".
  - **Header restructure.** `SiteNav` now owns a `#site-menu` panel that wraps the nav and the
    server-rendered user cluster (passed as `children`). This keeps the phone header to one row
    instead of three.
  - **Interim hero fix.** The hero h1 steps down below 45rem (`portal.css`), because rem scaling
    made "intelligens" overflow 320px.
- **Gotcha.** A parse error caught mid-edit by Turbopack left SERVER rendering on the stale module
  even after the file was fixed, which showed up as a hydration mismatch. Restarting the dev
  server cleared it.

### Implementation record: slice 1, frontpage (2026-10-21)

- **T016–T026 done.** These deviate from the task text:
  - **T016.** `tileAppearance` lives in a new `lib/frontpage-view.ts` and returns
    `{ color, shape, graphic }`. It is tested in a new `tests/unit/frontpage-view.test.ts`
    (4 tests), not in `frontpage-defaults.test.ts`. `EVENT_TYPE_COLORS` (T023) got 2 tests in
    `events-view.test.ts`.
  - **T017.** The tile title is an **h3**, not h2, because the tiles sit in the hidden
    "Snarveier" h2 section, which axe/outline review flagged. The tile arrow was dropped: the
    Designsystemet link card underlines its heading as the link cue. The tag is
    `ds-tag data-variant="outline"`.
  - **T019.** Native `dialog.ds-dialog` with Designsystemet's empty icon close button (the same
    markup the React `Dialog` renders), with no `closedby`. Escape and the close button both close
    it; there is no light dismiss, which matches the 017 behaviour.
  - **T020.** The "Les veiledningen →" CTA line was dropped; the underlined heading is the cue.
  - **T021.** `aria-labelledby` points at the "Neste arrangement" label.
  - **T022.** The timeline dot is a single accent colour instead of four cycling shades.
- **Design change to review.** 025 made the frontpage cards FLAT with no hover shift.
  Designsystemet's link card has a built-in hover surface plus an underlined heading. I kept the
  Designsystemet pattern, which is what the user asked for in 026.
- **Shared text helpers in app.css.** `.app-kicker` uses the context's `text-subtle`.
  `.app-meta` and the hero lead use `--ds-color-neutral-text-subtle` explicitly: the page's
  `data-color="accent"` makes the unprefixed role token blue (seen at 320px).
- **Narrow screens (< 30rem).** The page gutter and `--dsc-card-padding` (a documented component
  variable) drop to `--ds-size-4`.
- **Verified** on the local DB, seeded with 5 events and 3 news items by a throwaway scratchpad
  script that is not in the repo:
  - **axe on `/`:** 0 violations, best-practice rules included.
  - **Heading outline:** h1 → h2 sections → h3 cards and tiles.
  - **Chip dialog:** it opens as a modal, focus goes to the close button, the dialog is light
    (white with Blåsvart text) over the dark card, and the close button returns focus to the chip.
  - **Event card:** a click on its date block navigates to the event (click delegation).
  - **Tiles:** Tab focus shows a 3px `#1f2c3d` ring.
  - **Reflow:** at 320px there is no horizontal scroll and the hero h1 steps down to `lg`.
  - **Other routes:** `/events` and `/events/[slug]` show the new type tags.
  - **Gates:** lint and `tsc` clean, unit tests 249/249.
- **Left for later slices.**
  - **News cards (slice 2).** The frontpage still uses the old `NewsCard`.
  - **Events cleanup (slice 3).** The `.ev-badge` CSS is now unused and goes with the events
    cleanup (T044).
  - **Dialog rich text (slice 2).** Dialog bodies use plain `RichText` inside `.app-richtext`
    until the `ds-richtext` converters land (T027).

### Implementation record: slice 2, news and projects (2026-10-21)

- **T027–T036 done.** These deviate from the task text:
  - **T027 file split.** The helper is two files:
    - `lib/ds-richtext.ts` (pure): `richTextHeading(level, minHeadingLevel = 2)` plus types.
    - `lib/ds-richtext-converters.tsx` (JSX): `dsConverterOverrides`, `dsConverters` and
      `dsMarkdownComponents`.
    
    Vitest cannot parse JSX here (the tsconfig uses `jsx: preserve`), which is the same reason the
    repo keeps `learning-view.ts` pure.
  - **T027 converters.** Paragraph, list and link reuse Payload's default converters and add the
    `ds-*` class with `cloneElement`, so internal-link `href` resolution and checklists keep
    Payload's own behaviour. Headings and tables are re-implemented. Tables get a labelled,
    focusable `.app-scroll-region`.
  - **T028.** `tests/unit/ds-richtext.test.ts` has 4 tests.
  - **T031.** `buildPagination` gained `items` (numbered pages, with `null` for an ellipsis), built
    by a new pure `pageNumbers(page, total)`: all pages up to 7, otherwise 7 fixed slots. It has
    4 new tests in `news-view.test.ts`. Markup follows Designsystemet's `ds-pagination`: the
    current page uses `aria-current="true"`, which is what its CSS keys on. An unavailable
    direction is an `aria-hidden` span that Designsystemet hides while keeping the slot.
  - **T033.** The detail pages got `generateMetadata` titles, through a per-request React `cache()`
    lookup shared with the page.
  - **T033 legacy image.** The legacy `heroImageUrl` image keeps `alt=""`, because there is no
    stored alt text and the h1 names the content. Uploads use the media alt (020).
  - **T019 follow-up.** The subscription dialogs now render through `dsConverters({ minHeadingLevel: 3 })`.
- **Colour context.** Designsystemet cards and paragraphs take `--ds-color-text-default` from the
  surrounding `data-color`, and `<html>` is `accent`. That turned card text navy `#002c54`. Content
  cards (news, project, next-event, empty states) now set `data-color="neutral"`. **Rule:** neutral
  surfaces set `data-color="neutral"` explicitly. Only accent-tinted cards (tiles, contribute) stay
  accent.
- **Rich-text rhythm.** Payload's `<RichText>` wraps its output in `div.payload-richtext`. The
  `.app-richtext` flow and heading-spacing rules therefore target both
  `.app-richtext > *` and `.app-richtext > .payload-richtext > *`.
- **Hyphenation.** `main :is(h1–h4) { hyphens: auto }` is in place. This Chromium has no `nb`
  dictionary, so it was not visible in verification; `overflow-wrap: anywhere` still prevents
  overflow.
- **Verified** on the local DB, plus a scratchpad seed of 12 more news items (one with
  h1/h2/h3/list/link rich text) and 2 projects:
  - **axe (wcag2a/aa, 21, 22aa and best-practice):** 0 violations on `/`, `/news`,
    `/news?page=2`, the rich article, `/prosjekter` and a project. Each has one h1, no skipped
    heading level and its own `<title>`.
  - **Rich text:** the editor's h1 renders as h2[md], followed by h2 and h3.
  - **News card:** the link's accessible name is the headline only, and clicking the image area
    opens the article.
  - **Pagination:** page 2 shows Forrige, 1, 2 (current), and Neste is hidden.
  - **Reflow:** no horizontal scroll at 320px on `/news?page=2`, the article and `/prosjekter`.
  - **Gates:** lint and `tsc` clean, unit tests 257/257.
  - **CSS total:** 1,750 lines (app.css plus portal.css).

### Implementation record: slice 3, events (2026-10-21)

- **T037–T045 done.** These deviate from the task text:
  - **T037.** No new `eventsFilterState` helper. The filter form posts exactly the
    `?type=…&type=…&form=…` shape that `parseEventsSearchParams` already reads, and the filters
    only exist in the list view, so there are no other params to carry as hidden inputs (YAGNI).
    Three new tests pin that contract: repeated/deduplicated types, the "Alle" radio's empty
    `form=` meaning no filter, and unknown values being ignored.
    `weekdayHeaders()` now returns `{ short: 'Man', long: 'mandag' }` (sentence case) instead of
    `'MAN'`, and its test was updated. Events tests: 39.
  - **T038.** Chips are `label.ds-chip > input.ds-input[type=checkbox|radio]`, the same markup
    Designsystemet's React `Chip.Checkbox` renders. There is no auto-submit, because a change of
    context on input would fail WCAG 3.2.2.
  - **T040.** The decorative row arrow was dropped (the title link is underlined). `EventsDayList`
    takes `headingLevel` (2 for the list, 3 for the phone agenda under the month h2). Day
    sections have `id="dag-YYYY-MM-DD"`.
  - **T041.**
    - Weekday headers: the visible short name is `aria-hidden`, and the full name is in
      `ds-sr-only`.
    - Today: the cell has `aria-current="date"` plus a hidden "(i dag)".
    - "+N flere" links to `/events#dag-…` for days from today on; past days keep plain text, since
      the list only shows upcoming events.
    - Colour dots use `span.app-dot[data-color]`, so there are no inline styles.
    - The scroll wrapper was dropped: phones get the dot overview plus the agenda instead.
  - **T042.** Month navigation uses `ds-button` tertiary icon links with an inline chevron SVG.
  - **T043.** The online link announces "(åpnes i ny fane)". The page got a `generateMetadata`
    title.
  - **T044.** The whole 012 events block (423 lines, including the `--ev-cat-*` aliases and
    `.ev-badge`) was deleted from portal.css. Nothing outside events used it.
- **Shared rules added to app.css:**
  - `.app-page-head`;
  - `.app-sidebar-layout` (reused by the registry in slice 5);
  - `.app-filters` / `.app-chip-group`;
  - on phones (< 30rem), every `main h1[data-size=xl]` steps down to the md heading size.
    Chromium DOES hyphenate `nb`; at the lg size it split "Arrangemen-ter".
- **Verified:**
  - **axe (wcag2a/aa, 21, 22aa and best-practice):** 0 violations on `/events`, a no-match filter,
    a two-type filter, the calendar (current month and November) and an event detail page.
  - **Heading outline:** the list goes h1 → h2 days → h3 titles. The calendar is h1 → h2, and the
    agenda, visible only on phones, adds h3 → h4.
  - **Filters:** submitting gives `?type=kurs&form=oppmote`. The checked state survives the reload
    and "Nullstill filtre" appears. It is a native `<form method="get">`, so it does not depend
    on JS.
  - **Calendar:** caption "Oktober 2026"; entry name "…, Webinar, Lørdag 24. oktober kl. 12:00".
  - **Reflow at 320px:** no horizontal scroll on the list or the calendar (dots plus agenda).
  - **Gates:** lint and `tsc` clean, unit tests 260/260.
  - **CSS total:** 1,572 lines.

### Implementation record: slice 4, KI Læring (2026-10-21)

- **T046–T053 done.** These deviate from the task text:
  - **T046.** A subcategory is a `p` label plus a `ul aria-labelledby`, not an h3. The nav sets
    `data-color="neutral"`, so the `ds-details` open and hover tints are neutral rather than
    accent.
  - **T047.** On wide screens the shell disclosure (`details.ds-details`) hides its summary, drops
    the Designsystemet border and background, and forces `::details-content` open: the 014
    technique applied to the Designsystemet element.
  - **T049.** The shiki token colours stay inline styles. They are per-token data (the FR-021
    exception), and their values are `var(--shiki-…)` aliases. The `pre` region gets a
    Designsystemet inset focus ring in app.css.
  - **T050.** `CopyButton` is still the one client component, now a plain `ds-button`. Its call
    sites are unchanged (the artifact page keeps the English defaults until slice 5).
  - **T051.** The overview categories are neutral `ds-card` sections (h2, description and
    "Gå til …" link). The detail page got a `generateMetadata` title through `cache()`. The context
    line is an `.app-kicker` (accent `text-subtle`, sentence case).
  - **T052.** The whole 014 block (342 lines) was deleted from portal.css. The `--shiki-*` aliases
    now resolve to `--ds-color-*-text-*` directly.
- **Gotchas:**
  - **Animation timing.** Designsystemet animates `ds-details` opening over 0.4s, so a screenshot
    taken right after a click shows the panel still closed. That is expected, not a bug.
  - **Seed failures.** The scratchpad seed initially failed (code language `ts` is not in
    `LEARNING_CODE_LANGUAGES`; the id is `typescript`) and left orphan categories behind. They
    were cleared with psql, since the local DB had no other learning content.
- **Verified** on the local DB, plus a scratchpad seed of 2 categories, 1 subcategory and 3 pages
  (one with a TypeScript code block and a YouTube block):
  - **axe (wcag2a/aa, 21, 22aa and best-practice):** 0 violations on `/laering` and two pages.
    The h1 is now the FIRST heading in `main`; the sidebar h3s used to precede it.
  - **Navigation:** the current page is marked, "Avansert bruk" opens to the labelled "Agenter"
    list, and the code region is named "Kodeeksempel (TypeScript)".
  - **Copy announcement:** "Kopiert" is announced via `role="status"`. This was checked with a
    stubbed clipboard, because the real one is blocked in automation.
  - **320px:** the navigation collapses into "Utforsk innhold" and opens with the nested groups.
    There is no page-level horizontal scroll; the long code line scrolls inside its own region.
  - **Gates:** lint and `tsc` clean, unit tests 260/260.
  - **CSS total:** 1,428 lines.

### Implementation record: slice 5, registry, artifacts and sign-in (2026-10-21)

- **T054–T065 done.** These deviate from the task text:
  - **T054.** `lib/registry-view.ts` gained:
    - Norwegian label maps: lifecycle, approval, review status, risk, review type, review
      decision, visibility;
    - `labelFor(map, value)`, which falls back to the raw value or "—";
    - `lifecycleTags(governance)`, which deduplicates tags so "Godkjent" is never repeated;
    - `parseRegistrySearchParams` (an empty type means "Alle"; tags are deduplicated with blanks
      dropped; q is trimmed), used by the page in place of its inline parsing. It is named after
      the events parser, not `registryFilterState`.

    The registry tests went from 4 to 11.
  - **T055.** Type is a radio group with "Alle", because the catalog filters on a single type.
    Tags are checkboxes. The active `q` is carried as a hidden input, and "Nullstill filtre" keeps
    the search.
  - **T056.** `SearchBar` is a server component with a GET form and `ds-search`. The active
    type/tags are hidden inputs. There is no reset button, because a native reset restores the
    current query instead of clearing it; a "Tøm søk" link that keeps the filters takes its place.
  - **T059 and T060.** `GovernancePanel` and `AgentCardPanel` take `headingLevel` (default 2).
    /bidra still embeds `AgentCardPanel` at the default level; slice 6 (T066) passes
    `headingLevel={4}`.
    `AgentCardPanel` guards `new URL(provider.url)`: a malformed URL in a card used to throw while
    rendering.
  - **T061.** `Markdown` takes `lang` and `minHeadingLevel` (default 3). The artifact page renders
    the README under its own h2 with `lang="en"`.
  - **T063.** The detail page got a `generateMetadata` title via `cache()`. Sections are h2
    (Installasjon, Agentkort, README, Styring).
  - **T064.** The persona hints are Norwegian. The persona names are kept, because they are the
    fixed mock identities in `auth/claims.ts`. Each hint is linked with `aria-describedby`.
- **Milestone.** No employee-facing file imports `@digdir/designsystemet-react` any more
  (`grep -rln designsystemet-react src/app src/components` finds nothing). T074 can decide
  whether to drop the dependency.
- **Spacing rule (again).** Lists inside a `ds-card` must not set `margin: 0`, because that kills
  the card's child spacing. They set `margin-inline: 0; margin-block-end: 0` instead.
- **Verified** on the local DB, plus a scratchpad seed of 3 artifacts: an approved skill with an
  install command and a README containing h1/h2/list/table/link, an experimental agent with a
  full A2A card, and a draft prompt.
  - **axe (wcag2a/aa, 21, 22aa and best-practice):** 0 violations on `/registry`, search + type,
    two tags, no-hit search, all three artifacts, `/signin` and `/signin?error=…`. All have one
    h1, no skipped heading levels and their own titles.
  - **Search and filters:** `?q=agent` plus the "Agent" type radio gives `?q=agent&type=agent`,
    with 1 hit "med valgte filtre", the search value kept and type carried as a hidden input.
    Full-text search stems words ("møtereferater" matches "Møtereferat"). "møte" gives 0 hits,
    because the search matches whole words, not prefixes (unchanged behaviour, not in scope).
  - **README:** `lang="en"`, headings at h3, the table in a labelled region, links as `ds-link`.
  - **320px:** no horizontal scroll on the registry, the artifact or sign-in.
  - **Gates:** lint and `tsc` clean, unit tests 267/267.
  - **CSS:** app.css 1,121 lines plus portal.css 432 (/bidra only).

### Implementation record: slice 6, /bidra (2026-10-21)

- **T066–T069 done.** These deviate from the task text:
  - **T066.**
    - Section eyebrows were dropped (each h2 says it).
    - The 6 steps are a native `ol` whose number is a decorative `::before` counter, not an
      `aria-hidden` div.
    - Option and compare blocks are `ds-card`s ("Med KI Hub" is `data-color=success` tinted).
    - Mistakes read "Symptom: … / Løsning: …" in text instead of ⚠/→ glyphs.
    - The table has a visually hidden caption.
    - `AgentCardPanel headingLevel={4}`, so the outline stays correct under the h3 step.
  - **T067.** The hero uses the frontpage pattern (`.app-hero` plus the Digdir design-element
    SVG). The animated typing code window, light beam, gradient and scroll-reveal motion are gone.
    That art was decorative and `aria-hidden`; the user may want to review the simpler hero.
  - **T068, with part of T072 pulled forward.** All /bidra rules (432 lines) were replaced by an
    ~200-line `.app-guide*` section in app.css. **`portal.css` is DELETED** and its import removed
    from `themed-html.tsx`, because it held nothing else. A stale `portal.css` reference in a
    `lib/learning-code.ts` comment was updated.
- **Shared fixes found on /bidra** (they apply app-wide):
  - **Unique names.** Code blocks (`LearningCodeBlock`) and rich-text table wrappers
    (`ds-richtext`) are now `role="group"`, not `role="region"`. A page with two YAML samples gave
    two regions both named "Kodeeksempel (YAML)", and axe's `landmark-unique` requires distinct
    landmark names. A group keeps the name and focusability without that rule.
  - **Inline code.** `main :not(pre) > code { overflow-wrap: anywhere }`, so URLs and paths wrap
    instead of widening the page.
  - **Hidden captions.** `.app-scroll-region { position: relative }`. A `ds-sr-only` caption is
    absolutely positioned, so without this it escapes the scroller.
  - **Grid sizing.** Grids holding code need `grid-template-columns: minmax(0, 1fr)` (an implicit
    column sizes to its content). Auto-fit grid items need `min-width: 0`.
- **Gotcha.** Deleting an imported CSS file while `next dev` runs left Turbopack serving a 500
  ("module factory is not available"). A dev-server restart fixed it.
- **Verified:**
  - **Full axe sweep** (wcag2a/aa, 21, 22aa and best-practice): 0 violations and exactly one h1
    on all 15 routes: `/`, `/news`, a news article, `/prosjekter`, a project, `/events`, the
    calendar, an event, `/laering`, a learning page, `/registry`, two artifacts, `/bidra` and
    `/signin`.
  - **320px:** 0px horizontal overflow on all 15.
  - **Source:** no `kihub-*` class is used anywhere in `src/**/*.tsx`. The only inline styles are
    the two documented dynamic ones (news focal point, shiki token colours).
  - **Gates:** lint and `tsc` clean, unit tests 267/267.
  - **CSS:** app.css 1,328 lines. The dead kihub layer (tokens, components, bridge: 392 lines)
    goes in slice 7.

### Implementation record: slice 7, cleanup, governance and full sweep (2026-10-21)

- **T070.** The constitution is at **v4.0.0** (MAJOR):
  - new Sync Impact Report;
  - the Design System constraint is rewritten as §1–§5 (theme, plain-HTML components,
    custom components on `--ds-*` only, `--dsc-*` as the only restyling, WCAG 2.2 AA);
  - Principle VIII names Digdir's official theme;
  - a new **Accessibility** quality gate (0 axe violations plus a keyboard pass);
  - Last Amended 2026-10-21.
- **T071.** Deleted `styles/kihub/` (tokens.css, components.css, tokens.ts, README.md) and
  `kihub-ds-bridge.css`, and removed their imports. No `--kihub-` or `kihub-*` reference remains in
  `src`.
  **Regression found and fixed:** the kihub `tokens.css` was the only rule setting the body
  typeface. Designsystemet sets body colour, background, size and line height, but not
  `font-family`, so text fell back to Times. app.css now sets
  `body { font-family: var(--ds-font-family) }`.
- **T072.** `portal.css` was already deleted in slice 6.
  **SC-007 / the T072 target is NOT met. The user ACCEPTED the −36% result on 2026-10-21, as
  recorded in spec.md SC-007.** app.css is the only app stylesheet, at 1,330 lines,
  against ~2,070 before (−36%, not ≥ −50%; target ≤ ~1,000). All of it is token-based layout or
  the custom components Designsystemet lacks, written one declaration per line, while the old
  /bidra CSS was dense one-liners. Reaching the number would mean compressing formatting, not
  removing duplication, so it is left for the user to decide.
- **T073 source checks:**
  - 0 `kihub-*` classes or tokens;
  - 0 hard-coded hex, rgba, px, uppercase or letter-spacing values in app.css (outside comments);
  - inline styles only in the two documented dynamic cases (news focal point, shiki token colours).
- **T074.** `@digdir/designsystemet-react` was imported nowhere (only a comment in
  `types/dom-invoker-commands.d.ts`, now reworded), so it was **removed** from
  `apps/web/package.json` and the lockfile. `-css`, `-web` and the `designsystemet` CLI remain.
- **T075.** The README gained a 026 Status entry and a "Design system and accessibility" section,
  and links the spec. CLAUDE.md's SPECKIT block now records 026 as DONE.
- **T076 full verification:**
  - **`next build`** passes (compiled, typechecked, 13/13 static pages). It ran against a scratch
    DB `kihub_build`, created in the `kihub-postgres` container and migrated with `pnpm migrate`,
    with `AUTH_MODE=entra` and placeholder Entra values. The scratch DB was left in place for
    future builds.
  - **axe 4.10.2** (wcag2a/aa, 21a/aa, 22aa and best-practice): **0 violations on all 18 URLs**:
    `/`, `/news`, `/news?page=2`, a news article, `/prosjekter`, a project, `/events`, a filtered
    events list, the calendar, an event, `/laering`, a learning page, `/registry`, search + filter,
    two artifacts, `/bidra` and `/signin`.
  - **Structure:** every URL has exactly one h1, no skipped heading level, the skip link as the
    first focusable element, and Inter on all text.
  - **320px:** 0px horizontal overflow on all 18.
  - **SC-003:** with the root font raised from 16px to 24px (a proxy for the browser setting),
    body, h1 and paragraph text scale 1.50× (body 18→27px, h1 60→90px).
  - **Keyboard:** 30 real Tab presses on `/` (checked synchronously in `focusin`) show a focus ring
    on every app stop. The exceptions are the skip link, whose focus indication is appearing as a
    full-width banner (the Designsystemet design), and the Next.js dev overlay.
  - **Gates:** lint and `tsc` clean, unit tests **267/267**.
  - **Diff vs main:** 80 files, +3,258 / −4,790. Nothing staged or committed (user rule).
- **Not verified in this session:**
  - real screen-reader output (VoiceOver/NVDA), as opposed to the accessibility tree and axe;
  - browsers other than Chromium, including the Invoker Commands polyfill path in Safari and
    Firefox;
  - dark mode (out of scope);
  - integration tests (`tests/integration`), which were not run (only unit tests).

### Follow-up: header, breadcrumbs and Aksel icons (2026-10-21)

- **Header hover.**
  - **Problem:** Designsystemet's neutral link hover is `text-subtle`, so hovered nav links turned
    grey and read as disabled. Hover also added a text underline while the current page used a
    bottom bar.
  - **Fix:** the text stays Blåsvart (`--dsc-link-color--hover`), and hover shows the same bar in
    neutral while the current page keeps it in accent (on the inline-start edge in the panel).
    The logo label underlines on hover.
- **Hamburger menu, modelled on Designsystemet's own site header**
  (digdir/designsystemet `internal/components/src/header/header.tsx`):
  - **No fixed breakpoint.** The header row never wraps, but the nav list may. `SiteNav` switches
    to hamburger mode as soon as the list wraps (`itemsWrap`), and back only when the window is
    more than 50px wider than where it switched (`nextHamburgerState`, hysteresis). Both live in
    the pure `lib/header-view.ts`, with 6 tests.
  - **Panel.** A native `popover="auto"` sheet opened by a `popovertarget` button ("Meny" with
    `MenuHamburgerIcon`) and closed by an icon button (`XMarkIcon`, "Lukk meny"). Escape and
    light dismiss come from the browser, and focus returns to "Meny". The panel closes when focus
    leaves it (`onBlur`) or when a link is chosen (a delegated click on the `ul`). It holds the
    nav, "Søk" and the user cluster.
  - **No-JS fallback.** The full list wraps, so every link stays reachable. The old version hid
    the list below 56.25rem and needed JS for the toggle.
  - **Verified:** with this browser's 18px default font it switches at 1,180px, stays a
    hamburger at 1,220px and returns at 1,240px. Escape closes and refocuses "Meny". Choosing
    "Prosjekter" navigates, closes the panel and marks it current. Tabbing past "Logg ut" closes
    the panel.
- **Breadcrumbs.** The new server component `components/Breadcrumbs.tsx` is Designsystemet's
  pattern as plain HTML: `nav.ds-breadcrumbs` with a back link and an `ol`, and the current page
  marked `aria-current="page"` on the server. The `<ds-breadcrumbs>` web element would set these
  at runtime. It replaces the "← Til …" links on the news, project, event, learning and artifact
  detail pages: wide screens show Hjem › section › page, narrow ones show "‹ section" (verified at
  375px).
- **Aksel icons.** Added `@navikt/aksel-icons@8.14.0` as a direct dependency (the version
  Designsystemet 1.18 used). These all replace hand-made glyphs or SVGs:

  | Icon | Where |
  | --- | --- |
  | `ArrowRightIcon` | hero CTA, "Se kalender", "Alle nyheter", "Gå til …" |
  | `ArrowUpIcon` | "Til toppen" |
  | `ChevronLeftIcon` / `ChevronRightIcon` | month navigation, footer links |
  | `InformationSquareIcon` | subscriptions CTA |
  | `ExternalLinkIcon` | "Delta digitalt", with `title` "åpnes i ny fane" |
  | `MagnifyingGlassIcon` | "Søk" |
  | `MagnifyingGlassIcon`, `RecycleIcon`, `ShieldCheckmarkIcon`, `ArrowsCirclepathIcon` | /bidra benefits |

  Left as text on purpose: the prose "Settings → Webhooks" path and "Svarer med ✓".
  **Trade-off:** Aksel's React icons are `'use client'` (they call `useId`), so each one is a tiny
  client module even in Server Components. They are the official way to consume Aksel. Inlining
  the SVGs would mean vendoring Aksel's artwork, and reading the SVG files at runtime risks them
  being left out of the standalone production build.
- **Verified:**
  - **axe** (wcag2a/aa, 21, 22aa and best-practice): 0 violations on 13 routes.
  - **320px:** 0 overflow on all 13.
  - **Gates:** lint and `tsc` clean, unit tests 272/272.

### Follow-up: hamburger panel as a Designsystemet drawer (2026-10-21)

- **What changed.** The hamburger panel is now a native modal `dialog.ds-dialog` with
  `data-placement="right"` (Designsystemet's drawer), replacing the `popover` sheet.
  - **Open:** `command="show-modal"` on "Meny" (Invoker Commands, polyfilled by
    designsystemet-web).
  - **Close:** Designsystemet's empty first-child `command="close"` button, whose CSS draws ✕,
    labelled "Lukk meny".
  - **Light dismiss:** `closedby="any"`, also polyfilled by -web.
  - **Width:** `--dsc-dialog-placement-inline-max-width: 24rem`, the documented variable. It is
    full width on phones.
  - **Labelling:** an h2 "Meny" names the dialog.
  - **Behaviour from the browser:** a modal dialog traps focus and returns it to the opener, so
    the custom close-on-blur handler was removed. Choosing a link still calls `dialog.close()`.
- **Verified:**
  - **375px:** full width, `:modal`, focus on "Lukk meny"; Escape closes and returns focus to
    "Meny".
  - **900px:** a 432px drawer at the right edge with Designsystemet's backdrop; a backdrop click
    closes it.
  - **Links:** choosing "Prosjekter" navigates and closes the drawer.
  - **Console:** no errors.
  - **axe** at 900px, drawer closed and open, on `/` and a news article: 0 violations.
  - **Gates:** lint and `tsc` clean, unit tests 272/272.

### Follow-up: link cards without ds-link, with focus on the card (2026-10-21)

- **Links.** The click-delegate cards (`NewsCard`, `ProjectCard`, `ArtifactCard`,
  `NextEventCard`) no longer put `ds-link` on their heading link. That class brought its own
  hover colours, which only applied to the small `<a>`. Designsystemet's card CSS already styles a
  link-card heading link (`h* > a`: inherited colour, underlined heading), and designsystemet-web
  drives the whole-card hover surface.
- **ArtifactCard structure.** The heading is now a direct child of the card. It used to sit in a
  flex `div`, so Designsystemet's selectors missed it, and the obsolete `.app-artifact-card__head`
  rule was deleted.
- **Focus.** The ring is on the card, not the link:
  `.ds-card[data-clickdelegatefor]:has(> h* > a:focus-visible, > .ds-card__block > h* > a:focus-visible)`
  takes Designsystemet's `--dsc-focus-*` ring, and the link's own ring is removed. This is
  `:focus-within` narrowed to the card's own link and to keyboard focus, so a mouse click does not
  ring the card, and neither does focusing a second control such as the event card's
  "Legg til i kalender" button.
- **Verified:**
  - **Tab:** the news card shows a 3px Blåsvart outline with a white inner ring, and the link has
    none.
  - **Hover:** hovering the image area turns the whole card `#d8dadd`, and the link keeps its
    colour.
  - **Second control:** focusing "Legg til i kalender" rings only the button.
  - **axe:** 0 violations on `/`, `/news`, `/prosjekter` and `/registry`, with no `ds-link`
    left in card headings.

### Follow-up: breadcrumbs as the `<ds-breadcrumbs>` web component (2026-10-21)

- **What changed.** `components/Breadcrumbs.tsx` now renders `<ds-breadcrumbs class="ds-breadcrumbs">`
  from `@digdir/designsystemet-web`, which is already loaded once in the shell. This is the same
  element Designsystemet's React `Breadcrumbs` renders, and it replaces a hand-made
  `nav.ds-breadcrumbs`.
  - **Runtime behaviour.** The element sets `role="navigation"` and the label while the full trail
    shows, removes both when only the narrow-screen back link shows, and maintains
    `aria-current="page"`.
  - **Server render.** The server renders `role`, `aria-label` and `aria-current` too, so it works
    without JS. `suppressHydrationWarning` is set on the element and its links, as
    Designsystemet's React components do.
- **Types.** Superseded by the follow-up below: `@digdir/designsystemet-web` already declares its
  elements for React's JSX, so the hand-written declaration was redundant and is deleted.
- **Verified:**
  - **Element:** upgraded by designsystemet-web, with no console or hydration errors.
  - **Resize:** role and label are removed at 375px and restored at 1,280px.
  - **axe:** 0 violations on all five detail pages at both widths.
  - **Gates:** lint and `tsc` clean, unit tests 272/272.

### Follow-up: official Designsystemet types (2026-10-21)

- **Correction.** An earlier record claimed Designsystemet only types its web components for the
  DOM. That was wrong: `@digdir/designsystemet-web`'s `dist/index.d.ts` declares each element in
  `React.JSX.IntrinsicElements` (and for Preact, Vue, Svelte, Solid and Qwik).
- **Setup** (designsystemet.no/no/fundamentals/code/setup#typescript):
  - `@digdir/designsystemet-types@1.18.0` is added as a devDependency.
  - `apps/web/tsconfig.json` `compilerOptions.types` lists `@digdir/designsystemet-web`,
    `@digdir/designsystemet-types` and `./design-tokens-build/types.d.ts`, plus `node`, because an
    explicit `types` list turns off automatic `@types` inclusion.
- **Removed:** `apps/web/src/types/designsystemet-web-elements.d.ts`.
- **Kept:** `types/dom-invoker-commands.d.ts`, because neither `@types/react` 19.2 nor the
  Designsystemet packages type `command`/`commandfor` on `<button>`.
- **Theme-checked colours.** `EVENT_TYPE_COLORS`, `TagColor` and `TileAppearance.color` use
  `Color`/`SeverityColors` from `@digdir/designsystemet-types`, which the generated theme file
  narrows to accent, brand1–3, neutral and the severity colours. A probe assigning `'pink'` to
  `Color` failed `tsc` as intended.
- **Verified:** `tsc --noEmit` and lint clean, unit tests 272/272.

### Follow-up: pagination as `<ds-pagination>` (2026-10-21)

- **What changed.** `components/NewsPagination.tsx` renders Designsystemet's `<ds-pagination>`
  web component instead of a hand-made `nav.ds-pagination`
  (designsystemet.no/no/components/docs/pagination/code).
- **Own links, no data attributes.** The element can fill empty links from `data-current`,
  `data-total` and `data-href`, but only with JavaScript. With fully written links and no data
  attributes it leaves them alone, so paging stays server-rendered and works without JS.
- **What the element adds.** `role="navigation"` and the label. The server renders both, with
  `suppressHydrationWarning`, as in `Breadcrumbs`.
- **Wording.** Designsystemet's Norwegian defaults: the label "Bla i sider" (was "Sidenavigering")
  and accessible names "Forrige side" / "Neste side" on the visible "Forrige" / "Neste" links.
- **Unchanged.** `buildPagination`, the `aria-current="true"` current page, and the `aria-hidden`
  placeholder for an unavailable direction, which Designsystemet's CSS hides.
- **Verified** on `/news` and `/news?page=2` at 1,280px and 375px:
  - **Element:** upgraded, keeps our labels and hrefs, no console errors.
  - **Accessibility tree:** one navigation named "Bla i sider".
  - **axe:** 0 violations; 0px overflow.
  - **Gates:** lint and `tsc` clean, unit tests 272/272.

### Follow-up: merge with main (2026-10-22)

- **Cause.** A `git pull --autostash` brought in `aa894ed` (projects as Designsystemet link cards,
  #159/#166) and `1a50387` (Next 16.3.8), and the stash re-apply conflicted.
- **`ProjectCard.tsx`.** Kept the 026 plain-HTML link card (`article.ds-card[data-clickdelegatefor]`),
  which already does what #159 asked, without `@digdir/designsystemet-react`. The comment credits
  #159.
- **`portal.css`.** Upstream edited it, so the merge brought it back; deleted again. Its
  `.prosjekter-grid { row-gap: 24px }` is already covered: `.app-card-grid` uses `--ds-size-6`.
- **Lockfile.** Took upstream's `pnpm-lock.yaml` and re-ran `pnpm install` for 026's dependency
  changes.
- **`@payloadcms/next`.** The stash had carried it back to 3.85.2, undoing the 3.88.0 security update
  (#161); restored to 3.88.0. The peer warnings (payload 3.85.2 vs 3.88.0) are upstream's own.
- **Verified:** `tsc`, lint, unit 272/272, `next build` on Next 16.3.8; `/prosjekter` 0 axe
  violations.
- **Left alone.** The autostash entry `stash@{0}` is still in `git stash list`.

### Follow-up: user menu with Avatar, dark mode and Logg ut (2026-10-22)

- **Trigger.** `components/UserMenu.tsx` (server). The signed-in person is a `ds-button` (tertiary,
  neutral) with a `ds-avatar` (`aria-hidden`, since the visible name names the button) followed
  by the name.
  - **Avatar:** the Entra profile photo when the session has one, otherwise initials from
    `initialsOf`; with no name either, Designsystemet's person icon.
- **Menu.** A Designsystemet Dropdown: `div.ds-dropdown[popover=auto][data-placement=bottom-end]`
  opened by `popoverTarget`. The browser gives the trigger its expanded state and handles Escape
  and outside clicks; designsystemet-web places it. The dropdown is `data-color="neutral"`.
- **Items:**
  - **Admin** (contributor+): moved here from the header row.
  - **"Mørk modus":** a `ds-field` switch (`input.ds-input[role=switch]`, label first, accent
    colour so "on" is clear).
  - **"Logg ut":** a submit button tied by `form=` to a hidden server-action form, so it stays a
    direct `li` child and gets Designsystemet's item styling.
- **Dark mode.**
  - **Switch:** `components/ColorSchemeSwitch.tsx` ('use client') sets `data-color-scheme` on
    `<html>` at once and writes the `kihub-color-scheme` cookie (1 year, `samesite=lax`, `secure`
    on https).
  - **Server:** `ThemedHtml` is now async and reads the cookie, so pages render in the chosen
    scheme from the first paint. Light is the default; there is no "follow the system" option yet.
  - **Helpers:** pure helpers in `lib/user-menu-view.ts` (`parseColorScheme`, `colorSchemeCookie`,
    `initialsOf`), tested in `tests/unit/user-menu-view.test.ts` (8 tests).
  - **Fixes found in the dark sweep:** the header logo (dark fill) gets the footer's white filter;
    the footer would merge into the dark page, so it gets `neutral-background-tinted` and a top
    border.
- **Profile photo.**
  - **Scope:** `auth/config.ts` now requests `User.Read` (`openid profile email User.Read`) with
    `profilePhotoSize: 64`. Before this the Auth.js Graph photo request always failed with 401.
  - **Cookie size:** the photo travels base64 in the session cookie, so 64px keeps it to a few KB.
  - **Caveats:** it shows only after a fresh sign-in, and only if the tenant grants `User.Read`
    without extra consent. Not verified against real Entra.
- **Verified** in Chromium:
  - **Wide header (1,280px):** the menu opens under the trigger, aligned to its end.
  - **Drawer (375px):** the menu also opens inside the hamburger drawer.
  - **Keyboard:** Escape closes it and returns focus to the trigger.
  - **Switch:** toggles instantly both ways; the reload is server-rendered dark.
  - **Items:** Logg ut signs out; Admin shows for Cara Contributor and not for Ada Employee.
  - **axe:** 0 violations on the frontpage in light with the menu open, and on 14 URLs in dark.
  - **Gates:** `tsc` and lint clean, unit 280/280, `next build` green.
