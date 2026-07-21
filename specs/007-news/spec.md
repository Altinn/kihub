# Feature Specification: Phase 7 — News

**Feature Branch**: `feat/new-architecture` (single-branch workflow; see `.specify/feature.json`)

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Phase 7 — News: a `news` Payload collection with fields title, rich-text body, summary, author, publish date, status (draft/published), optional tags and hero image, and a featured flag. News articles are authored and published in the `/cms` editor back-office by Contributor+ users (server-side role gating, reusing the Phase 6 admin gate). All employees read news in the employee-facing Designsystemet app: a `/news` list of published articles (newest first, featured surfaced) plus an article detail page; unpublished drafts are never visible to employees. News is first-class NATIVE platform content per Constitution Principle II — no Git source, not an artifact, fully owned by Payload. Reuses the shared foundation (Entra auth, five-role model, two-surface split, Payload data layer). Deferred to later phases: scheduled publishing, comments, a categories taxonomy, and a home-page news widget."

## Overview

News is the first of KI Hub's **native content** modules (Constitution Product Modules; Principle II).
Unlike the Registry — a catalog/governance layer over Git-owned AI artifacts — a news article has no
external source of truth: it is written, edited, and published inside KI Hub and is fully owned by the
platform. This phase delivers the everyday-value half of the portal charter: an internal news feed all
employees can read, authored by a small set of editors in the existing `/cms` back-office. It reuses
the shared foundation established in Phases 1–6 (Entra auth, the five-role model, the two-surface split,
and the Payload data layer) and adds no new datastore or external service.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employees read the internal news feed (Priority: P1)

As an employee, I open the app and read internal news: a list of published articles (most recent first,
with featured items surfaced) and, from there, a full article page with its title, body, author, and
publish date. This is the module's primary everyday value — the reason employees visit the portal.

**Why this priority**: The charter's stated everyday value for KI Hub is "being the internal home
employees actually visit." A readable news feed for all employees is that value; without it the module
delivers nothing to its largest audience. It is the MVP.

**Independent Test**: With one or more published articles present (seeded or authored), sign in as any
employee (including a Reader), open the news list, confirm published articles appear newest-first with
featured ones surfaced, open an article, and confirm its title/body/author/publish date render. Confirm
an empty state (not an error) when nothing is published.

**Acceptance Scenarios**:

1. **Given** three published articles with different publish dates, **When** an employee opens the news
   list, **Then** all three appear ordered newest-first.
2. **Given** a published article flagged featured, **When** an employee opens the news list, **Then**
   that article is surfaced (visually distinguished / placed ahead of non-featured items).
3. **Given** a published article, **When** an employee opens its detail page, **Then** the title, body,
   author, and publish date are shown.
4. **Given** no published articles, **When** an employee opens the news list, **Then** a friendly empty
   state is shown (not an error).

---

### User Story 2 - Editors author and publish news in the back-office (Priority: P2)

As a Contributor-or-above editor, I create a news article in the `/cms` back-office — title, rich-text
body, summary, author, publish date, optional tags and hero image, featured flag — save it as a draft
while I work, and publish it when it is ready. Publishing makes it visible to employees; I can later edit
or unpublish it.

**Why this priority**: Authoring is what populates the feed US1 renders. It is separated from US1 because
the read surface can be demonstrated against seeded content, but a self-sustaining module needs an
authoring path. It builds directly on the Phase 6 back-office and its Contributor+ gate.

**Independent Test**: Sign in as a Contributor+ persona, create an article in `/cms`, save it as draft,
then publish it; confirm it persists and (once published) becomes visible to employees. Confirm a Reader
/ anonymous user cannot author or publish.

**Acceptance Scenarios**:

1. **Given** a signed-in Contributor+, **When** they create and publish an article in `/cms`, **Then**
   the article is saved and appears in the employee news list.
2. **Given** a signed-in Contributor+, **When** they save an article as draft, **Then** it is persisted
   but does not appear to employees.
3. **Given** a published article, **When** an editor edits its body and saves, **Then** employees see the
   updated content without a redeploy.
4. **Given** a Reader or anonymous user, **When** they attempt to create/edit/publish a news article,
   **Then** the action is refused server-side.

---

### User Story 3 - Publication visibility is controlled and safe (Priority: P3)

As the platform, I guarantee that only published articles are ever visible to employees and that
unpublishing immediately removes an article from the employee surfaces — including by direct URL — so
drafts and retracted articles never leak.

**Why this priority**: Draft/retracted content leaking to all employees is the module's main risk. The
draft/published control is introduced in US2; this story hardens and independently verifies the
visibility guarantee (list, detail, and direct-URL access) as an explicit, testable invariant.

**Independent Test**: Attempt to reach a draft article's detail page directly as an employee (refused /
not found); publish it (now reachable); set it back to draft (disappears from the list and its detail URL
is no longer accessible).

**Acceptance Scenarios**:

1. **Given** a draft article, **When** an employee requests its detail page by direct URL, **Then** it is
   not found / not accessible (no draft content is exposed).
2. **Given** a published article that an editor sets back to draft, **When** an employee reloads the news
   list, **Then** the article is gone, and its detail URL is no longer accessible.
3. **Given** the employee app, **When** any news surface is rendered, **Then** it never includes an
   unpublished article.

---

### Edge Cases

- **No published news**: the list shows a friendly empty state, never an error or a blank page.
- **Article without a hero image or tags**: renders cleanly (image/tags are optional).
- **Unpublish while being read**: an article set back to draft is removed from employee surfaces on next
  request; a direct URL to it is no longer accessible.
- **Long / rich body content**: headings, lists, links, and emphasis in the body render readably on the
  detail page.
- **Publish date**: an article marked published has a publish date (defaults to the moment of publishing,
  editable by an editor); the list ordering relies on it.
- **Author no longer active**: an article whose author account is later removed still displays a sensible
  byline and does not error.
- **Direct back-office access by a Reader/anonymous**: refused by the existing Phase 6 entry gate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a native **News Article** content type with: title, body
  (rich text), short summary, author, publish date, status (draft or published), optional tags, optional
  hero image, and a featured flag.
- **FR-002**: Editors with role **Contributor or above** MUST be able to create, edit, and delete news
  articles in the `/cms` editor back-office; these actions MUST be gated by role and enforced server-side.
- **FR-003**: Each article MUST carry a status of **draft** or **published**; only **published** articles
  are visible to employees.
- **FR-004**: Employees MUST be able to view a list of **published** news articles in the employee-facing
  app, ordered **newest-first** by publish date, with **featured** articles surfaced.
- **FR-005**: Employees MUST be able to open a published article's detail page showing at least its title,
  body, author, and publish date.
- **FR-006**: Unpublished (draft) articles MUST NOT be visible or accessible to employees on the employee
  app — not in any list and not via a direct detail URL.
- **FR-007**: Readers and anonymous users MUST NOT be able to author, edit, publish, or unpublish news;
  this MUST be enforced server-side (not only hidden in the UI).
- **FR-008**: News content MUST be stored natively in KI Hub's data layer (Payload), MUST NOT be sourced
  from or reconciled against Git, and MUST NOT be modeled as an artifact (respecting the Registry
  boundaries in Principles I/II/III).
- **FR-009**: Both surfaces MUST reuse the existing single Entra auth model, the five-role model, and the
  two-surface split; only signed-in employees may read news, and the employee-facing news UI MUST be built
  with Designsystemet (the back-office remains Payload's own admin UI, exempt).
- **FR-010**: Publishing, editing, or unpublishing an article MUST take effect for employees without a
  redeploy (reflected on the next request after save).
- **FR-011**: Each article MUST record author attribution, shown to employees as a byline on the article.
- **FR-012**: The employee news surfaces MUST show a friendly empty state when no articles are published.

### Key Entities *(include if feature involves data)*

- **News Article**: a native, KI-Hub-authored article. Attributes: title; body (rich text); short summary
  (for list previews); author (attribution to a KI Hub user); publish date; status (draft | published);
  tags (optional, free-form labels); hero image (optional); featured (boolean). Owned entirely by Payload;
  no Git source; not an artifact. It has no dependency on the Registry's `Artifact`/`CatalogEntry` records.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From opening the app, an employee can reach and read the latest published article in no more
  than two clicks.
- **SC-002**: 100% of unpublished (draft) articles are inaccessible to employees — verified across the
  list, the detail page, and direct-URL access — with zero draft leaks.
- **SC-003**: An editor can publish a new article and an employee sees it in the news list on the next
  page load (no redeploy, effectively immediate).
- **SC-004**: 100% of author/publish/edit attempts by a Reader or anonymous user are refused server-side.
- **SC-005**: The news list presents published articles newest-first with featured items surfaced, for any
  set of articles (ordering and surfacing are correct 100% of the time).
- **SC-006**: When no article is published, employees see a friendly empty state rather than an error, and
  the module adds no new external datastore or service (reuses the existing platform).

## Assumptions

- **Authoring and publishing role**: Contributor-and-above may both author and publish news. News is native
  editorial content and is intentionally **not** put under the Registry's AI-governance lifecycle / typed
  reviews / approval matrix; a finer split (e.g., a dedicated editor/publisher distinction) is deferred until
  a concrete need arises.
- **Author attribution**: an article's author is a reference to a KI Hub user, defaulting to the creator and
  editable by editors; the employee byline shows that user's name.
- **Publish date**: defaults to the moment of publishing and is editable by an editor; it drives list
  ordering. (Scheduling a *future* publish date to auto-publish is out of scope — see below.)
- **Reading audience**: news is internal — only signed-in employees may read it (same gate as the rest of the
  employee app); it is not public/anonymous.
- **Employee route**: the news list lives at `/news` and an article at a per-article detail route under it;
  this does not collide with existing employee routes (`/`, `/artifacts/*`, `/admin/*`, `/signin`) or the
  back-office (`/cms`).
- **Shared foundation reused unchanged**: Entra/Auth.js session, the five-role model, the Phase 6 back-office
  entry gate, and the Payload/PostgreSQL data layer are reused as-is; no new datastore, service, or
  dependency is introduced.
- **Out of scope (deferred to later phases)**: scheduled/timed publishing, reader comments or reactions, a
  formal categories taxonomy (beyond free-form tags), and a home-page/landing news widget. Calendar/Events is
  a separate later phase.
