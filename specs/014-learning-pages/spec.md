# Feature Specification: Learning Pages (KI Læring)

**Feature Branch**: `014-learning-pages`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "KI Læring — a learning/knowledge-base module for KI Hub
(employee-facing 'KI Læring' page + CMS authoring). Editors author structured learning content in
the /cms back-office; all employees browse it in the employee app. The employee-facing layout
mirrors the old KI HUB app's learning section: a persistent left sidebar 'browse resources'
navigation listing collapsible category groups with their pages beneath them, and the selected
page's rich content filling the rest of the page. Restyled on the kihub design system, Norwegian
copy (nb-NO). Content model: a FIXED two-level hierarchy — category → subcategory → learning page,
no arbitrary nesting; categories and subcategories are editor-creatable and orderable; draft and
published status like News, published-only visibility for employees, Contributor+ authoring.
Rich content: rich text (headings, paragraphs, lists, links, blockquotes); images via MANAGED
UPLOADS so editors drag-and-drop images directly into the editor, with alt text, stored on the
local filesystem in local development and in Azure Blob Storage in production; code blocks with a
language selector, DISPLAY ONLY — never executed — WITH syntax highlighting. 'KI Læring' becomes a
top-level nav entry alongside Verktøy / Nyheter / Arrangementer. The sidebar tree is derived from
published content, collapsible, current page highlighted, and usable on phones (collapse/disclose
rather than horizontal scrolling). New portal module on the shared foundation, not a parallel app;
native platform content owned by Payload, not an artifact. Schema change + migration expected; new
dependencies expected. Employee-facing UI on the kihub token layer only. Server-rendered by
default. Excluded for now: full-text search over learning pages, per-page access control beyond
published/draft, versioning/revisions, comments, progress tracking, quizzes."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employees browse and read learning content (Priority: P1)

An employee opens "KI Læring" from the site navigation and lands on a learning overview. Down the
left side is a persistent resource navigation: the library's categories in a deliberate,
editor-chosen order, each one openable to reveal the learning pages inside it (grouped under
subcategories where the editor has created them). Selecting a page renders that page's content —
prose, headings, lists, links, images and code samples — in the main area beside the navigation,
with the current page clearly marked in the sidebar so the employee always knows where they are.
The page address is shareable: sending a colleague a link to a specific learning page lands them on
exactly that page with the sidebar open at the right place.

**Why this priority**: This is the whole point of the module — a place employees actually go to
learn how to use AI tooling. Without the reading surface there is no feature. It stands entirely on
its own: with content in place it delivers value even before authoring ergonomics or rich media are
polished.

**Independent Test**: Can be fully tested by seeding a small library (two or three categories, one
of them with subcategories, several published pages) and verifying the sidebar structure and order,
that selecting each entry renders the right content, that the current entry is marked, that page
addresses are shareable and reloadable, that drafts are absent, and that the layout works from
phone to desktop widths.

**Acceptance Scenarios**:

1. **Given** a published library of categories and pages, **When** an employee opens the learning
   module, **Then** a left-hand resource navigation lists every category in the editor-defined
   order, and the main area shows a Norwegian learning overview.
2. **Given** a category containing published pages, **When** the employee opens that category group,
   **Then** its pages are listed beneath it in the editor-defined order; **and given** the category
   also has subcategories, **Then** its pages appear grouped under their subcategory headings.
3. **Given** the employee selects a learning page, **When** the page renders, **Then** its content
   fills the main area beside the still-visible navigation, and that entry is visually marked as
   current and announced as current to assistive technology.
4. **Given** an employee is reading a page inside a category, **When** the page loads, **Then** the
   group containing it is already open in the sidebar rather than collapsed.
5. **Given** a link to a specific learning page, **When** it is opened in a fresh session (or
   reloaded, or bookmarked), **Then** the same page renders with the sidebar open at the right
   place.
6. **Given** a phone-width viewport, **When** a learning page renders, **Then** the resource
   navigation is collapsed behind a single Norwegian disclosure control above the content, the
   content is full width, and there is no horizontal scrolling anywhere on the page.
7. **Given** client-side scripting is disabled, **When** the employee browses the library, **Then**
   every published page is still reachable and every group can still be opened and closed.
8. **Given** a draft learning page, **When** an employee browses the module, **Then** it appears
   nowhere in the navigation and its address is not found.
9. **Given** a category (or subcategory) whose only pages are drafts, **When** the sidebar renders,
   **Then** that group is not shown at all rather than appearing as an empty dead end.
10. **Given** an unknown learning page address, **When** it is visited, **Then** the page is not
    found.
11. **Given** no published learning content exists at all, **When** the module is opened, **Then** a
    friendly Norwegian empty state explains that learning content is on its way, and no empty
    navigation shell is rendered.

---

### User Story 2 - Editors structure the library and author pages (Priority: P2)

An editor signs in to the back-office and builds the library: they create categories (for example
"Grunnleggende", "Referanse", "Praktisk"), optionally divide a category into subcategories, and
write learning pages inside them. Each page has a title, a body written in a rich text editor
(headings, paragraphs, bullet and numbered lists, links, quotes, emphasis), and a draft/published
state. The editor controls the order categories, subcategories and pages appear in, because a
learning library reads in a deliberate sequence rather than alphabetically. A page's address handle
is derived from its title automatically, so editors never have to invent one, and it stays stable
afterwards.

**Why this priority**: Content has to come from somewhere, and the editorial ergonomics — ordering,
grouping, publishing — are what let a non-developer own the library. It is separable from P1: the
reading surface can be tested against seeded content, and this story makes it sustainable.

**Independent Test**: Can be tested entirely in the back-office by creating categories,
subcategories and pages, reordering them, publishing and unpublishing, and confirming the resulting
structure and order appear correctly on the employee surface.

**Acceptance Scenarios**:

1. **Given** an editor in the back-office, **When** they create a category with a title and a short
   description, **Then** it is available to assign pages to, and its description is what the
   learning overview shows for it.
2. **Given** a category, **When** the editor creates a subcategory under it, **Then** the
   subcategory belongs to exactly that category and can hold pages.
3. **Given** an editor creating a learning page, **When** they choose its category, **Then** they
   may also choose one subcategory *of that category*, and cannot attach it to a subcategory
   belonging to a different category.
4. **Given** an editor writing a page body, **When** they use headings, bullet and numbered lists,
   links, quotes, bold and italic and inline code, **Then** all of it renders on the employee
   surface with the portal's typography.
5. **Given** an editor leaves the address handle blank, **When** they save the page, **Then** a
   URL-safe handle is derived from the title; **and when** they later change the title, **Then** the
   handle does not change, so existing links keep working.
6. **Given** two pages whose titles would produce the same handle, **When** the second is saved,
   **Then** the conflict is surfaced to the editor rather than silently overwriting or breaking the
   first page's address.
7. **Given** several categories, subcategories and pages, **When** the editor changes their order,
   **Then** the employee sidebar and overview reflect the new order, and items the editor has not
   ordered still appear in a stable, predictable position rather than jumping around between page
   loads.
8. **Given** a page saved as a draft, **When** the editor later publishes it, **Then** it appears on
   the employee surface without any further developer action; **and when** they unpublish it,
   **Then** it disappears from the employee surface but is not deleted.
9. **Given** a category that still contains pages, **When** the editor tries to delete it, **Then**
   the deletion is refused with a clear explanation, so pages can never be orphaned into
   invisibility.
10. **Given** a published page, **When** an employee reads it, **Then** it shows when the page was
    last updated, in Norwegian long-form date convention.

---

### User Story 3 - Rich learning content: images and code samples (Priority: P3)

An editor illustrates a learning page: they drag an image straight into the body of the editor, the
platform stores it, and they give it alternative text. They also add code samples — a shell command,
a JSON configuration snippet, a prompt file — choosing the language for each so it is presented with
syntax colouring. Code is shown, never run: it is reading material, and an employee can copy a
sample in one action to paste it somewhere themselves.

**Why this priority**: Learning content about AI tooling is mostly configuration and commands, so
images and code samples are what make the module genuinely useful rather than a wall of prose. It
carries the most new machinery (managed file storage, highlighting), so it is layered on top of a
working text-only library.

**Independent Test**: Can be tested by uploading images into a page body and adding code blocks in
several languages, then verifying on the employee surface that images render at sensible sizes with
their alternative text, that code is colour-highlighted and copyable, that nothing executes, and
that uploaded images survive a restart of the running application.

**Acceptance Scenarios**:

1. **Given** an editor writing a page body, **When** they drag an image file into the editor (or
   pick one they uploaded earlier), **Then** the image is stored by the platform, appears inline in
   the body, and is reusable on other pages without uploading it again.
2. **Given** an uploaded image, **When** the editor saves the page, **Then** they are required to
   supply alternative text or to mark the image explicitly as decorative.
3. **Given** a page containing images, **When** an employee reads it on a phone, **Then** images fit
   the content width without overflowing, and a large source photograph does not make the page slow
   to load.
4. **Given** an editor uploads a file that is not an accepted image format, or is larger than the
   allowed size, **When** they try to save, **Then** the upload is refused with a clear explanation.
5. **Given** an editor adds a code block and selects its language, **When** an employee reads the
   page, **Then** the sample is shown in a monospaced block with syntax colouring, with all
   indentation and blank lines preserved exactly as written.
6. **Given** a code sample with very long lines, **When** it renders, **Then** any overflow is
   contained within the code block itself and never causes the page to scroll horizontally.
7. **Given** a code block whose language is not one the platform can colour, **When** the page
   renders, **Then** the sample is shown as plain monospaced text rather than failing or showing an
   error.
8. **Given** any code sample, **When** the page is viewed, **Then** nothing in the sample is
   executed, evaluated or interpreted by the platform or the employee's browser — it is inert text.
9. **Given** a code sample, **When** the employee activates the copy control, **Then** the exact
   sample text is placed on their clipboard, with confirmation that it was copied.
10. **Given** the production application is restarted or redeployed, **When** an employee reopens a
    page containing uploaded images, **Then** the images still render — no broken images.

---

### User Story 4 - Publication visibility is controlled and safe (Priority: P4)

Only editors may author learning content, and only published content is ever visible to employees.
An ordinary employee (Reader) cannot create, change or delete categories, subcategories, pages or
uploaded images, cannot reach draft content by guessing addresses or by calling the platform's data
interfaces directly, and the enforcement lives on the server rather than in the interface.

**Why this priority**: The invariant the other stories depend on, and the same posture News and
Events already established. It is called out separately so it is explicitly tested rather than
assumed.

**Independent Test**: Can be tested by attempting reads and writes as each role against every
learning surface and data path — employee pages, addresses of draft pages, and the platform's own
data interfaces — and confirming that only published content is readable and only Contributor+ can
write.

**Acceptance Scenarios**:

1. **Given** a signed-in Reader, **When** they attempt to create or modify any learning content or
   upload an image, **Then** the attempt is refused server-side.
2. **Given** a Contributor, Reviewer, Approver or Admin, **When** they author learning content in
   the back-office, **Then** it is permitted.
3. **Given** a draft learning page, **When** any non-editor reads the platform's data interfaces
   directly, **Then** the draft is not returned.
4. **Given** an unauthenticated visitor, **When** they request any learning address, **Then** they
   are subject to the same employee sign-in requirement as the rest of the employee app.
5. **Given** an editor uploads an image and then unpublishes the page that used it, **Then** the
   image file itself remains available to the editor for reuse, and no employee-facing page links to
   it.

---

### Edge Cases

- **Completely empty library**: Norwegian empty state, no navigation shell, no dead links from the
  main navigation into nothing.
- **Category with a description but no published pages**: hidden from the employee sidebar and from
  the overview rather than shown as an empty group.
- **Subcategory with no published pages**: the subcategory heading is not rendered; its sibling
  pages that sit directly under the category still appear.
- **Pages both directly under a category and inside its subcategories**: both are shown — ungrouped
  pages first, then the subcategory groups (a deterministic, documented arrangement).
- **A page moved to a different category or subcategory after publication**: its address does not
  change and existing links keep resolving; only its position in the navigation moves.
- **Two categories, or two pages, given the same title**: both are usable; their address handles are
  distinct and the editor is told when a handle collides.
- **Items with no explicit order value**: appear in a stable, deterministic position (never
  reshuffling between page loads).
- **Very long page or category titles**: wrap inside the sidebar without forcing horizontal
  scrolling or truncating into unreadability.
- **A deep library (10+ categories, 100+ pages)**: the sidebar remains navigable and the page does
  not become slow to load.
- **Very long page body**: remains readable and scrolls vertically; the sidebar stays usable while
  reading (it does not scroll out of reach on desktop).
- **Wide code block or wide table inside a body**: overflow is contained inside its own block; the
  page itself never scrolls horizontally, at any width down to 360 px.
- **Code sample containing markup, template syntax or script-like text**: rendered as visible inert
  text, never interpreted, never executed.
- **Image uploaded with an enormous pixel dimension**: served at a size appropriate to the content
  column rather than at full size.
- **Uploaded image referenced by several pages, then deleted**: the affected pages must not render a
  broken layout, and the editor must be able to tell that the image is in use.
- **Non-image or oversized upload attempt**: refused with a clear message, nothing partially stored.
- **Production restart or redeploy**: previously uploaded images still render (durable storage, not
  the container filesystem).
- **Object storage not yet configured in an environment**: the failure is explicit and diagnosable at
  start-up rather than silently producing broken images later (see Dependencies).
- **Draft page whose address is guessed**: not found, for every role below Contributor.
- **Timezone boundaries**: a page last updated at 00:30 Oslo time shows the correct Oslo calendar
  date even when the stored timestamp falls on the previous UTC day.
- **Existing environment whose navigation was already customised by an editor**: the "KI Læring"
  entry does not silently appear; an editor adds it (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

**Module, navigation and layout**

- **FR-001**: The system MUST add a learning module as a new portal module on the shared foundation
  — its own content collections, its own employee-facing pages, and authoring in the existing
  back-office — reachable from the main site navigation and footer as "KI Læring". It MUST NOT be a
  separate application.
- **FR-002**: Every learning surface MUST render a persistent resource navigation listing published
  categories in the editor-defined order, each expandable to reveal its published pages, grouped
  under subcategory headings where subcategories exist.
- **FR-003**: The resource navigation MUST be exposed as a navigation region with an accessible
  Norwegian name, MUST convey the currently-open page to assistive technology as well as visually,
  and MUST show a visible keyboard focus indicator on every interactive element.
- **FR-004**: The group containing the currently-open page MUST be expanded when the page loads.
- **FR-005**: Expanding and collapsing groups, and reaching every published page, MUST work with
  client-side scripting disabled.
- **FR-006**: At phone widths the resource navigation MUST collapse behind a single Norwegian
  disclosure control placed above the content, and no learning surface may scroll horizontally at
  any viewport width down to 360 px — including pages containing wide code blocks or tables, whose
  overflow MUST be contained within their own block.
- **FR-007**: The module root MUST render a Norwegian learning overview: a heading and one section
  per published category showing that category's description and a way into its content.
- **FR-008**: Categories, subcategories and pages with no published pages beneath them MUST NOT
  appear in the resource navigation or the overview.
- **FR-009**: When no published learning content exists, the module MUST show a friendly Norwegian
  empty state instead of an empty navigation shell.

**Addressing**

- **FR-010**: Every published learning page MUST have a stable, shareable, bookmarkable address that
  is unaffected by moving the page between categories or subcategories, so editorial reorganisation
  never breaks existing links.
- **FR-011**: A page's address handle MUST be derived automatically from its title when the editor
  leaves it blank, MUST remain stable when the title is later edited, and MUST be unique — a
  collision MUST be reported to the editor rather than silently overwriting or breaking an existing
  page's address.
- **FR-012**: An unknown or draft learning address MUST resolve as not found.

**Content model**

- **FR-013**: The hierarchy MUST be exactly two levels of grouping: a subcategory MUST belong to
  exactly one category; a learning page MUST belong to exactly one category and MAY belong to at
  most one subcategory *of that same category*. Deeper nesting MUST NOT be possible.
- **FR-014**: The system MUST prevent a page from referencing a subcategory that belongs to a
  different category.
- **FR-015**: Editors MUST be able to control the display order of categories, subcategories and
  pages, and ordering MUST be deterministic — items without an explicit order MUST hold a stable
  position across page loads.
- **FR-016**: Deleting a category or subcategory that still contains content MUST be refused with a
  clear explanation, so pages are never orphaned into invisibility.
- **FR-017**: Each learning page MUST carry a draft/published state, and employees MUST only ever be
  shown published pages.
- **FR-018**: Published pages MUST show when they were last updated, formatted for the Europe/Oslo
  timezone using nb-NO conventions, correct across UTC day boundaries and DST transitions.

**Rich content**

- **FR-019**: The page body MUST be authored in a rich text editor supporting headings, paragraphs,
  bullet and numbered lists, links (internal and external), blockquotes, bold/italic emphasis,
  inline code and horizontal rules, and all of it MUST render on the employee surface using the
  portal's typography.
- **FR-020**: Editors MUST be able to place images inside a page body by uploading them directly
  (drag-and-drop or a picker) — the platform stores the file — and MUST be able to reuse a
  previously uploaded image on other pages without re-uploading it.
- **FR-021**: Every inline image MUST require alternative text or an explicit "decorative" marking
  before the page can be saved.
- **FR-022**: Uploads MUST be restricted to accepted raster image formats within a defined maximum
  file size; anything else MUST be refused with a clear explanation and nothing partially stored.
  Script-carrying vector formats MUST NOT be accepted.
- **FR-023**: Images MUST be served at sizes appropriate to the content column so that a
  large source image does not dominate page weight, and MUST fit the content width on phones
  without overflowing.
- **FR-024**: Uploaded images MUST remain available across application restarts and redeployments in
  every deployed environment — durable object storage, not the running container's filesystem. The
  storage target MUST be selected by environment configuration (local filesystem for local
  development, Azure Blob Storage in deployed environments), following the same
  environment-selected pattern the platform already uses for database authentication.
- **FR-025**: A misconfigured or unreachable storage target MUST fail explicitly and diagnosably at
  application start-up, rather than silently producing broken images later.
- **FR-026**: Editors MUST be able to add code samples with a selectable language, and the employee
  surface MUST render them in a monospaced block with syntax colouring, preserving indentation and
  blank lines exactly as authored.
- **FR-027**: Code samples MUST be display-only: nothing in a sample may be executed, evaluated or
  interpreted by the platform or by the employee's browser, under any circumstances.
- **FR-028**: A code block whose language is unrecognised or unsupported MUST render as plain
  monospaced text, never as an error or an empty block.
- **FR-029**: Each code block MUST offer a control that copies the exact sample text to the
  clipboard with visible confirmation.
- **FR-030**: Editor-supplied content MUST NOT be able to inject executable markup or scripts into
  the employee-facing surface.

**Access control and governance**

- **FR-031**: Creating, editing and deleting learning categories, subcategories, pages and uploaded
  images MUST be restricted to Contributor and above, enforced server-side, with Readers refused.
- **FR-032**: Draft learning content MUST never be exposed to non-editors — not through employee
  pages, not through address manipulation, and not through the platform's own data interfaces —
  with the restriction enforced in both the read layer and the access layer (defence in depth), the
  same posture as News.
- **FR-033**: All learning surfaces MUST remain subject to the existing employee sign-in requirement
  for the employee app.

**Presentation and platform**

- **FR-034**: All employee-facing learning UI MUST be styled exclusively through the shared kihub
  token layer over the generated Designsystemet KI Hub theme — no hardcoded colour, type or spacing
  values, and no restyling or forking of Designsystemet primitives. This includes syntax
  highlighting: code colours MUST resolve through the shared token layer rather than a vendor
  theme's fixed palette.
- **FR-035**: Text on the learning surfaces, including syntax-highlighted code and navigation
  states, MUST meet WCAG 2.1 AA contrast (4.5:1 for body-size text, 3:1 for large text and
  meaningful non-text indicators).
- **FR-036**: All employee-facing copy MUST be Norwegian (bokmål).
- **FR-037**: Learning surfaces MUST be server-rendered by default; client-side interactivity is
  permitted only where interaction demands it and MUST NOT be required for navigation or reading.
- **FR-038**: The content model change MUST be delivered as an additive schema migration that leaves
  existing Registry, News and Events data untouched, and MUST apply automatically in deployed
  environments through the platform's existing production-migration mechanism.
- **FR-039**: Existing surfaces MUST continue to work unchanged — frontpage, Nyheter, Arrangementer,
  the Registry and existing search — and learning content MUST NOT appear in the existing
  artifact-search results.
- **FR-040**: In an environment where an editor has already customised the site navigation, an
  editor MUST be able to add the "KI Læring" entry themselves through the back-office; fresh
  environments MUST get it from the seeded defaults.

### Key Entities

- **Learning category** (new): a top-level grouping in the library — title, address handle, a short
  description used on the overview, and a display order. Contains subcategories and pages.
- **Learning subcategory** (new): a second-level grouping belonging to exactly one category — title,
  address handle, display order.
- **Learning page** (new): the unit employees read — title, stable address handle, owning category,
  optional subcategory of that category, rich body (prose, images, code samples), publication state,
  last-updated timestamp, display order, and author attribution.
- **Media asset** (new): an image uploaded and owned by the platform — the stored file, its
  alternative text (or decorative marking), and the derivative sizes used for display. Reusable
  across pages; a general platform capability that this feature is the first to use.
- **Resource navigation tree** (derived, not stored): the sidebar structure computed from published
  categories, subcategories and pages, plus which entry is currently open.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employee can go from the portal front page to a specific learning page they are
  looking for in at most three interactions.
- **SC-002**: 100% of published learning pages are reachable through the resource navigation; zero
  published pages are unreachable or orphaned.
- **SC-003**: Draft learning content is never visible to non-editors under any combination of
  address manipulation or direct data-interface access — 100% of access-control checks pass.
- **SC-004**: No learning surface scrolls horizontally at any viewport width from 360 px upward,
  including pages containing wide code samples or tables.
- **SC-005**: All employee-facing copy on the learning surfaces is Norwegian (bokmål) — no English
  strings remain.
- **SC-006**: An editor with no developer assistance can create a new category and publish a
  learning page containing formatted prose, an uploaded image with alternative text, and a
  syntax-highlighted code sample, in under 10 minutes.
- **SC-007**: Images uploaded by editors still render after the deployed application is restarted or
  redeployed — zero broken images.
- **SC-008**: Zero code paths execute, evaluate or interpret editor-supplied code samples; samples
  render as inert text in 100% of cases, including samples containing markup or script text.
- **SC-009**: Every published page is reachable and every navigation group can be opened and closed
  with client-side scripting disabled — 100% of navigation works without scripting.
- **SC-010**: With a library of 10 categories and 100 published pages, learning pages load with no
  perceptible slowdown compared with a small library, and the work done to build the sidebar does
  not grow with the number of pages displayed.
- **SC-011**: All text, including highlighted code and navigation states, meets WCAG 2.1 AA contrast
  — 100% of measured combinations pass.
- **SC-012**: Existing surfaces show zero regressions after the change, and the schema migration
  applies cleanly to an existing populated database with zero data loss.

## Assumptions

- **The module lives at one ASCII address root with flat page addresses** (`/laering`, pages at
  `/laering/<handle>`), rather than encoding the category and subcategory in the address. Rationale:
  a growing learning library gets reorganised, and reorganisation must never break links a colleague
  has already shared (FR-010). Breadcrumbs and the sidebar derive grouping from the page record, not
  from the address. The route segment is ASCII (`laering`, not `læring`) to keep addresses
  copy-paste-safe; the visible label is "KI Læring".
- **The overview at the module root is derived from category descriptions**, not separately authored
  content. This matches the reference design (a heading plus a described section per category) and
  avoids introducing another editor-managed page. If editors later want a hand-written introduction,
  that is a small additive change.
- **Editor-controlled ordering with a deterministic fallback.** A learning library reads in a
  deliberate sequence, so alphabetical ordering is not acceptable as the primary rule; items the
  editor has not explicitly ordered fall back to a stable rule rather than an arbitrary one.
- **Pages may sit directly under a category as well as inside its subcategories**, and where both
  exist the ungrouped pages are shown before the subcategory groups. The reference design shows
  exactly this shape (a flat list of pages under one group, a set of titled entries under another).
- **The media/upload capability is introduced as a general platform capability**, but this feature is
  the only consumer. Migrating the existing News hero-image addresses to managed uploads is
  explicitly out of scope and stays as it is; the two mechanisms coexist.
- **Vector image uploads are not accepted.** They can carry script and would be served from the
  portal's own origin; raster formats cover the illustrative and screenshot use cases this module
  has.
- **Syntax highlighting is applied server-side** so there is no unstyled flash and no highlighting
  runtime shipped to the browser, and the language list is a fixed, curated set covering what this
  content needs (shell, JSON, YAML, TypeScript/JavaScript, Python, Markdown, plain text) rather than
  every language a highlighter supports. Unlisted languages degrade to plain monospace (FR-028).
- **The portal has a single light colour scheme today**, so the code-block and sidebar palettes are
  specified for that scheme; because the colours resolve through the shared token layer (FR-034),
  adding a scheme later does not require revisiting this feature's components.
- **Content language is the editor's choice; interface language is not.** Chrome, labels, empty
  states and dates are Norwegian (bokmål); the body of a learning page is whatever the editor
  writes, and no translation or localisation machinery is introduced.
- **The navigation entry will not retroactively appear in environments whose navigation an editor has
  already saved** — the platform's chrome merge treats a saved navigation as authoritative. Fresh
  environments get "KI Læring" from the seeded defaults; existing ones need an editor to add the
  entry (FR-040).
- **Author attribution is recorded but not prominent.** Learning pages are institutional reference
  material rather than by-lined articles, so the last-updated date is what employees see; the author
  is captured for the back-office.
- **No feed export, no printing or PDF export, no per-page sharing controls, no reading-time
  estimates and no view counts** are in scope.

## Out of Scope

Explicitly excluded from this feature, and nothing here may preclude adding them later:

- Full-text search across learning content (the Registry's existing search stays Registry-only).
- Per-page or per-category access control beyond draft/published (no audience targeting, no
  role-restricted pages).
- Content versioning, revision history, scheduled publishing and editorial workflow beyond
  draft/published.
- Comments, reactions, ratings or any other employee-generated content.
- Progress tracking, completion state, learning paths, quizzes and assessments.
- Interactive or executable code samples — code is display-only, by requirement (FR-027).
- Embedded video, audio or file attachments other than inline images.
- Migrating existing News hero images to managed uploads.
- Deeper than two levels of grouping.

## Dependencies

- **Durable object storage for uploads in deployed environments.** FR-024 requires images to survive
  restarts, which the container filesystem cannot provide. Deployed environments therefore need a
  storage container and credentials provisioned in Azure. This is currently **pending with the
  platform team** alongside the outstanding sign-in registration and deploy-role grant. Local
  development is not blocked: the local filesystem target lets the entire feature be built, tested
  and demonstrated locally, and the deployed environment gains durable images as soon as the
  container exists. Until then, images uploaded in the deployed environment must be treated as
  ephemeral — and per FR-025 the misconfiguration must be loud rather than silent.
- **Existing shared foundation**: employee sign-in and the Entra-mapped role model, the back-office
  surface, the generated Designsystemet KI Hub theme and the kihub token layer, and the editor-managed
  site navigation — all reused as-is, with no changes to their contracts.
