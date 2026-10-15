# Feature Specification: Content Source Seam (Payload → Umbraco migration, step 1)

**Feature Branch**: `023-content-source-seam`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Step 1 of the Payload → Umbraco migration (option 2: headless Umbraco for editorial content, the registry stays on Payload/Postgres). Introduce a CMS-neutral content seam in apps/web so that the editorial modules — News, Events, Projects, KI Læring, Media, and the Frontpage + SiteChrome globals — can later be served by a different CMS one module at a time, with zero visible change today. Employee pages consume CMS-neutral view models; rich text goes through a CMS-neutral abstraction; each module is read through a per-module content-source adapter selected by configuration ('payload' the only implemented source and the default; unknown values fail fast); the registry is out of scope; no schema change, migration, new runtime dependency, URL change or /cms change; suite stays green and new tests pin adapter selection and view-model mapping. Motivation: management decision to standardise on Umbraco (.NET); this seam enables a strangler-fig migration where each module can be flipped and rolled back via config without breaking production."

## Context

Management has decided that KI Hub's editorial content should move to Umbraco, the CMS the
organisation's other projects use. KI Hub is in production, so the move happens **one module at a
time** (the "strangler fig" approach): a new content source is built beside the existing one, and
each module is switched over — and can be switched back — independently.

This feature is the preparatory step. It changes **nothing** that employees or editors can see.
Its only purpose is to make the employee-facing portal stop depending on *which* CMS stores
editorial content, so that later features can add an Umbraco source for one module without touching
the pages that display it.

Scope split (decided before this spec):

- **Editorial content — in scope**: News, Events, Projects, KI Læring (categories, subcategories,
  pages, including code examples and embedded videos), images belonging to that content (with
  their focal point and prepared sizes), the frontpage content, and the site chrome (navigation,
  footer).
- **Registry — out of scope**: artifacts, catalog entries, reviews, audit log, discovery sources and
  runs, users and roles, and registry search. These are application data rather than editorial
  content, and keep their current data access unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employees notice no difference (Priority: P1)

An employee uses KI Hub exactly as before: the frontpage, «Siste nytt», the news archive and
articles, the events calendar/list and event pages (including calendar download), the projects list
and project pages, and the KI Læring library with its sidebar, code examples and videos all look
and behave identically. Every existing link still works.

**Why this priority**: KI Hub is in production. A preparatory refactor that changes or breaks what
employees see has negative value. This guarantee is the precondition for everything else.

**Independent Test**: Render every editorial page type before and after the change against the same
content, and compare the produced pages; run the full existing automated suite.

**Acceptance Scenarios**:

1. **Given** the same published content, **When** an employee opens any editorial page (frontpage,
   `/news`, a news article, `/events`, an event, an event's calendar file, `/prosjekter`, a project,
   `/laering`, a learning page), **Then** the page content, ordering, images, dates, links and
   formatting are identical to before the change.
2. **Given** a learning page containing a code example and an embedded video, **When** it is
   rendered, **Then** the syntax colouring and the video embed are identical to before.
3. **Given** a news article with a framed hero image, **When** it appears on a card and on its
   article page, **Then** the crop, focal point, image sizes and cache-busting address are identical
   to before.
4. **Given** draft (unpublished) content, **When** an employee browses the portal, **Then** the draft
   is still never shown.

---

### User Story 2 - Operators choose the content source per module (Priority: P1)

An operator can see and set, per editorial module, which content source serves it. Today the only
available source is the current CMS (Payload), and it is used whenever nothing is configured. A
mistyped or unsupported value stops the application from starting with a clear message naming the
module and the accepted values, instead of silently serving empty or wrong content.

**Why this priority**: This switch is the mechanism the whole migration relies on — flipping one
module to Umbraco later, and flipping it back as a rollback, must be a configuration change, not a
code change or redeploy of different code.

**Independent Test**: Start the application with no source configured, with the explicit current
source configured, and with an invalid value; observe that the first two serve content normally and
the third refuses to start with a descriptive error.

**Acceptance Scenarios**:

1. **Given** no content-source configuration, **When** the application starts, **Then** every
   editorial module is served by the current CMS.
2. **Given** a module explicitly configured to the current CMS, **When** the application starts,
   **Then** that module behaves exactly as with no configuration.
3. **Given** a module configured with an unknown value (e.g. a typo), **When** the application
   starts, **Then** startup fails with a message that names the module setting, the rejected value
   and the accepted values.
4. **Given** a configuration for a module that does not exist, **When** the application starts,
   **Then** it is ignored like any other unrelated setting (no failure).

---

### User Story 3 - Developers can add a new source for one module in isolation (Priority: P2)

A developer preparing the next migration step (e.g. moving Projects to Umbraco) can provide a new
source for that single module and have every page and component of that module display it, without
editing those pages or components and without affecting any other module.

**Why this priority**: This is the value the seam exists to create, but it is only *exercised* by
the next feature; here it only needs to be proven possible.

**Independent Test**: In the automated tests, supply a stand-in source with fixed content for one
module and verify the module's pages and components render that content while all other modules
still use the current CMS.

**Acceptance Scenarios**:

1. **Given** a stand-in source providing fixed projects content, **When** the projects pages are
   rendered in a test, **Then** they show the stand-in content, and News/Events/Learning are
   unaffected.
2. **Given** content arriving as rich text from a source other than the current CMS, **When** it is
   displayed, **Then** it goes through the same display path as current rich text, with no page
   change needed to support it.

---

### Edge Cases

- A module whose content is genuinely empty (no published news, no events) still shows the existing
  empty states — not an error.
- A content item with no image, a legacy external image address, or an image whose original is
  smaller than the prepared sizes keeps today's behaviour (placeholder / legacy fallback / no
  upscaling, deduplicated sizes).
- A focal point at 0% on either axis is still honoured (not treated as "missing").
- Rich text that contains a block type the display path does not recognise renders the same way it
  does today (no new failure mode).
- A missing or unpublished item under a valid address still returns "not found", as today.
- The frontpage and site chrome still fall back to built-in defaults when an editor has never saved
  them, exactly as today.
- The editor back-office (`/cms`) keeps reading and writing content as today; it is NOT routed
  through the new seam.
- Registry pages (`/registry`, artifact pages) and registry search behave exactly as before and do
  not consult the content-source configuration.

## Requirements *(mandatory)*

### Functional Requirements

**Visible behaviour (no change)**

- **FR-001**: Every employee-facing editorial page and component MUST render output identical to
  before the change, for the same content (content, ordering, pagination, dates, images, links,
  formatting, empty states, not-found behaviour, draft exclusion).
- **FR-002**: No page address, redirect or link target MUST change.
- **FR-003**: The editor back-office MUST be unchanged: same content model, same screens, same
  stored data.
- **FR-004**: The feature MUST NOT change the stored content structure or require any data
  migration, and MUST NOT add any new runtime dependency.

**CMS-neutral content shapes**

- **FR-005**: Employee-facing pages and components for the in-scope modules MUST consume
  content shapes defined by KI Hub itself (e.g. news article, event, project, learning page,
  learning tree, hero/content image, frontpage content, site chrome) rather than shapes generated by
  or specific to the current CMS.
- **FR-006**: Those shapes MUST carry everything today's pages use and nothing CMS-specific that a
  different source could not reasonably provide (e.g. no CMS-internal ids or relation
  depth artefacts leaking into pages).
- **FR-007**: Images belonging to editorial content MUST be described in a source-neutral way that
  preserves today's behaviour: focal point, the available prepared sizes with their dimensions, the
  original's dimensions, alternative text, and the cache-busting version marker.

**Rich text**

- **FR-008**: Rich text in the in-scope modules MUST be displayed through a single KI Hub-owned
  display path that pages and components use, so that no page or component depends directly on the
  current CMS's rich-text renderer.
- **FR-009**: The rich-text value carried in the content shapes MUST identify its format, so that a
  future source can supply a different format and the display path can choose the right rendering.
  Today's single format (the current CMS's) MUST render identically to before, including syntax-
  coloured code examples and embedded videos.

**Per-module content source**

- **FR-010**: Each in-scope module — News, Events, Projects, KI Læring, Frontpage, Site chrome —
  MUST read its content through a source chosen independently per module by configuration.
  Images are served by whichever source serves the module that owns them.
- **FR-011**: The current CMS MUST be the only implemented source and the default when a module's
  setting is absent or empty.
- **FR-012**: An unrecognised source value for any module MUST stop the application at startup with
  a message naming the setting, the rejected value and the accepted values.
- **FR-013**: The new configuration settings MUST be documented alongside the existing runtime
  configuration, including the default and the fail-fast behaviour.
- **FR-014**: Each source MUST preserve today's guarantees by construction: only published content
  is returned to employee pages, and ordering/pagination semantics are unchanged.

**Out of scope boundary**

- **FR-015**: Registry data (artifacts, catalog, reviews, audit log, discovery, users/roles) and
  registry search MUST keep their current data access and MUST NOT be routed through, or depend on,
  the content-source configuration.
- **FR-016**: The automated checks MUST make it detectable if an employee-facing editorial page or
  component reintroduces a direct dependency on the current CMS's generated shapes or rich-text
  renderer.

**Verification**

- **FR-017**: The existing automated test suite MUST stay green.
- **FR-018**: New automated tests MUST cover: source selection (default, explicit, invalid → fail
  fast, per-module independence); the mapping from the current CMS's content to the KI Hub content
  shapes for every in-scope module, including the image and rich-text edge cases above; and at least
  one module rendered from a stand-in source (User Story 3).

### Key Entities

- **Editorial module**: one of News, Events, Projects, KI Læring, Frontpage, Site chrome — the unit
  that is switched between content sources.
- **Content source**: a provider of an editorial module's content (today: the current CMS only;
  later: Umbraco). Chosen per module.
- **Content shapes (view models)**: KI Hub-defined descriptions of a news article, event, project,
  learning category/subcategory/page and the learning tree, frontpage content and site chrome — what
  pages consume.
- **Content image**: a source-neutral image description — address(es) of prepared sizes with
  dimensions, original dimensions, focal point, alternative text, version marker.
- **Rich text value**: formatted body content tagged with its format, rendered by KI Hub's single
  rich-text display path.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For every editorial page type (9 page types plus the event calendar download), the
  rendered output for the same content is identical before and after the change — 0 visible
  differences in a side-by-side comparison of a representative page of each type.
- **SC-002**: 100% of the existing automated tests pass after the change, with no test deleted or
  weakened to make it pass.
- **SC-003**: 0 employee-facing editorial pages or components depend directly on the current CMS's
  generated content shapes or rich-text renderer (down from 13 files today), and this is enforced
  automatically.
- **SC-004**: Switching one module to a different source requires changing 1 configuration value
  and touches 0 pages or components (demonstrated in tests with a stand-in source).
- **SC-005**: An invalid content-source value is caught at startup in 100% of cases — the
  application never starts serving with a misconfigured module.
- **SC-006**: Page load times for employees are unchanged (no extra round-trips per page compared
  with today).
- **SC-007**: 0 changes to stored data, the editor back-office, or page addresses.

## Assumptions

- The migration strategy is "option 2": headless Umbraco for editorial content, with KI Hub's
  existing employee portal continuing to render all pages; the registry stays on its current
  platform. Porting the registry is a separate future decision.
- The current CMS stays the source of truth for all modules throughout this feature; no content is
  copied or moved.
- Images are owned by the module that uses them (news hero images by News, learning images by KI
  Læring); there is no separate image switch, because an image library shared across two different
  sources is not needed for the planned module-by-module order.
- The per-module switch is a deployment-time setting (read at startup), not something editors or
  employees toggle at runtime.
- The frontpage's "latest news" and "next event" sections read through the News and Events sources
  respectively, so they follow those modules' switches.
- The frontpage subscriptions banner's explanatory texts are frontpage content and follow the
  Frontpage switch.
- The constitution's statement that Payload owns native content remains true after this feature
  (Payload is still the only source); amending it is deferred to the feature that first serves a
  module from Umbraco. This feature is justified under "Start Simple, Design for Growth" by that
  concrete, already-decided next phase.
