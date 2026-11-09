# Feature Specification: Documentation Navigation for Pages

**Feature Branch**: `028-docs-navigation`

**Created**: 2026-11-09

**Status**: Draft

**Input**: User description: "Documentation-style navigation for KI Hub, like docs.altinn.studio: (1) a left-hand menu between the pages of a section, for example all pages under «Kom i gang», with hierarchy and order; (2) a table of contents in the right margin listing every heading (h2–h4) on the current page; (3) anchors on headings so readers can deep-link to a single section (`/side#avsnitt`), also from other pages. Pages get nested, multi-segment addresses (`/kom-i-gang/...`). Only CMS Pages appear in the section menu. Norwegian UI."

## Context

KI Hub is getting task-oriented guides, starting with a «Kom i gang» section for agentctl (Altinn/team-operativ-koordinering#39): a landing page and four long how-to pages that are meant to be read in order. Today the portal cannot support that well:

- **No anchors.** Headings in rich-text bodies (Pages and KI Læring pages) are rendered without an `id`, so nobody can link to a single section, neither within a page nor from another page.
- **No overview of a long page.** There is no table of contents. `/bidra` has a hand-written «På denne siden», but nothing exists for CMS content.
- **No structure between pages.** Pages are flat (027 FR-024): no parent, no order, no menu beside the content, and a one-segment address. A set of pages that belong together can only be tied together by hand-written links on a landing page, and the site menu cannot show that a guide belongs to «Kom i gang».

KI Læring already has a left-hand menu (014), and its pattern is the model for this feature. KI Læring's own navigation and addresses are not changed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Link to and move around within a long page (Priority: P1)

An employee reads «Kom i gang med agentctl», a long page. A list titled «På denne siden» beside the text shows every heading on the page. They click «Sett opp din første agent» and the page jumps to that section. They copy the link to the section and paste it in Slack; a colleague who opens it lands on the same section. An editor writing another page links to `/kom-i-gang/kom-i-gang-med-agentctl#sett-opp-din-forste-agent` and the link lands on that section too.

**Why this priority**: Deep links and an overview are what make long guides usable, and they help every existing Page and KI Læring page immediately, with no editor work and no data change. It can ship on its own.

**Independent Test**: Publish a page with several h2–h4 headings (including duplicates and æ/ø/å). Confirm each heading has a readable, unique anchor, that the table of contents lists them in order and nesting, that following `/address#anchor` from another page lands on the heading, and that it all works with the keyboard and with JavaScript disabled. Repeat on a KI Læring page.

**Acceptance Scenarios**:

1. **Given** a published page with the headings «Før du starter» (h2), «Installer agentctl» (h3) and «Før du starter» (h2), **When** an employee opens it, **Then** the headings have the anchors `for-du-starter`, `installer-agentctl` and `for-du-starter-2`.
2. **Given** that page, **When** it is shown on a wide screen, **Then** a list headed «På denne siden» in the right margin shows the three headings, with «Installer agentctl» indented under the first «Før du starter», and the list stays in view while the employee scrolls.
3. **Given** that page on a phone, **When** it is opened, **Then** «På denne siden» appears as a collapsed control before the body text, and opening it shows the same list.
4. **Given** an employee clicks an entry in «På denne siden», **When** the page moves to the heading, **Then** the heading is fully visible with space above it, and the address bar shows `#` and the anchor.
5. **Given** an employee focuses a heading's link with the keyboard, **When** it receives focus, **Then** a visible link to that section appears, and a screen reader announces it as a link to that section without changing how the heading itself is read.
6. **Given** an editor adds a link with the address `/om-ki-hub#kontakt` in the editor, **When** the page is saved and published, **Then** the link leads to the «Kontakt» section of «Om KI Hub».
7. **Given** a page with fewer than two headings, **When** it is shown, **Then** no table of contents is shown.
8. **Given** a KI Læring page with headings, **When** it is shown, **Then** it gets the same anchors and table of contents, beside the existing KI Læring menu.

---

### User Story 2 - Organise pages into a section with nested addresses (Priority: P1)

An editor opens the page «Koble til agenten fra en app» in the CMS, sets «Overordnet side» to «Kom i gang» and «Rekkefølge» to 20, and publishes. The page is now at `/kom-i-gang/koble-til-agenten-fra-en-app`. The site menu item «Kom i gang» is marked as current while employees read it. Later the editor moves the page under a new section «Agenter»; a colleague's saved link to the old address still opens the page at its new address.

**Why this priority**: The address and the hierarchy are the foundation for the section menu (US3), and the address must be decided before the «Kom i gang» pages are published and shared. On its own it already gives readers context: the address and the highlighted site menu item tell them where they are.

**Independent Test**: Give an existing page a parent and publish it. Confirm it is served at the nested address, that its old one-segment address redirects there, that the site menu item linking to the parent is marked current, and that the CMS refuses a cycle and a fourth level.

**Acceptance Scenarios**:

1. **Given** a published page `kom-i-gang` without a parent, **When** an editor sets it as the parent of the page `koble-til-agenten-fra-en-app` and publishes the child, **Then** employees reach the child at `/kom-i-gang/koble-til-agenten-fra-en-app`.
2. **Given** that child, **When** an employee opens its previous address `/koble-til-agenten-fra-en-app`, **Then** they are sent to `/kom-i-gang/koble-til-agenten-fra-en-app`, and a `#anchor` in the link is kept.
3. **Given** the site menu has an item «Kom i gang» linking to `/kom-i-gang`, **When** an employee is on any page under `/kom-i-gang/`, **Then** that menu item is marked as the current section, visually and for assistive technology.
4. **Given** an editor tries to make a page its own parent, or the parent of one of its own ancestors, **When** they save, **Then** the CMS refuses with a Norwegian message, also when the change is sent through the API.
5. **Given** a page that already sits at the third level, **When** an editor tries to give it a child, or to move a page with children so that the hierarchy would get a fourth level, **Then** the CMS refuses with a Norwegian message.
6. **Given** a page without a parent, **When** this feature is rolled out, **Then** its address is exactly what it was before.
7. **Given** an editor previews a draft child page whose parent is set in the draft, **When** they choose «Forhåndsvis», **Then** the draft opens at its future nested address.
8. **Given** an editor deletes a parent page, **When** an employee opens a child's nested address, **Then** they are sent to the child's new one-segment address.

---

### User Story 3 - Move between the pages of a section with a menu (Priority: P2)

An employee on `/kom-i-gang/gjor-repoet-klart-for-agenter` sees a menu on the left titled «Kom i gang» that lists the section's pages in the editor's order, with the current page marked. They click the next page in the list. On a phone the menu is a collapsed control at the top of the page. Keyboard users can skip the menus and go straight to the content.

**Why this priority**: It completes the documentation experience, but depends on US2's hierarchy, and readers can already get by with the landing page and US1's table of contents.

**Independent Test**: With a published root page and three published children (orders 30, 10, 20) and one draft child, open a child page as a reader. Confirm the menu shows the root and the three published children in order 10, 20, 30, marks the current page, omits the draft, collapses on a phone, works without JavaScript, and that «Hopp til hovedinnhold» moves focus past it.

**Acceptance Scenarios**:

1. **Given** a published section root «Kom i gang» with published children ordered 10, 20, 30 and 40, **When** an employee opens any page in the section, **Then** a menu titled «Kom i gang» lists the root first, then the children in that order, with grandchildren nested under their parent.
2. **Given** that menu, **When** it is shown, **Then** the current page is marked visually and announced as the current page by assistive technology.
3. **Given** a child page that is a draft, **When** an employee views the section, **Then** the draft is not in the menu; an editor in preview sees the draft page itself, but the menu still lists published pages only.
4. **Given** two children with the same order, **When** the menu is shown, **Then** they are sorted alphabetically by title.
5. **Given** a page that has no parent and no children (for example «Om KI Hub»), **When** it is shown, **Then** it has no section menu and looks as it does today.
6. **Given** a phone-width screen, **When** a page in a section is opened, **Then** the menu is collapsed above the content and can be opened and closed with keyboard, touch and without JavaScript.
7. **Given** a keyboard user on any portal page, **When** they press Tab once after the page loads, **Then** a «Hopp til hovedinnhold» link appears, and following it moves focus to the start of the main content, past the site header and any section menu.
8. **Given** a section root that is not published, **When** an employee opens a published child, **Then** the child is shown without a section menu.

---

### Edge Cases

- **Headings without letters or digits** (for example only «—» or an emoji) get the anchor `avsnitt`, and duplicates of that get `avsnitt-2`, `avsnitt-3`.
- **Heading text with formatting** (bold, inline code, a link) produces the anchor from the plain text only; the table of contents shows the plain text.
- **Anchors change when heading text changes.** A deep link to an old anchor then opens the top of the page. This is accepted (it is how docs.altinn.studio and GitHub behave) and editors are told so.
- **Anchors never collide with identifiers the portal layout itself uses** (for example the site menu list); a heading whose anchor would collide gets a suffix.
- **Skipped heading levels** (an h4 directly under an h2) are listed under the nearest higher heading in the table of contents, not left out.
- **A very long table of contents** scrolls on its own and never covers the page content; at high zoom it switches to the collapsed variant.
- **Addresses with an unknown or misspelt prefix** (`/feil/koble-til-agenten-fra-en-app`) send the reader to the page's current address, because the last segment identifies the page.
- **Addresses whose first segment is a built-in section** (`/news/...`, `/laering/...`) are never handled by Pages: the built-in section answers, and an unknown address under it is a normal "not found".
- **More than three segments, or a segment that is not a valid address**, gives the normal "not found" without revealing anything.
- **Changing a page's own address segment** breaks links to the old address, as it does today (only moves are redirected).
- **Moving a page and moving it back** must not produce a redirect loop in browsers that cached an earlier redirect.
- **A parent that is unpublished or a draft**: its published children stay reachable at their full address (which uses the parent's address segment), but readers see no section menu until the root is published.
- **A parent deleted**: its children become top-level pages, and their old nested addresses redirect to the new ones.
- **Concurrent edits** that would together create a cycle (two editors setting each other's pages as parent) are refused by the save that would close the cycle.
- **A child's address segment equal to a reserved word** (`news`) stays refused, so that any page can later become top-level without colliding with a built-in section.
- **Preview of a page whose parent chain exists only as drafts** renders at the draft's future address; it never makes drafts visible outside preview.

## Requirements *(mandatory)*

### Functional Requirements

**Anchors and table of contents (US1)**

- **FR-001**: Every h2, h3 and h4 heading in the rich-text body of Pages and KI Læring pages MUST have an anchor identifier, on the employee site and in preview.
- **FR-002**: The anchor MUST be derived from the heading's plain text with the same rules as page addresses: lowercase a–z and digits, «æ» → «ae», «ø» → «o», «å» → «a», other accented letters without their accent, and any other run of characters as a single hyphen, with no leading or trailing hyphen.
- **FR-003**: Anchors MUST be unique on the page: a repeated anchor gets `-2`, `-3`, … in document order; a heading that yields no characters gets `avsnitt`; an anchor MUST NOT equal an identifier used by the portal layout.
- **FR-004**: A page or KI Læring page with at least two headings MUST show a table of contents titled «På denne siden», listing every h2–h4 heading in document order, nested by level, each entry linking to its heading's anchor. The table of contents MUST be a navigation landmark named «Innhold på siden».
- **FR-005**: On wide screens the table of contents MUST sit in the right margin and stay visible while the reader scrolls, scrolling on its own when it is taller than the window. On narrower screens it MUST be a collapsed «På denne siden» control placed before the body text. Both MUST work without JavaScript.
- **FR-006**: Each heading MUST offer a link to its own anchor that is reachable with the keyboard, visible on hover and keyboard focus, has a Norwegian accessible name naming the section («Lenke til avsnittet «…»»), and does not change the heading's own accessible name.
- **FR-007**: Following a link to an anchor MUST bring the heading into view with clear space above it and mark the targeted heading visually; scrolling MUST NOT be animated when the reader prefers reduced motion.
- **FR-008**: Anchors and the table of contents MUST be derived from the content when the page is shown: no editor action, no extra field and no stored data. Editors MUST be able to write links of the form `/address#anchor` in the editor.

**Hierarchy and addresses (US2)**

- **FR-009**: A page MUST be able to have an optional parent page («Overordnet side») and a number for its position among its siblings («Rekkefølge», default 100; lower first, equal values alphabetical by title), editable in the CMS.
- **FR-010**: The hierarchy MUST be at most three levels deep (a top-level page, its children and their children). A page MUST NOT be its own parent or a descendant of itself. Violations MUST be refused with a Norwegian message, on the CMS form and on the API path.
- **FR-011**: A page's address MUST be its ancestors' address segments followed by its own, separated by `/` (for example `/kom-i-gang/koble-til-agenten-fra-en-app`). A page without a parent keeps its address `/<segment>`.
- **FR-012**: A page's own address segment MUST stay unique across all pages and keep the existing rules (one segment; lowercase a–z, digits and hyphens; derived from the title when blank; reserved addresses refused), regardless of where the page sits in the hierarchy.
- **FR-013**: When a request names a published page by its last segment but the path before it differs from the page's current address (an old flat address, a page that has moved, a misspelt prefix), the portal MUST send the reader to the current address with a temporary redirect, keeping any query and letting the browser keep the `#anchor`.
- **FR-014**: The portal MUST answer with the normal "not found" when the address has more than three segments, any segment is not a valid address segment, the first segment is a reserved address, or the last segment does not name a published page (for readers) or any page (for editors in preview). It MUST NOT reveal whether a draft exists.
- **FR-015**: Built-in portal sections MUST always take precedence over Pages at every address they serve.
- **FR-016**: «Forhåndsvis» MUST open a page at the address it will have when published, computed from the latest saved versions of the page and its ancestors.
- **FR-017**: A site menu item that links to a section's top-level page MUST be marked as current on every page within that section.
- **FR-018**: The CMS SHOULD show editors the page's full address on the site, so they know what to link to.
- **FR-019**: Pages that have no parent MUST keep their current address and behaviour on rollout; no existing page is moved.

**Section menu (US3)**

- **FR-020**: A page that has a parent or children MUST show a section menu built from its section: the top-level page first, then its children in order, each child's own children nested beneath it. The current page MUST be marked visually and for assistive technology.
- **FR-021**: The section menu MUST list CMS Pages only, and only published ones; drafts never appear in it, also not in preview.
- **FR-022**: The section menu MUST be a navigation landmark named after the section's top-level page, sit beside the content and stay visible while scrolling on wide screens, and be a collapsed control above the content on narrow screens; both MUST work without JavaScript.
- **FR-023**: When the section's top-level page is not published, readers MUST see the page without a section menu.
- **FR-024**: Every portal page MUST start with a «Hopp til hovedinnhold» link that is the first focusable element, is visible when focused and moves focus to the start of the main content.
- **FR-025**: Pages without a parent and without children MUST render as they do today, apart from US1's anchors and table of contents.

**Scope and governance**

- **FR-026**: KI Læring's navigation, hierarchy and addresses MUST NOT change; KI Læring pages only gain US1's anchors and table of contents.
- **FR-027**: The constitution MUST be amended to describe Pages as a hierarchy with nested addresses of up to three segments and a section menu, replacing «flat, one-segment address».
- **FR-028**: This feature supersedes 027 FR-024 («Pages are flat»); 027 is otherwise unchanged.

### Key Entities

- **Page** (changed): gains an optional **parent** (another Page) and an **order** among its siblings. Its **address segment** (`slug`) is unchanged and still unique across all pages. Its **address** is derived from its ancestors and is not stored.
- **Section** (derived): a top-level page together with all its descendants. It has no record of its own; its title is the top-level page's title.
- **Heading anchor** (derived): the identifier of an h2–h4 heading on a rendered page, derived from the heading text and its position among identical headings.
- **Table of contents** (derived): the ordered, nested list of a page's heading anchors.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On the «Kom i gang» pages and every published KI Læring page, 100% of h2–h4 headings have an anchor and no anchor appears twice on a page.
- **SC-002**: From the top of any page with a table of contents, a reader reaches any section in one click or one keyboard activation.
- **SC-003**: A link of the form `/address#anchor`, opened from Slack or another page, lands on the named section in 100% of tested cases, including after the page has moved to another section.
- **SC-004**: An editor can place an existing page in a section and set its position in under one minute, without developer help.
- **SC-005**: After rollout, 0 existing pages have changed address, and 0 draft pages appear in a section menu for a reader account.
- **SC-006**: Every navigation element added by this feature can be used with the keyboard only and with JavaScript disabled, and automated accessibility checks report no new violations on a page with a section menu and a table of contents.
- **SC-007**: A reader can tell which section they are in from the address, the site menu and the section menu on 100% of pages in a section.

## Assumptions

- **Slugs stay globally unique.** Two sections cannot both have a page with the address segment `oversikt`. This keeps the last segment enough to identify a page, which is what makes moves safe (FR-013). It may be relaxed later.
- **Three levels are enough.** «Kom i gang» needs two (the landing page and its guides); a third allows a group page with its own guides. Learning has the same depth (category, subcategory, page).
- **Anchors are not stable across heading edits.** Stored, editor-managed anchors are out of scope; they need a custom editor node and add editor work.
- **No «where am I» highlighting while scrolling** (scrollspy) in the table of contents. docs.altinn.studio does not have it either, and it would need client-side code; it can be added later.
- **Section menu shows the whole section expanded.** Sections are expected to be small (fewer than about 20 pages). Collapsible groups can come later.
- **The table of contents is shown from two headings.** Pages with one heading gain nothing from it.
- **Editors maintain the site menu by hand**, as today: adding «Kom i gang» to the site menu is a Site Chrome edit, not something this feature does.
- **Internal links** («Intern lenke» to a document in the editor) currently render as `href="#"` because the renderer has no mapping from document to address. Fixing that is a separate fix, not part of this feature; with this feature it can link Pages by `/<slug>` and rely on FR-013.
- **The «Kom i gang» pages are drafts at the time of writing**, so no published link changes when they are placed in the hierarchy.

## Clarifications

### Session 2026-11-09

- Q: Flat addresses with a parent field, or nested multi-segment addresses? → A: Nested addresses (`/kom-i-gang/...`). Moves are handled by redirecting on the last segment (FR-013), which keeps the reason 014 and 027 chose flat addresses (shared links must not break) intact.
- Q: What can the section menu contain: only Pages, or also KI Læring pages and other addresses (such as `/bidra`)? → A: Only Pages (FR-021).
- Q: Which heading levels go in the table of contents? → A: h2, h3 and h4 (FR-004).

Not yet confirmed (defaults chosen by the spec author; change here if the team decides otherwise):

- KI Læring pages also get anchors and a table of contents, and their navigation is otherwise unchanged (FR-026).
- Headings get a visible link to themselves in the first version (FR-006).
- The table of contents is shown from two headings (FR-004).
