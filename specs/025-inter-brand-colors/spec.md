# Feature Specification: Inter everywhere + Digdir pink and yellow

**Feature Branch**: `025-inter-brand-colors`

**Created**: 2026-10-19

**Status**: Draft

**Input**: User description: "Change the font for the whole site to Inter. We have the blue colors
and black; add the pink and yellow from the Digdir design-element PDF as core colors, and change
the color of the cards on the homepage to match. Take the colors from
https://profilveileder.digdir.no/visuell-profil/farger/109."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One typeface across the portal (Priority: P1)

An employee browsing KI Hub sees one typeface, Inter, in headings, lead text, card titles and body
text, instead of a serif for headings and reading text.

**Why this priority**: It is a site-wide visual change and the larger half of the request.

**Independent Test**: Open `/`, `/news`, `/laering` and `/bidra` and check the computed font of
headings and body text.

**Acceptance Scenarios**:

1. **Given** any portal page, **When** it loads, **Then** headings, lead text and body text are
   set in Inter.
2. **Given** any portal page, **When** it loads, **Then** no request is made for a serif webfont.

---

### User Story 2 - Homepage cards in Digdir pink and yellow (Priority: P1)

An employee opening the frontpage sees the two navigation cards ("Verktøy" and "KI Prosjekter i
Digdir") in Digdir's graphic colors pink and yellow, matching the hero's design element, with
readable text.

**Why this priority**: It is the visible half of making pink and yellow core colors.

**Independent Test**: Open `/` and look at the two cards below the hero.

**Acceptance Scenarios**:

1. **Given** the frontpage, **When** it loads, **Then** the "Verktøy" card is Digdir pink
   `#F45F63` and the "KI Prosjekter i Digdir" card is Digdir yellow `#E5AA20`.
2. **Given** either card, **When** it is read, **Then** its title, tag and arrow meet WCAG 2.1 AA
   contrast against the card color.
3. **Given** a keyboard user, **When** they tab to a card, **Then** the focus ring is visible on
   both colors.

### Edge Cases

- An editor has already saved the frontpage global with `tinted`/`accent` card variants. The new
  colors still apply, with no editor action needed.
- Pink and yellow fail contrast with white text (3.2:1 and 2.1:1), so text on them must be dark.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every portal surface that today uses the display (serif) typeface MUST use Inter.
- **FR-002**: The serif webfont MUST no longer be loaded or shipped.
- **FR-003**: Digdir pink (`#F45F63`) and yellow (`#E5AA20`) MUST become named core colors in the
  KI Hub theme, next to the existing blue accent and neutral, so any component can use them.
- **FR-004**: The two homepage navigation cards MUST use pink (first card) and yellow (second
  card), with dark text, tag and arrow that meet WCAG 2.1 AA.
- **FR-005**: Card destinations, copy and the editor-managed card content MUST be unchanged. The
  CMS variant choices MUST be relabelled to describe the new colors.
- **FR-006**: The other homepage blocks (hero, subscriptions card, contribute banner, news and
  events) keep their current colors.
- **FR-007** *(review revision)*: Homepage cards are flat Digdir colors. They have no animated
  light sweep, no hover color shift and no arrow motion. This applies to the two tiles and the
  "Del KI-verktøyene dere lager" banner.
- **FR-008** *(review revision)*: Titles inside homepage cards (the two tiles, the subscriptions
  card and the contribute banner) read as plain text: 24px, regular weight. The hero heading keeps
  the semibold display treatment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 0 portal pages render text in a serif face.
- **SC-002**: The text-to-background contrast on both cards is ≥ 4.5:1.
- **SC-003**: Production shows the new card colors on the first deploy, with 0 editor actions.

## Assumptions

- "Pink" is Digdir's graphic color «Rød» `#F45F63` and "yellow" is «Gul» `#E5AA20`, from the
  Digdir profile guide. These are the guide's exact values. The PDF's pink converts to `#F05F63`;
  the guide value wins, and the hero SVG from 024 is aligned to it.
- The card order follows the design-element sheet: pink first, then yellow.
- The Payload admin keeps its own typography (constitution exemption).
- Heading weights may be raised to suit a sans-serif. That is a visual tuning inside FR-001.
