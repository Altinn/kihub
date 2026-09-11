# Feature Specification: Distinct destinations for frontpage banner links

**Feature Branch**: `016-fix-frontpage-banner-links`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Fix Altinn/kihub#135: the frontpage banner shows two tiles, 'Verktøy' and 'KI Prosjekter i BOD', but both currently link to the same page ('Registry'). Give 'KI Prosjekter i BOD' its own destination, with a page that editors can populate with content via the CMS, listing individual AI projects underway in BOD."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee opens "KI Prosjekter i BOD" from the frontpage (Priority: P1)

An employee lands on the KI Hub frontpage and selects the "KI Prosjekter i BOD" tile because they want to see what AI projects exist in BOD. Today this takes them to the tool registry instead — an unrelated destination that doesn't answer their question.

**Why this priority**: This is the reported bug (Altinn/kihub#135) and the core of the confusion: two visually distinct options resolve to the same content, so users can't find AI project information at all.

**Independent Test**: Click "KI Prosjekter i BOD" on the frontpage and confirm it opens a dedicated page listing AI projects in BOD, distinct from the tool registry.

**Acceptance Scenarios**:

1. **Given** the frontpage, **When** an employee selects "KI Prosjekter i BOD", **Then** they land on a page dedicated to AI projects in BOD, not the tool registry.
2. **Given** the new AI-projects page has at least one published project, **When** an employee opens the page, **Then** they see that project listed with a title and short summary.
3. **Given** an employee selects a listed project, **When** they open it, **Then** they see the project's full details (title, summary, full description).

---

### User Story 2 - Employee opens "Verktøy" from the frontpage (Priority: P2)

An employee selects the "Verktøy" tile to browse available AI tools. This must keep working exactly as it does today — it already goes to the correct destination (the tool registry) — so nothing about this path should change as a side effect of fixing the AI-projects link.

**Why this priority**: Lower priority than P1 because this path is not broken today; it's a regression guard, not new behavior.

**Independent Test**: Click "Verktøy" on the frontpage and confirm it still opens the tool registry, unchanged.

**Acceptance Scenarios**:

1. **Given** the frontpage, **When** an employee selects "Verktøy", **Then** they land on the tool registry, exactly as before.

---

### User Story 3 - Content editor adds and publishes an AI project (Priority: P1)

A KITT content editor wants to make an AI project in BOD visible to employees. Today there is nowhere in the CMS to author this content at all — the destination doesn't exist.

**Why this priority**: Equally critical to User Story 1 — the employee-facing page is worthless without a way for editors to populate it, and the issue explicitly asks for a CMS-managed destination "so we can add content."

**Independent Test**: In the CMS, create a new AI-project entry, publish it, and confirm it appears on the public AI-projects page; confirm an unpublished (draft) entry does NOT appear.

**Acceptance Scenarios**:

1. **Given** a content editor is in the CMS, **When** they create a new AI-project entry with a title and description and mark it published, **Then** it appears on the public AI-projects listing page.
2. **Given** a content editor creates a project entry but leaves it as a draft, **When** an employee (non-editor) views the AI-projects page, **Then** the draft project does not appear.
3. **Given** an editor edits a previously published project's content, **When** they save, **Then** employees see the updated content the next time they view the project.

---

### Edge Cases

- What happens when no AI projects have been published yet? The listing page must show a clear "nothing here yet" state rather than an error or a blank page (matching the existing empty-state pattern used elsewhere on the site, e.g. the news page).
- What happens if an employee visits an AI-project detail page by a link/bookmark for a project that was later unpublished or deleted? The page must respond as "not found," never leak the draft/removed content.
- What happens if a project title is very long or contains special characters when generating its page address? The system must still produce a valid, unique page address.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The "KI Prosjekter i BOD" frontpage tile MUST link to a destination dedicated to AI projects in BOD, separate and distinct from the tool registry destination used by "Verktøy".
- **FR-002**: The "Verktøy" frontpage tile MUST continue to link to the existing tool registry, unchanged.
- **FR-003**: The system MUST provide a page listing all published AI projects in BOD.
- **FR-004**: Each listed AI project MUST show at minimum a title and short summary on the listing page.
- **FR-005**: Employees MUST be able to open an individual AI project to see its full details (title, summary, full description).
- **FR-006**: Content editors MUST be able to create, edit, and publish/unpublish AI-project entries through the CMS back-office, without needing a code change or deployment.
- **FR-007**: Unpublished (draft) AI-project entries MUST NOT be visible to employees on either the listing page or an individual project's page.
- **FR-008**: The AI-projects listing page MUST show a clear empty-state message when no projects are published yet.
- **FR-009**: Requesting an AI-project page that doesn't exist, or is unpublished, MUST show a standard "not found" response, not an error or leaked draft content.

### Key Entities *(include if feature involves data)*

- **AI Project**: Represents one AI project underway in BOD that KITT wants to showcase to employees. Key attributes: title, a short summary (for the listing view), a full description (for the detail view), and a published/draft status controlling employee visibility. Has no relationship to the existing tool/artifact catalog — an AI project is not a tool.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Selecting "KI Prosjekter i BOD" and selecting "Verktøy" from the frontpage take users to two visibly different destinations, 100% of the time.
- **SC-002**: A content editor can publish a new AI project and see it live on the AI-projects page without any code change or deployment.
- **SC-003**: Zero draft AI-project entries are ever visible to a non-editor employee.

## Assumptions

- "KI Prosjekter i BOD" needs a genuinely new destination and content model — there is no existing page or content type in KI Hub today that represents "AI projects in BOD" as opposed to individual reusable tools.
- The AI-projects destination is a simple editorial listing (title, summary, full description) with no need for the richer governance/discovery machinery behind the tool registry (e.g. no source-code linkage, no automated discovery).
- The "Verktøy" tile and its existing destination are already correct and are explicitly in scope only as a regression guard, not as something to change.
- Content is authored directly in the CMS by KITT editors; there is no requirement in this feature for projects to sync from an external source.
