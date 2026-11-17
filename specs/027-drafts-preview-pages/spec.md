# Feature Specification: Editorial Drafts with Preview, and CMS-Managed Pages

**Feature Branch**: `027-drafts-preview-pages`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Editorial drafts with preview, and CMS-managed static pages, for KI Hub (Payload 3.88 CMS at /cms, Next.js employee portal). Part A — Drafts with preview for native content (News, KI Læring pages, Projects; Events to be decided): built-in versions + drafts replacing the hand-rolled `status` field, autosave, scheduled publishing, version history with restore, and a Preview button that shows the draft on the real employee site to editors only. Editing a published document must keep the live version unchanged until the new version is published. Part B — Static pages managed in the CMS: a new pages module (title, slug, summary, rich-text body with KI Læring's rich-text capabilities), drafts + preview from day one, served at top-level addresses where existing portal routes always win and reserved addresses are rejected; editors link pages from the header/footer via Site Chrome. `/bidra` stays code-owned. Adds a new Product Module (constitution amendment). Norwegian UI."

## Context

KI Hub has exactly **one** environment: production. Content is not "deployed" — it lives in the production CMS. "Review before it goes to prod" therefore means: an editor works on a draft inside the production CMS, sees it rendered exactly as employees would see it, has it reviewed, and only then makes it visible to employees.

Today News, KI Læring pages, Projects and Events each have a simple *draft / published* switch. Employees never see drafts, but:

- an editor cannot see what a draft will look like on the site without publishing it (i.e. making it live);
- a published item cannot be changed without the change going live on save;
- there is no history of earlier versions and no way to undo an edit;
- publishing cannot be scheduled (scheduling stays out of scope, see Clarifications).

Separately, there is no way to create a free-standing information page (e.g. "Om KI Hub", "Retningslinjer for KI-bruk") without a code change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview a draft on the real site before publishing (Priority: P1)

An editor writes a new news article (or KI Læring page, or project) in the CMS and saves it as a draft. They click **Forhåndsvis** and the draft opens on the employee site, rendered with the real layout, styling, hero image and navigation, with a clear banner saying this is an unpublished preview. A colleague with CMS access opens the same preview to review it. When satisfied, the editor publishes; until then, no employee can see the article anywhere on the site.

**Why this priority**: This is the core ask — "review it before we publish it to prod". Without it, every review happens on live content.

**Independent Test**: Create a draft news article, open its preview as an editor (renders as the final page with a preview banner), open the same address as a reader (not found), confirm it is absent from the frontpage «Siste nytt» and `/news`, then publish and confirm it appears for the reader.

**Acceptance Scenarios**:

1. **Given** an editor has saved a never-published news article as a draft, **When** they choose *Forhåndsvis* in the CMS, **Then** the article opens on the employee site at its future address, rendered as it will look when published, with a visible "Forhåndsvisning – ikke publisert" banner.
2. **Given** the same draft, **When** an employee without a CMS role opens that address, **Then** they get the normal "not found" page and nothing reveals that the draft exists.
3. **Given** the same draft, **When** any employee views the frontpage, the news list, the KI Læring sidebar, the projects list or any other listing, **Then** the draft does not appear.
4. **Given** an editor is viewing a preview, **When** they choose *Avslutt forhåndsvisning* in the banner, **Then** they return to seeing only published content.
5. **Given** a reviewer with a CMS role receives the preview link from the editor, **When** they open it, **Then** they see the same draft rendering.

---

### User Story 2 - Edit published content without changing the live version (Priority: P1)

An editor needs to rewrite part of a published KI Læring page. They edit it in the CMS and save a draft. Employees keep seeing the current published version. The editor previews the revised version, gets it reviewed, and publishes; only then do employees see the change.

**Why this priority**: Most editorial work is updating existing content. Without this, every save of a published item is an immediate, unreviewed change to production.

**Independent Test**: Edit the title and body of a published item and save as draft; a reader still sees the old title/body (including in lists); the preview shows the new ones; after publishing the reader sees the new ones.

**Acceptance Scenarios**:

1. **Given** a published item, **When** an editor changes it and saves a draft, **Then** employees continue to see the previously published version everywhere it appears.
2. **Given** that pending draft, **When** the editor opens the preview, **Then** the preview shows the pending changes.
3. **Given** that pending draft, **When** the editor publishes, **Then** employees see the new version.
4. **Given** a published item with a pending draft that changes its address (slug), **When** employees visit the old address before publishing, **Then** they still see the published version at the old address.
5. **Given** a published item, **When** an editor chooses to unpublish it, **Then** it disappears from the employee site but remains in the CMS as a draft.

---

### User Story 3 - Create a standalone information page (Priority: P2)

An editor creates a page "Om KI Hub" in the CMS with a title, address (`om-ki-hub`), short introduction and rich body text (headings, lists, links, images, code examples, embedded YouTube video). They preview it, publish it, and add a link to it in the header or footer via the existing site navigation settings. Employees reach it at `/om-ki-hub`.

**Why this priority**: Unlocks new content types without developer involvement, but is not blocking the existing editorial workflow.

**Independent Test**: Create, preview and publish a page; confirm it renders at its top-level address with the portal layout, add it to the footer links and follow the link.

**Acceptance Scenarios**:

1. **Given** an editor creates a page with address `om-ki-hub`, **When** it is published, **Then** employees can open `/om-ki-hub` and see the page in the standard portal layout (header, footer, typography), in Norwegian.
2. **Given** an editor tries to give a page an address that the portal already uses (e.g. `news`, `laering`, `prosjekter`, `events`, `registry`, `bidra`, `artifacts`, `cms`, `signin`), **When** they save, **Then** the CMS refuses with a Norwegian message explaining the address is reserved.
3. **Given** two pages, **When** an editor gives the second the same address as the first, **Then** the CMS refuses the save.
4. **Given** a page that is a draft (never published), **When** an employee opens its address, **Then** they get "not found"; an editor using preview sees it.
5. **Given** a published page is linked from the header, **When** the page is later unpublished or deleted, **Then** the link leads to the normal "not found" page (no error page).
6. **Given** the page body uses images, code blocks or YouTube embeds, **When** it is rendered, **Then** they look and behave the same as in KI Læring.

---

### User Story 4 - Version history and restore (Priority: P2)

An editor realises a recent edit to a project description removed important information. They open the item's version history in the CMS, compare an earlier version with the current one, and restore the earlier version. Restoring creates a new draft (or publishes, if they choose), so nothing is lost.

**Why this priority**: Safety net for mistakes; comes essentially free with the draft mechanism but is less frequent than daily drafting/preview.

**Independent Test**: Make three successive saves to an item, open history, compare version 1 with the current version, restore version 1, confirm content matches version 1.

**Acceptance Scenarios**:

1. **Given** an item that has been saved several times, **When** an editor opens its version history, **Then** they see a list of earlier versions with date/time, author and whether each was a draft or published.
2. **Given** that list, **When** they compare two versions, **Then** they see what changed between them.
3. **Given** an earlier version, **When** they restore it, **Then** its content becomes the current content without deleting any other version.

---

### User Story 5 - Autosave while writing (Priority: P3)

While writing a long article, the editor's work is saved as a draft automatically at short intervals, so closing the tab or losing connection does not lose more than a few seconds of work. Autosave never publishes.

**Why this priority**: Comfort feature; reduces lost work but does not change what can be done.

**Independent Test**: Type into a draft, wait for the autosave indicator, reload the CMS page, confirm the text is still there and that the published version (if any) is unchanged.

**Acceptance Scenarios**:

1. **Given** an editor is typing in a draft, **When** a short interval passes, **Then** the draft is saved automatically and the CMS shows that it was saved.
2. **Given** an item is published, **When** autosave runs on edits to it, **Then** the published version that employees see is unchanged.

---

### User Story 6 - Schedule publishing — REMOVED

Dropped on 2026-11-05 at the product owner's request (see Clarifications). Publishing is
always a manual editor action.

---

### Edge Cases

- **Existing content on rollout**: every existing News article, KI Læring page, Project and Event keeps exactly its current visibility — published stays published, draft stays draft — with no editor action and no content loss (including publish dates, hero images and ordering).
- **Draft leakage through side channels**: drafts must not appear in any listing, count, navigation tree, frontpage widget, pagination total, calendar export (`.ics`), or metadata (page title) for non-preview visitors.
- **Preview of an item whose category/parent is unpublished** (e.g. a KI Læring page in a context that only exists as draft): preview still renders the item; it never makes other drafts visible outside preview.
- **News publish date**: a news article that is published without a publish date gets today's date, as it does now.
- **Preview session lingering**: an editor who previewed and then browses normally must not mistake drafts for live content — the preview banner is visible on every page while preview is active, and preview ends automatically after a limited time.
- **Preview link sent to someone without a CMS role**: they see "not found" (never a draft), and nothing indicates the content exists.
- **Losing a CMS role while previewing**: preview stops showing drafts on their next page view.
- **Page address edge cases**: addresses are lowercase, URL-safe, single-segment, and derived from the title when left blank (same behaviour as News/Projects); leading/trailing slashes and case differences do not bypass the reserved-address rule.
- **Future portal routes**: if a new built-in section is added later with an address an existing page already uses, the built-in section wins; the conflict must be detectable (the reserved list lives in one place).
- **Concurrent editing**: two editors editing the same item — the CMS's normal behaviour applies (document lock / last save wins); version history allows recovery.
- **Deleting an item**: deletes all its versions; deleting a page linked from the header leaves a dead link that shows "not found" (editors are responsible for nav links, as today).

## Requirements *(mandatory)*

### Functional Requirements

**Drafts, versions and publishing (Part A)**

- **FR-001**: News articles, KI Læring pages, Projects and Events MUST support a draft state that is separate from the published state, so that saving changes to a published item does not change what employees see until it is published again.
- **FR-002**: The CMS MUST offer distinct actions to *save draft*, *publish* and *unpublish* for these content types, with Norwegian labels where the CMS allows customisation.
- **FR-003**: Employees without a CMS role MUST only ever see the latest published version of any item, on every surface (detail pages, lists, frontpage, KI Læring sidebar, projects list, calendar and calendar export, page titles).
- **FR-004**: All existing content MUST be carried over so that its visibility is exactly as before rollout, without editors having to re-save or re-publish anything.
- **FR-005**: The CMS MUST keep a version history per item, showing for each version when it was saved, by whom, and whether it was a draft or a publication.
- **FR-006**: Editors MUST be able to compare two versions of an item and restore an earlier version.
- **FR-007**: The CMS MUST autosave drafts at short intervals while an editor is working; autosave MUST never publish or change the published version.
- **FR-008**: *(Removed 2026-11-05.)* Scheduled publishing is out of scope: the CMS MUST NOT offer it.
- **FR-009**: Existing behaviour that depends on publishing MUST be preserved — in particular, a news article published without a publish date gets the publication date automatically.
- **FR-010**: Publishing rights stay as today: every CMS user (contributor and above) can save drafts, publish and unpublish. Review before publishing is by team convention (share the preview link), not enforced by role.

**Preview (Part A)**

- **FR-011**: Each draft-enabled content type MUST have a *Forhåndsvis* (preview) action in the CMS that opens the item on the employee site at the address it will have when published.
- **FR-012**: The preview MUST render the latest draft using the same page layout, styling and components as the published page.
- **FR-013**: Preview MUST only be available to signed-in users who have a CMS role (contributor or above); any other visitor following a preview link MUST see the normal "not found" response for unpublished content, and MUST NOT be able to infer that the draft exists.
- **FR-014**: Preview MUST NOT rely on a shared secret in the link; access is decided by the visitor's own sign-in and role, so a forwarded link grants nothing to someone without a CMS role.
- **FR-015**: While preview is active, every page MUST show a clearly visible Norwegian banner stating that unpublished content may be shown, with a way to leave preview mode.
- **FR-016**: Preview mode MUST end automatically after a limited period and when the editor leaves it explicitly.
- **FR-017**: Preview MUST NOT make other drafts visible to non-preview visitors, and pages rendered in preview MUST NOT be cached and later served to employees.

**Pages (Part B)**

- **FR-018**: Editors MUST be able to create, edit, preview, publish, unpublish, version and delete standalone pages in the CMS, with the same draft behaviour as FR-001–FR-017.
- **FR-019**: A page MUST have a title, a single-segment address (derived from the title if left blank), an optional short introduction, and a rich-text body supporting the same content as KI Læring pages (headings, lists, links, images, code blocks with highlighting, YouTube embeds).
- **FR-020**: A published page MUST be reachable at `/<address>` on the employee site, inside the standard portal layout, with the page title in the browser tab.
- **FR-021**: Page addresses MUST be unique, and MUST NOT equal any address already used by a built-in portal section or system route; the CMS MUST reject such saves with a Norwegian explanation. Built-in sections MUST always take precedence over pages.
- **FR-022**: A request for an address with no published page MUST return the portal's normal "not found" page.
- **FR-023**: Editors MUST be able to link pages from the header navigation and footer links using the existing site navigation settings; no new navigation mechanism is introduced.
- **FR-024**: Pages are flat (one level, no parent/child hierarchy) in this feature.
- **FR-025**: Pages are employee-only like the rest of the portal: only signed-in employees can view them.
- **FR-026**: The existing contribution guide (`/bidra`) remains a built-in section and is not migrated to a page.

**Governance**

- **FR-027**: The project constitution MUST be amended to add Pages as a native-content Product Module (not an artifact), following the precedent of the Learning and Projects amendments.
- **FR-028**: Access rules for pages MUST match the other native content: readers see only published pages; CMS roles see, edit and publish everything (FR-010).

### Key Entities

- **Content item (News article, KI Læring page, Project, Event)**: existing editorial content; gains a *published version* (what employees see), an optional *pending draft*, and a *version history*.
- **Version**: a saved snapshot of a content item, with timestamp, author and kind (draft or published). Restorable.
- **Page** (new): standalone editorial content with title, address, optional introduction, rich-text body, and the same draft/version behaviour. Not an artifact; has no category or parent.
- **Reserved address list**: the set of top-level addresses owned by built-in portal sections and system routes, which pages may not use.
- **Preview session**: a time-limited state on an editor's browser that lets them see drafts on the employee site; only effective while the user holds a CMS role.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An editor can go from saved draft to seeing it rendered on the employee site in at most 2 clicks from the CMS editing view.
- **SC-002**: In testing, 0 draft items or pending draft changes are visible to a reader account on any surface (detail, lists, frontpage, sidebar, calendar, calendar export, page titles), including via a forwarded preview link.
- **SC-003**: After rollout, 100% of existing items have the same visibility (published/draft) and the same content as before, verified by comparing counts and titles per content type before and after.
- **SC-004**: Editing and saving a published item as a draft causes 0 visible changes for readers until it is published.
- **SC-005**: An editor can create and publish a new standalone page, and link it from the footer, in under 5 minutes without developer help.
- **SC-006**: An editor can restore any earlier version of an item in under 1 minute.
- **SC-007**: *(Removed with scheduled publishing.)*
- **SC-008**: When a writing session is interrupted (tab closed), at most the last ~30 seconds of edits are lost.

## Assumptions

- **Single environment**: there is no staging environment; all review happens through drafts + preview in production. No content sync between environments is in scope.
- **Reviewers have CMS accounts**: the people who review drafts are signed in with a CMS role (contributor or above). Sharing previews with employees who have no CMS role is out of scope; giving a colleague the contributor role is the way to involve them.
- **Events are included**: Events use the same draft/preview mechanism as the other content types so editors have one consistent workflow; leaving them on the old switch would mean two different publishing models in the same CMS. Events are lowest priority and can be delivered last.
- **Side-by-side live preview** (preview updating as you type inside the CMS) is out of scope; the *Forhåndsvis* action opening the real page is sufficient. It may be added later.
- **No review workflow states** (e.g. "submitted for review", approvals, comments) beyond draft/published are introduced; review happens by sharing the preview link (FR-010).

## Clarifications

### Session 2026-11-05

- Q: Who may publish? → A: Keep as today — any CMS user (contributor+) can publish; review is by convention via the preview link (FR-010).
- Q (during implementation): Keep scheduled publishing (needs a job runner on a scale-to-zero app)? → A: No — no runner and no scheduled release. US6, FR-008 and SC-007 removed; the CMS shows no schedule option.
- **Version retention**: the CMS keeps a bounded number of versions per item (on the order of the most recent 50–100); older versions may be pruned.
- **Page hierarchy and SEO fields** are out of scope (Start Simple / YAGNI): pages are flat, and the portal is employee-only behind sign-in, so search-engine metadata has no audience.
- **Page body capabilities are reused** from KI Læring rather than introducing a block-based page builder.
- **Media**: pages use the existing media library and storage; no new storage.
- **Navigation is editor-managed**: adding/removing page links in the header/footer is a manual editor step via existing site settings, as it is today for other links.
- **Scheduled publishing is out of scope** (Clarifications 2026-11-05).
