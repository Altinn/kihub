# Feature Specification: Frontpage hero design element

**Feature Branch**: `024-hero-design-element`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Replace the frontpage hero illustration (right side of the homepage hero — currently a blue line drawing of three people at a desk with a laptop/monitor) with Digdir's design element from 'Designelementer (For skjerm).pdf': the first element on the sheet — a coral/red circle overlapped by a rotated dark-navy square. Image swap only: no layout, copy, CMS or schema changes. Keep it short."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee sees the Digdir design element in the hero (Priority: P1)

An employee opening the KI Hub frontpage sees, to the right of the hero heading, Digdir's own
design element (coral circle + rotated navy square) instead of the generic illustration of three
people at a desk, so the portal looks like part of Digdir's visual identity.

**Why this priority**: It is the whole feature.

**Independent Test**: Open `/` and look at the hero's right-hand art slot.

**Acceptance Scenarios**:

1. **Given** the frontpage, **When** it loads, **Then** the hero art slot shows the coral-circle +
   navy-square element and the three-people illustration appears nowhere on the page.
2. **Given** a desktop viewport, **When** the frontpage loads, **Then** the element is shown with
   its proportions intact and unclipped. (On narrow viewports the art slot stays hidden, as today.)
3. **Given** a screen-reader user, **When** they move through the hero, **Then** the element is
   not announced (it stays decorative, like the old illustration).

### Edge Cases

- Hero background color: the element sits on a transparent background, so it never shows as a
  white box on the hero's tinted surface.
- High-density (retina) screens: the edges stay sharp at any size.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontpage hero art slot MUST show the first design element from Digdir's
  "Designelementer (For skjerm)" sheet (coral circle overlapped by a rotated dark-navy square),
  with the colors and geometry of the source.
- **FR-002**: The element MUST be decorative (hidden from assistive technology), as today.
- **FR-003**: The element MUST have a transparent background and stay sharp at any display size.
- **FR-004**: The hero's text, CTAs, layout and editor-managed content MUST be unchanged.
- **FR-005**: The old three-people illustration MUST be removed from the codebase once it is no
  longer referenced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of frontpage loads show the new element in the hero; 0 show the old illustration.
- **SC-002**: The hero text block's content and width are unchanged from before the swap on desktop
  and mobile widths.
- **SC-003**: The new image file is smaller than the old 334 KB illustration.

## Assumptions

- "The first one" in the PDF (the red circle with the navy square, top-left) is the element wanted.
- The image is a fixed brand asset, not editor-managed: no CMS field is added (matches today).
- Displayed at the same maximum width as the old illustration (420px).
