# Feature Specification: Designsystemet alignment and Digdir profile

**Feature Branch**: `026-designsystemet-alignment`

**Created**: 2026-10-21

**Status**: Draft

**Input**: User description: "This frontend has currently a not ideal design. It does not follow Digdirs
profile, which is broadly defined here: https://design.digdir.no/digdir/farger. It also has
Designsystemet, but fails to use its components and tokens. See designsystemet.no for
documentation. We need to make sure it uses components and patterns that are defined there. We
need to focus on good accessibility, trying to use plain HTML and CSS where possible."

Decisions taken with the user before this spec (2026-10-21):

1. **Retire the kihub layer.** The custom `kihub-*` token and component layer, which is synced from
   the claude.ai "KIHub Design System" project, is removed. Designsystemet's own tokens and
   components are used directly, and syncing from the design project stops. This requires a
   constitution amendment to the Design System constraint.
2. **Use Digdir's official theme.** The theme is realigned to Digdir's official Designsystemet web
   theme. Rød, Gul and Blå are used only as graphic colours.
3. **Process.** This runs as speckit feature 026 and is implemented page by page.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keyboard and screen-reader users can use every page (Priority: P1)

A Digdir employee who uses a keyboard, a screen reader or magnification can reach, understand and
operate every employee-facing page: frontpage, registry, artifact detail, events, news, projects,
learning, contribute and sign-in. They can skip the header, follow a logical heading outline, always
see where focus is, and hear content in the right language.

**Why this priority**: Accessibility is the stated primary quality bar. Digdir is the agency that
supervises universal design (uutilsynet), so its own portal failing WCAG is the most serious defect.

**Independent Test**: Tab through each route from the address bar, and run an automated WCAG 2.2 AA
scan plus a screen-reader heading/landmark listing on each route.

**Acceptance Scenarios**:

1. **Given** any page, **When** a keyboard user presses Tab once, **Then** a visible "Hopp til
   hovedinnhold" link appears, and activating it moves focus to the start of the main content.
2. **Given** any page, **When** a screen reader lists headings, **Then** there is exactly one
   level-1 heading and no level is skipped.
3. **Given** any interactive element in the header, page body or footer, including dark surfaces,
   **When** it receives keyboard focus, **Then** a focus indicator is visible with at least 3:1
   contrast against its surroundings.
4. **Given** a page or passage written in English, **When** it is read aloud, **Then** it is either
   translated to Norwegian or marked as English, so it is pronounced correctly.
5. **Given** a link whose visible text includes a decorative arrow, **When** it is read aloud,
   **Then** the arrow is not announced.

---

### User Story 2 - The portal looks and feels like Digdir (Priority: P1)

An employee opening KI Hub recognises it as a Digdir service. The colours, type, logo placement and
design element follow Digdir's visual profile, and the components look and behave like other
Designsystemet-based Digdir services.

**Why this priority**: This is the other half of the request. The portal currently uses a near-black
neutral that is not Digdir's, lacks Blå, and uses graphic colours as text backgrounds.

**Independent Test**: Compare the frontpage and one content page against the Digdir colour page and
Designsystemet's component documentation. Colour-pick the text, surfaces and accents.

**Acceptance Scenarios**:

1. **Given** any page, **When** text and neutral UI colours are inspected, **Then** they derive from
   Digdir Blåsvart `#1E2B3C`, and the interactive accent derives from `#0062BA`.
2. **Given** any use of Rød `#F45F63`, Gul `#E5AA20` or Blå `#1E98F5`, **When** it is inspected,
   **Then** it is a graphic, such as a shape, illustration, decorative bar or the design element.
   It is never a text colour and never the background behind text.
3. **Given** the frontpage navigation tiles, **When** they render, **Then** their text sits on a
   surface that meets AA contrast. The Digdir graphic colours appear only as graphic accents.
   Tiles editors saved with the old variants (`tinted`/`accent`) still render, and each variant
   stays visually distinct.
4. **Given** the header, **When** it renders, **Then** the logo sits top-left. **Given** the
   frontpage hero, **When** it renders, **Then** the Digdir design element sits at the right edge
   and never covers content.
5. **Given** any page, **When** text is inspected, **Then** it is set in Inter, using
   Designsystemet's typography scale. No uppercase, letter-spaced "eyebrow" labels remain.

---

### User Story 3 - Familiar, consistent components across the portal (Priority: P2)

An employee meets the same button, link, card, tag, alert, disclosure, table and pagination
patterns on every page. These are the standard Designsystemet patterns, so links look like links,
buttons look like buttons, and nothing looks clickable that is not.

**Why this priority**: Consistency lowers cognitive load and is what "use Designsystemet's
components" means for the user. It builds on the theme from US2.

**Independent Test**: Visit every route and confirm that each control type renders as the
corresponding Designsystemet component. Hover over static cards and confirm that nothing moves or
changes colour.

**Acceptance Scenarios**:

1. **Given** any call-to-action that navigates, **When** it is styled as a button, **Then** it is a
   real link with Designsystemet button styling. **Given** any control that performs an action,
   **When** it renders, **Then** it is a real button.
2. **Given** any inline or standalone text link, **When** it is at rest, **Then** it is
   identifiable as a link without relying on colour alone (for example, it is underlined).
3. **Given** a card that is not a link, **When** it is hovered, **Then** it shows no hover effect.
   **Given** a card that is a link, **When** it is activated, **Then** it has one tab stop and an
   accessible name taken from its heading.
4. **Given** news pagination, **When** it renders, **Then** it uses the Designsystemet pagination
   pattern: the current page is announced, and unavailable previous/next controls are absent or
   correctly disabled.
5. **Given** FAQs, the learning sidebar and other disclosures, **When** they are operated, **Then**
   they use the native disclosure pattern with Designsystemet styling and work with JavaScript off.
6. **Given** notes, tips and status messages, **When** they render, **Then** they use the
   Designsystemet alert pattern with the right severity. **Given** tabular content, **When** it
   renders, **Then** it uses the Designsystemet table pattern.

---

### User Story 4 - Filters are real, operable form controls (Priority: P2)

An employee filtering events (by type or period) or the registry (by type or tag) uses controls that
are announced correctly. Each group has a name, each option has a selected or unselected state, and
the selection is visible without relying on colour.

**Why this priority**: These are the most misused ARIA patterns in the audit (`aria-pressed` on
links, `<p>` used as group labels, and colour-only state).

**Independent Test**: Operate both filter sets with keyboard only and with a screen reader, and
confirm the announced role, group name and state for each option.

**Acceptance Scenarios**:

1. **Given** a filter group, **When** a screen reader enters it, **Then** the group's name is
   announced, such as "Type arrangement".
2. **Given** a filter option, **When** it is focused, **Then** its role and selected state are
   announced correctly.
3. **Given** a selected option, **When** it is viewed in greyscale, **Then** it is still
   distinguishable from unselected options.
4. **Given** JavaScript is unavailable, **When** a filter is applied, **Then** filtering still works,
   and the URL still reflects the filter so it can be shared.

---

### User Story 5 - Content adapts to the user's settings (Priority: P3)

An employee who has raised the browser's default font size, zoomed to 400%, uses a 320-CSS-pixel
viewport, or prefers reduced motion gets a page that scales and reflows without loss of content or
horizontal scrolling.

**Why this priority**: These are WCAG 1.4.4, 1.4.10 and 2.3.3 requirements. Today they are broken
because all type is fixed in px. The fix comes largely for free once Designsystemet tokens are used.

**Independent Test**: Set the browser default font to 24px, then view each route at 320px width and
at 400% zoom.

**Acceptance Scenarios**:

1. **Given** the browser default font size is raised from 16px to 24px, **When** any page loads,
   **Then** body text and headings scale up proportionally.
2. **Given** a 320px-wide viewport, **When** any page is viewed, **Then** no horizontal scrolling is
   needed except inside data tables and code blocks, which scroll within their own labelled region.
3. **Given** the user prefers reduced motion, **When** any page is used, **Then** no non-essential
   animation plays.

---

### User Story 6 - Maintainers work with one design system (Priority: P3)

A developer or designer changing the UI works against Designsystemet's documented components and
tokens, plus a small layout layer. There is no parallel KI Hub component library to keep in sync.

**Why this priority**: This is what keeps US2 and US3 true over time. It also removes the claude.ai
design-project sync, which nobody else can follow.

**Independent Test**: Search the employee-facing source for custom component classes that duplicate
Designsystemet, for inline style attributes, and for hard-coded colours, font sizes and spacing.

**Acceptance Scenarios**:

1. **Given** the employee-facing source, **When** it is searched, **Then** no custom class
   re-implements a component that Designsystemet provides: button, link, heading, paragraph, card,
   tag, input, alert, details, table or pagination.
2. **Given** the app's stylesheets, **When** they are searched, **Then** all colours, font sizes,
   radii, shadows and spacing come from Designsystemet tokens. Remaining custom CSS covers only page
   layout and the few components that have no Designsystemet equivalent: header, footer, event
   calendar, timeline, design-element placement and code highlighting.
3. **Given** the constitution, **When** it is read, **Then** its Design System constraint describes
   the new model: Designsystemet with Digdir's theme and no kihub layer.

### Edge Cases

- **Saved CMS content.** Editors have saved content that relies on the old visuals, such as tile
  variants `tinted`/`accent`, hero `accentWord`, and subscriptions chips. All of it must still
  render sensibly without a migration or editor action.
- **Rich text from the CMS.** Learning pages, news articles, projects and events contain headings,
  lists, tables, code blocks, images and video. These must pick up Designsystemet text styling and
  keep a correct heading outline under the page's h1.
- **Unchanged UI-text lengths.** Changing UI text (translation, removing arrows) must not break
  layout at 320px.
- **Graphic colours as event-type indicators.** If the Digdir graphic colours mark event types, the
  type must also be conveyed in text, never by colour alone. This includes the mobile calendar
  dots.
- **Dialogs over dark surfaces.** The subscriptions dialogs and other dialogs must stay legible
  wherever they are rendered. The 017 white-on-white issue must not regress.
- **Missing images.** An empty state, a missing image or a missing hero image keeps the current
  placeholder behaviour, restyled with tokens.
- **Admin back-office.** `/cms` is unaffected and keeps its own look.

## Requirements *(mandatory)*

### Functional Requirements

**Theme and visual profile**

- **FR-001**: The portal's theme MUST be Digdir's official Designsystemet web theme:
  - accent `#0062BA`;
  - brand colours Rød `#F45F63`, Gul `#E5AA20` and Blå `#1E98F5`;
  - neutral Blåsvart `#1E2B3C`;
  - only those overrides that are needed for a documented reason.
- **FR-002**: Rød, Gul and Blå MUST be used only as graphic colours. They MUST NOT be a text colour
  or the background behind text or icons that carry meaning.
  *Amended 2026-10-21 (follow-up, constitution v4.1.0):* the light generated tints of Rød, Gul
  and Blå (`background-tinted` / `surface-tinted` / `surface-hover`) MAY be surfaces behind
  Blåsvart text, as on digdir.no. The full-strength colours stay graphics-only.
- **FR-003**: All text MUST use Inter and Designsystemet's typography scale. Uppercase,
  letter-spaced labels MUST NOT be used.
- **FR-004**: The header MUST place the logo top-left. The frontpage hero MUST place the Digdir
  design element at the right edge, decorative, so it never covers content. Below the small-screen
  breakpoint it MAY be hidden.
- **FR-005**: The frontpage navigation tiles MUST be redesigned so their text meets AA contrast and
  the Digdir graphic colours appear only as graphic accents. The existing `tinted`/`accent` variant
  values MUST still render, and the two variants MUST stay visually distinct.

**Components and patterns**

- **FR-006**: Every control MUST use the Designsystemet component or pattern for its type, where
  one exists:
  - buttons and button-styled links;
  - text links;
  - headings and body text;
  - cards;
  - tags;
  - alerts;
  - native disclosures (details);
  - tables;
  - pagination;
  - search;
  - fieldsets, checkboxes, radios and chips;
  - dialogs;
  - skip link;
  - dividers.
- **FR-007**: Where no JavaScript behaviour is needed, components MUST be rendered as plain HTML
  elements with Designsystemet's CSS. The portal MUST NOT add new client-side components except for
  a real interactive widget that cannot be built natively.
- **FR-008**: Components that Designsystemet does not provide MUST be built from Designsystemet
  tokens and primitives: header, footer, event month calendar, events timeline, code-block
  highlighting and design-element placement.
- **FR-009**: Cards that are links MUST expose one tab stop, take their accessible name from their
  heading, and show a hover or focus state. Cards that are not links MUST NOT show hover
  affordances.
- **FR-010**: Links MUST be identifiable without relying on colour alone. Decorative arrows or icons
  in link and button text MUST be hidden from assistive technology.

**Accessibility (WCAG 2.2 AA)**

- **FR-011**: Every page MUST start with a skip link labelled "Hopp til hovedinnhold". It MUST be
  the first focusable element and move focus to the single main-content landmark.
- **FR-012**: Every page MUST have exactly one level-1 heading and no skipped heading levels. This
  includes headings inside reusable panels, dialogs and CMS rich text.
- **FR-013**: Every focusable element MUST have a visible focus indicator with at least 3:1
  contrast on whatever surface it sits on, including dark surfaces.
- **FR-014**: Filter controls on events and the registry MUST be grouped and named as real form
  controls, and MUST announce their selected state. They MUST NOT use `aria-pressed` on links or
  rely on colour alone for state. Filtering MUST keep working without JavaScript and MUST stay
  reflected in the URL.
- **FR-015**: Text and spacing MUST scale with the user's browser font-size setting. Content MUST
  reflow at 320 CSS px without horizontal scrolling, except within labelled scroll regions for
  tables and code.
- **FR-016**: User-interface text on the registry, artifact detail, sign-in and related components
  MUST be in Norwegian. Content authored in English, such as artifact READMEs, MUST be marked with
  its language where it is known.
- **FR-017**: The events month calendar MUST have a caption naming the month. Each entry MUST
  include its date and event type in its accessible name, and event type MUST NOT be conveyed by
  colour alone.
- **FR-018**: Non-essential motion MUST respect the reduced-motion preference.
- **FR-019**: The search field MUST have a visible label.

**Maintainability and governance**

- **FR-020**: The custom kihub token and component layer MUST be removed. The app's own stylesheet
  MUST use only Designsystemet tokens for colour, typography, spacing, radius, border and shadow.
- **FR-021**: Employee-facing components MUST NOT use inline style attributes for visual styling.
  Inline styles are allowed only for genuinely dynamic values, such as an image focal point.
- **FR-022**: The constitution's Design System constraint MUST be amended to describe the new
  model, and the amendment MUST be versioned.
- **FR-023**: No CMS schema or content-model change and no database migration is introduced.
  Existing editor content MUST keep rendering.
- **FR-024**: The Payload admin (`/cms`) MUST be unaffected.

### Key Entities

No data entities change. The feature touches presentation only:

- **Theme configuration**: the Designsystemet theme definition, meaning its colours, typography and
  radius.
- **Page templates**: the 14 employee-facing routes.
- **Shared components**: about 30 components.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An automated WCAG 2.2 AA scan of every employee-facing route reports zero violations.
  A manual keyboard and screen-reader pass finds no blocking issue on any route.
- **SC-002**: 100% of routes have a working skip link, exactly one h1 and no skipped heading levels.
- **SC-003**: With the browser default font raised to 24px, rendered body text is at least 1.4 times
  its size at 16px, on every route.
- **SC-004**: At 320 CSS px width, no route requires horizontal page scrolling.
- **SC-005**: Zero uses of Rød, Gul or Blå as text colour or text background. Every text/background
  pair meets 4.5:1, or 3:1 for large text.
- **SC-006**: Zero custom classes in the employee-facing source duplicate a Designsystemet
  component. Zero inline visual styles remain, apart from documented dynamic values.
- **SC-007**: The app's own employee-facing CSS shrinks by at least 50% from today's ~2,070 lines (portal, kihub layer, bridge and fonts),
  and contains zero hard-coded colours.

  **Outcome (2026-10-21): accepted as partially met.** The CSS went from ~2,070 to 1,330 lines
  (−36%) and has zero hard-coded colours. The user accepted the 36% cut. Everything left is
  layout or the custom components Designsystemet lacks, all on `--ds-*` tokens, written one
  declaration per line. Reaching 50% would have meant compressing formatting rather than removing
  duplication.
- **SC-008**: Every frontpage feature still works and still shows editor-saved content without
  editor action: hero, tiles, subscriptions dialogs, contribute banner, events and news. The same
  holds for every other route.

## Assumptions

- **English text is translated.** English UI text on the registry, artifact detail and sign-in
  pages is translated to Norwegian rather than marked `lang="en"`, because the portal is Norwegian.
  User-generated English content, such as READMEs and manifest descriptions, keeps its text.
- **Light mode only.** Designsystemet supports dark mode, but enabling it is out of scope. The theme
  is built so it could be turned on later.
- **No Digdir header/footer pattern exists.** Neither Designsystemet nor Digdir publishes one (only
  open GitHub discussions #1672/#1673). So the header and footer stay custom, built from
  Designsystemet primitives. The footer is no longer required to be a dark surface. If it stays
  dark, it uses Designsystemet's colour roles so that contrast and focus are guaranteed.
- **Kitt logo stays.** The header keeps the Kitt logo with the "KI HUB" wordmark, since it is the
  team's own sub-brand. Digdir's logo rules for placement and clear space are applied to it.
- **Tile redesign is a design choice.** The frontpage tile redesign (FR-005) is left to the plan.
  The expected direction is a tinted or neutral Designsystemet card carrying a graphic-colour shape
  or bar, in line with the Digdir design element.
- **Pages ship one at a time.** "Page by page" means the work is split into independently shippable
  slices: theme plus shared chrome first, then each route group. Pages not yet converted keep
  working on the interim styles until their slice lands.
- **Specs record history.** The 011–025 specs remain as historical records and are not rewritten.
- **The current Designsystemet version is enough.** Designsystemet 1.18 (already installed) provides
  everything required. Upgrading is not part of this feature unless the plan finds a blocking gap.
