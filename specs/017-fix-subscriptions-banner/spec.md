# Feature Specification: Genuinely interactive subscriptions banner

**Feature Branch**: `017-fix-subscriptions-banner`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Fix Altinn/kihub#144: the frontpage 'Tilgjengelige abonnementer' banner shows 'GitHub Copilot' and 'Claude Teams' as bordered elements styled like clickable buttons, but neither does anything when clicked (false affordance). There is also no path from the banner to instructions on how to request a subscription. Redesign the banner so the two tool chips are genuinely interactive (clicking reveals a short explanation of the tool) and a new, visually heavier 'Hvordan bestille tilgang?' element reveals how to request access — informational only, it must not look or behave like a purchase/order action."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee checks what a listed tool is (Priority: P1)

An employee lands on the KI Hub frontpage and sees "GitHub Copilot" and "Claude Teams" listed under "Støttede KI-abonnementer i Digdir". They look button-shaped, so the employee clicks one expecting to learn more or start a request. Today nothing happens — the element is decorative only, which reads as a broken page.

**Why this priority**: This is the reported bug (Altinn/kihub#144) and the source of the false affordance: an element that looks actionable but is not undermines trust in the whole page.

**Independent Test**: Click "GitHub Copilot" (and separately "Claude Teams") on the frontpage banner and confirm a short explanation of that tool appears in response to the click.

**Acceptance Scenarios**:

1. **Given** the frontpage subscriptions banner, **When** an employee clicks "GitHub Copilot", **Then** a short explanation of what GitHub Copilot is and what it's used for appears.
2. **Given** the frontpage subscriptions banner, **When** an employee clicks "Claude Teams", **Then** a short explanation of what Claude Teams is and what it's used for appears.
3. **Given** an explanation is showing, **When** the employee dismisses it (its close control, or the Escape key), **Then** the explanation closes.
4. **Given** the frontpage subscriptions banner, **When** an employee inspects "GitHub Copilot" and "Claude Teams" without clicking, **Then** their appearance clearly signals "click for information" rather than "click to purchase/order/install" (secondary, subdued styling).

---

### User Story 2 - Employee finds out how to request access (Priority: P1)

An employee decides they want one of the listed subscriptions and looks for a way to actually request it. Today the banner offers no such path at all — an employee who wants access has no idea who to contact or how.

**Why this priority**: Equally critical to User Story 1 — the issue explicitly calls out that today "there is no path from this banner to instructions on how to request a subscription." Fixing only the false-affordance chips without adding this path would leave the underlying need (as a BOD employee, knowing how to request access) unmet.

**Independent Test**: Click "Hvordan bestille tilgang?" on the frontpage banner and confirm the request-access instructions (who to contact, how) appear.

**Acceptance Scenarios**:

1. **Given** the frontpage subscriptions banner, **When** an employee clicks "Hvordan bestille tilgang?", **Then** they see instructions on how to request a subscription (at minimum, who to contact).
2. **Given** "Hvordan bestille tilgang?" is showing its instructions, **When** the employee dismisses it (its close control, or the Escape key), **Then** the instructions close.
3. **Given** the frontpage subscriptions banner, **When** an employee views it, **Then** "Hvordan bestille tilgang?" is visually heavier/more prominent than the "GitHub Copilot" and "Claude Teams" elements, making it clear it is the "how do I get this" action rather than another tool label.
4. **Given** an employee reads or interacts with "Hvordan bestille tilgang?", **When** they do so, **Then** nothing is purchased, ordered, or requested automatically — the action is purely informational.

---

### User Story 3 - Employee visually distinguishes "what is this" from "how do I get it" (Priority: P2)

An employee scanning the banner should immediately understand, from appearance alone, that the two tool labels answer "what is this tool" while the third element answers "how do I get it" — without having to click anything first.

**Why this priority**: Lower than User Stories 1 and 2 because it is a refinement of their visual presentation rather than new capability; the issue explicitly calls for this distinction ("must look visually distinct enough that a user immediately understands" the two different intents), so it is still in scope, but it depends on the two interactive elements existing first.

**Independent Test**: Show the banner to someone unfamiliar with it and ask them, without clicking, which element they'd use to learn about a tool versus which they'd use to find out how to get one; confirm they distinguish correctly from styling alone.

**Acceptance Scenarios**:

1. **Given** the frontpage subscriptions banner in its default (unexpanded) state, **When** an employee views it, **Then** "GitHub Copilot" and "Claude Teams" share one visual treatment (subdued/secondary) and "Hvordan bestille tilgang?" uses a distinctly heavier treatment (primary/CTA).

---

### Edge Cases

- What happens when a content editor adds a subscription/tool entry without an explanation? The tool chip must still render as a genuinely clickable, correctly styled element (no false affordance reappears), even if its expanded content is empty or minimal.
- What happens when a content editor removes all tool entries, leaving zero chips? The banner must still render sensibly with its heading/description and the "Hvordan bestille tilgang?" element, without a broken or empty-looking gap where the chips were.
- What happens when a user has JavaScript disabled? Both the tool explanations and the request-access instructions must still be reachable by click, exactly as with JavaScript enabled.
- What happens when a user navigates the banner by keyboard only? Every interactive element (each tool chip, the request-access element) must be focusable and operable via keyboard, with a visible focus state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render each tool entry in the subscriptions banner ("GitHub Copilot", "Claude Teams", and any editor-added entries) as a genuinely interactive element — clicking or activating it MUST produce a visible response, never a no-op.
- **FR-002**: Clicking/activating a tool entry MUST reveal a short explanation of what that tool is and what it is used for.
- **FR-003**: Employees MUST be able to close a shown explanation (a visible close control, and the Escape key, at minimum).
- **FR-004**: The system MUST provide a new "Hvordan bestille tilgang?" element in the subscriptions banner that, when clicked/activated, reveals instructions for requesting a subscription (at minimum, who to contact).
- **FR-005**: The "Hvordan bestille tilgang?" element MUST be informational only — activating it MUST NOT purchase, order, or submit any request on the employee's behalf.
- **FR-006**: The tool entries and the "Hvordan bestille tilgang?" element MUST be visually distinguishable from each other in their default state: the tool entries use a subdued/secondary treatment, "Hvordan bestille tilgang?" uses a visually heavier/primary treatment.
- **FR-007**: Content editors MUST be able to edit the heading, description, each tool entry's name and explanation text, and the request-access instructions, through the CMS back-office, without a code change or deployment.
- **FR-008**: All interactive elements in the banner MUST be operable via keyboard alone and MUST expose a visible focus state.
- **FR-009**: All interactive elements in the banner MUST work with JavaScript disabled in any browser that natively supports the underlying platform mechanism; in a browser that does not yet support it, the elements MAY depend on the standard library-provided polyfill loading.
- **FR-010**: The banner MUST render correctly (no broken layout, no false-affordance elements) when zero tool entries are configured.
- **FR-011**: The existing "Verktøy" and "KI Prosjekter i BOD" frontpage tiles and their destinations (fixed under Altinn/kihub#135) MUST remain unchanged by this feature.

### Key Entities *(include if feature involves data)*

- **Subscription tool entry**: One AI tool/subscription listed in the banner (e.g. "GitHub Copilot", "Claude Teams"). Key attributes: display name, short explanation text shown when activated. Editor-managed; count is not fixed.
- **Request-access instructions**: The single block of guidance shown when "Hvordan bestille tilgang?" is activated. Key attributes: a label (the element's own visible text) and body text explaining how to request access (e.g. who to contact). Editor-managed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of clicks on a tool entry in the subscriptions banner produce a visible explanation — zero no-op clicks.
- **SC-002**: An employee can find out how to request a subscription directly from the frontpage banner, in one click, where today that path does not exist at all.
- **SC-003**: Without clicking anything, a person shown the banner correctly identifies which elements are "tool information" versus "how to get access" from appearance alone.
- **SC-004**: A content editor can update a tool's explanation text or the request-access instructions and see the change live without any code change or deployment.
- **SC-005**: Every interactive element in the banner remains fully operable (reachable, activatable, with visible focus) via keyboard-only navigation and with JavaScript disabled.

## Assumptions

- "Short explanation" for each tool is a brief, editor-authored sentence or two — not a full dedicated page; this keeps the feature additive to the existing `frontpage` content model rather than introducing a new content type or route.
- The request-access instructions are similarly a short, editor-authored block (e.g. pointing to the existing KITT contact channel already referenced in the banner's description) rather than a fully modeled request/ticketing workflow — actually submitting a request is out of scope, this feature only surfaces how to do so.
- No new page routes or CMS collections are required; all new content is added to the existing `frontpage` global's `subscriptions` section, consistent with how the rest of that section is already editor-managed.
- Visual treatment reuses the site's existing design tokens rather than introducing new hardcoded colors, so the distinction in FR-006 is consistent with the rest of the portal, even though the concrete shapes (pill chips vs. an icon-led button) were revised after direct user review against the issue's own inspiration image — see research.md R5.
- "Genuinely interactive" and "reveals... appears" are satisfied by a modal dialog opened from the same page; navigating away to a separate page is not required to meet the acceptance scenarios. An earlier iteration used an inline expand/collapse instead of a modal; direct user feedback against the issue's inspiration image asked for a real modal, which better matches "genuinely clickable" (a dropdown that could visually break the page layout was explicitly called out as undesirable) — see research.md R5.
