# Feature Specification: Agentic-AI guideline deck («Retningslinje for agentisk KI i Digdir»)

**Feature Branch**: `029-agentic-guideline-deck`

**Created**: 2026-11-19

**Status**: Draft

**Input**: User description: "Issue Altinn/kihub#183 — Roberto Carrera (project lead) delivered a finished,
static, self-contained 104-slide HTML deck, «Retningslinje for agentisk KI i Digdir» (v2.2), classified
INTERN. Make it available inside KI Hub: a card on the frontpage that opens a regular KI Hub page which
shows the deck, only to signed-in employees. Keep the deck exactly as delivered."

## Background

The deck is a finished presentation: 104 slides in Norwegian (main part 1–69, «Vedlegg» 70–104) with its
own left/right and keyboard navigation, small animations, and slide addresses of the form `#N` (slide N)
and `#N.b` (slide N at build step b). It is a self-contained bundle — it loads nothing from the internet,
sets no cookies and has no analytics. Its owner has classified it **INTERN**: it may only be reachable
behind access control, never on the open web, and nothing may be published without the project lead's
confirmation.

Employees should be able to read it inside KI Hub like any other guidance, without downloading anything.
The deck is **not** rewritten as editor-managed content: it keeps its own player, so animations,
navigation and slide addresses behave exactly as its author designed them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the guideline inside KI Hub (Priority: P1)

A signed-in employee sees a card on the frontpage titled «Retningslinje for agentisk KI i Digdir»,
clicks it, lands on a regular KI Hub page (with the usual header, footer and menu), and sees the deck
right there with a short introduction. They click through the slides with the deck's own controls
(arrow keys, click, left/right) from the first slide to the last.

**Why this priority**: This is the whole point of the issue — making the guideline readable in KI Hub.
Everything else supports or protects this journey.

**Independent Test**: Sign in, open the frontpage, click the card, and page through the deck from slide 1
to slide 104. Delivers value even if no other story is built.

**Acceptance Scenarios**:

1. **Given** a signed-in employee on the frontpage, **When** they click the guideline card, **Then** they
   arrive on the guideline page and the deck's first slide is visible without any further click.
2. **Given** the guideline page, **When** the employee clicks the deck and presses the right arrow (or
   clicks to advance), **Then** the deck advances step by step exactly as in the delivered bundle, and the
   left arrow, Home and End keys also work.
3. **Given** the guideline page, **When** the employee uses the browser's back button after moving between
   slides, **Then** they return to the previous slide (the deck's own behaviour is preserved).
4. **Given** the guideline page, **When** the employee reads the page, **Then** a short Norwegian
   introduction explains what the deck is, how to move through it, and that full screen gives the best
   reading experience.

---

### User Story 2 - Only employees can reach the deck (Priority: P1)

The deck is INTERN. A person who is not signed in as a Digdir employee — including guests, accounts from
other organisations, and anonymous visitors on the internet — cannot see the deck, any of its files, or
any part of its content, and cannot learn anything about it from the response they get.

**Why this priority**: The owner's explicit condition for publishing. Without it the feature must not
ship, so it is as important as Story 1.

**Independent Test**: Request the deck's page and each of its files without a session, with a guest
session, and with an other-tenant session; every request is refused or sent to sign-in and returns no deck
content. Then repeat as a signed-in employee and confirm everything loads.

**Acceptance Scenarios**:

1. **Given** no session, **When** someone requests the guideline page, the deck's entry file, or any of its
   style, script, image or font files directly by address, **Then** they are sent to sign-in and receive no
   deck content.
2. **Given** a guest or other-organisation account, **When** they try the same, **Then** access is
   denied exactly as for every other employee-only page.
3. **Given** a signed-in employee, **When** they request a file that is not part of the deck (for example
   the application's configuration, source code, or a path that tries to climb out of the deck's folder),
   **Then** they receive a plain «not found» and nothing outside the deck is ever returned.
4. **Given** a signed-in employee has viewed the deck, **When** the session ends and someone on the same
   computer presses back or reopens the deck address, **Then** the deck is not served from a shared or
   persistent cache without a valid session.

---

### User Story 3 - Full screen, new tab and slide links (Priority: P2)

An employee wants the deck bigger than the page allows, or wants to send a colleague a link to one slide
(for example the emergency-stop scene or the appendix). They press «Fullskjerm», which shows the deck
over the whole screen, or use «Åpne i ny fane», and slide links of the form «…/retningslinje#53» open the
guideline page already on that slide.

**Why this priority**: The deck is a 16:9 picture that scales to its window, so a large view and
shareable slide links materially improve reading and were explicitly requested by the owner. The core
journey still works without them.

**Independent Test**: Press «Fullskjerm», confirm the deck fills the screen and Esc returns to the page on
the same slide; open the guideline page with a slide reference and confirm the right slide shows; use
«Åpne i ny fane» with a slide reference and confirm the same.

**Acceptance Scenarios**:

1. **Given** the guideline page, **When** the employee presses «Fullskjerm», **Then** the deck fills the
   screen on the same slide (browser full screen, or an overlay covering the page where full screen is
   unavailable), and pressing Esc or the close button returns to the page on that slide with focus back on
   the «Fullskjerm» button.
2. **Given** a link to the guideline page ending in a slide reference (`#53`, `#70`, `#1`, `#104`), **When**
   a signed-in employee opens it, **Then** the embedded deck shows that slide (53 = the emergency-stop
   scene, 70 = the start of the appendix).
3. **Given** a slide reference with a build step (`#70.2`), **When** it is opened, **Then** the deck shows
   that slide at that step.
4. **Given** the guideline page was opened with a slide reference, **When** the employee activates
   «Åpne i ny fane», **Then** the deck opens alone in a new tab on the same slide, the original tab stays on
   the page, and the new tab cannot control or inspect the originating page.
5. **Given** the full-screen view is open, **When** the employee uses the deck's own controls (arrows,
   Home/End), **Then** they work exactly as on the page, and Esc pressed inside the deck also closes the
   overlay.

---

### User Story 4 - Update the deck without touching the page (Priority: P3)

When the project lead delivers a new version of the deck (v2.3, …), an operator uploads the new bundle to
the private store, replacing the old files. The page, the card, the access rules and all existing slide
links keep working with no code change and no application release.

**Why this priority**: It keeps the long-term cost of this feature low, but it is a maintenance concern
rather than an employee-facing journey.

**Independent Test**: Swap the stored bundle for a copy with a changed slide title and confirm the new
title shows with the page, card and protection unchanged, without redeploying the application.

**Acceptance Scenarios**:

1. **Given** a new bundle with the same entry file name and relative layout, **When** it replaces the old
   one, **Then** no change to the page, card or access rules is needed.
2. **Given** the bundle's own documentation says «publish nothing without the project lead's
   confirmation», **When** a new version is added, **Then** the repository documents who confirms and that
   the confirmation is recorded before release.

---

### Edge Cases

- **Deck files missing or failing to load** (bad deploy): the guideline page still renders its introduction
  and shows a clear Norwegian message plus a contact route instead of an empty or broken frame.
- **JavaScript disabled or blocked**: the deck cannot run; the page says so in Norwegian rather than
  leaving a blank frame. (The rest of the page does not depend on the deck.)
- **Small screens / phones**: the deck scales as one 16:9 picture, so text is small on narrow screens. The
  page puts «Fullskjerm» prominently and tells the reader to use a larger window; the page itself
  still reflows at 320 px width.
- **Browser zoom**: the deck's presentation mode does not enlarge text when the browser zooms (a known
  limitation of the delivered bundle). The page tells readers to use full screen and a larger window; this
  limitation is recorded rather than worked around.
- **Slide reference out of range or malformed** (`#0`, `#999`, `#abc`): the deck's own handling applies; the
  page does not break and the first slide (or the nearest valid slide) shows.
- **Deep link followed while signed out**: the visitor is sent to sign-in and, after signing in, ends up on
  the page they asked for (including the slide reference) wherever the existing sign-in flow already
  preserves the destination; if it does not, they land on the frontpage and the limitation is noted.
- **Direct request for the deck's folder without the entry file name**: it returns «not found» (it must
  not reveal a file listing); the card and the new-tab link always address the entry file explicitly.
- **Deck frame embedded elsewhere**: the deck can only be framed by KI Hub itself, as with every other page.
- **Editors have already customised the frontpage**: the card must still reach employees after release
  (see FR-004 and the release note in Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: KI Hub MUST provide a guideline page, available only to signed-in employees, that uses the
  normal employee-app shell (header, footer, menu, skip link, one level-1 heading «Retningslinje for
  agentisk KI i Digdir») and shows the deck embedded in a 16:9 area with the deck's own controls usable.
- **FR-002**: The guideline page MUST include a short Norwegian introduction covering what the deck is,
  how to navigate it (arrow keys, click, Home/End), that full screen gives the best reading experience,
  and the known limitation that browser zoom does not enlarge the deck text.
- **FR-003**: The guideline page MUST offer a «Fullskjerm» button that shows the embedded deck over the
  whole screen and lets the reader leave with Esc or a visible close button, without reloading the deck or
  losing the current slide. It uses the browser's own full screen where that works and falls back to an
  overlay on the page where it does not (for example iPhone Safari, or an embedded browser that never
  answers). The page MUST also offer a secondary «Åpne i ny fane» link that opens the deck alone in a new
  tab, in a way that prevents the new tab from accessing the originating page.
- **FR-004**: The frontpage MUST show a card titled «Retningslinje for agentisk KI i Digdir» that links to
  the guideline page, in the same visual language as the other frontpage cards. After release the card
  MUST be visible to employees without an editor having to re-save the frontpage; editors MAY later
  reword or reorder it in the back-office where the existing frontpage content model allows.
- **FR-005**: The deck's entry file and every one of its supporting files MUST be served only to
  signed-in employees. Any request without an established employee session MUST be sent to sign-in and
  MUST NOT return deck content, file existence, or size information beyond what the sign-in redirect
  reveals.
- **FR-006**: Only files that belong to the deck MAY ever be served from the deck's location. Requests that
  try to leave it (parent-folder segments, encoded variants, absolute paths), request unknown file types,
  or request folders MUST return a plain «not found».
- **FR-007**: The deck MUST be served exactly as delivered — unmodified, with its own navigation,
  animations, keyboard handling, back-button behaviour and slide addresses (`#N`, `#N.b`) intact — and MUST
  keep working when served from a sub-address of KI Hub (all of its internal references are relative).
- **FR-008**: Opening the guideline page with a slide reference (`/retningslinje#N` or `#N.b`) MUST show
  that slide in the embedded deck, and the «Åpne i ny fane» link MUST open the deck on that same slide.
- **FR-009**: The deck's responses MUST NOT be stored by shared caches or kept for reuse without a valid
  session, and MUST NOT be indexable by search engines.
- **FR-010**: Viewing the deck MUST NOT cause the employee's browser to contact any external host (fonts,
  scripts, analytics or otherwise), and MUST NOT set cookies.
- **FR-011**: The guideline page MUST meet the same accessibility bar as other employee pages: the embedded
  frame has a descriptive title; every control on the page is keyboard-reachable with visible focus; one
  main landmark; no skipped heading levels; the page reflows at 320 px. The deck's own internal markup is
  treated as a delivered third-party bundle and is outside this requirement (see Assumptions).
- **FR-012**: If the deck cannot be shown (files missing, scripts blocked), the page MUST degrade
  gracefully with a Norwegian explanation and the «Åpne i ny fane» link, never an empty frame.
- **FR-013**: Replacing the deck with a newer export that keeps the same entry file name and relative
  layout MUST require no change to the page, the card or the access rules and no application release;
  the repository MUST document how to publish a new version and that release needs the project lead's
  confirmation.
- **FR-014**: The feature MUST work identically in the production deployment and the local development
  setup (deck files available in each, from the private store in production), verified before release.
- **FR-015**: No deck file may be stored in the source repository or in the published container image, and
  the automated tests MUST NOT depend on the real deck.
- **FR-016**: The page and the card MUST stay hidden (and the deck's address return «not found», even for
  employees) until an operator explicitly switches the feature on, so merging code is not releasing.

### Key Entities *(include if feature involves data)*

- **Guideline deck**: a versioned, read-only bundle of static files (entry file, styles, script, font,
  illustration) classified INTERN. Has a version label (currently v2.2), a stable entry address, 104
  slides in two parts (main 1–69, appendix 70–104) and optional slide addresses. Owned by the project lead;
  not editable in KI Hub.
- **Guideline page**: the KI Hub page that frames the deck with an introduction and the full-screen link.
  Holds no data of its own beyond fixed Norwegian text.
- **Frontpage card**: a pointer on the frontpage to the guideline page (title, short descriptor, link).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in employee reaches the first slide of the deck in **one click** from the
  frontpage (card → page with deck visible), and can reach slide 104 using only the deck's own forward
  controls.
- **SC-002**: **100%** of sampled requests for the guideline page and for each distinct deck file type
  (entry, style, script, font, illustration) made without an employee session — including guest and
  other-organisation sessions — are refused or redirected to sign-in with no deck content returned; **0**
  requests for paths outside the deck return anything but «not found».
- **SC-003**: Slide links `#1`, `#53`, `#70`, `#70.2` and `#104` each open on the correct slide, both on
  the guideline page and in the full-screen tab.
- **SC-004**: While viewing the deck from first to last slide, the browser makes **zero** requests to
  hosts other than KI Hub and stores **zero** cookies from the deck.
- **SC-005**: The guideline page passes the automated WCAG 2.2 AA check with **no violations**, plus a
  keyboard-only pass (reach card, page controls, enter and leave the deck frame) before release.
- **SC-006**: Replacing the deck with a modified copy (one changed slide title) is visible to employees
  with **no change** to anything but the deck's stored files and **no application release**.
- **SC-009**: **Zero** deck files appear in the repository history, the working tree or a build of the
  container image (checked by scanning the built image's file list for the deck's file names).
- **SC-007**: The existing frontpage, navigation and other sections behave unchanged: the full automated
  test suite passes and the frontpage layout shows no regressions on desktop and phone widths.
- **SC-008**: The project lead has confirmed the release in writing on the issue **before** the feature is
  released to employees.

## Assumptions

- **Scope of source**: the delivered `agentisk-ki-retningslinje-dist-v2.2` bundle (16 files, about 1.2 MB
  uncompressed, one font file under SIL OFL) is used unmodified. Converting slides to editor-managed
  content, adding search inside the deck, editing the deck, and analytics are out of scope.
- **Hosting model** (revised during planning): the KI Hub source repository and its container image are
  **public**, so an INTERN deck MUST NOT be committed to the repository or baked into the image. The deck's
  files live in a private, access-controlled store that only the application can read, and are served to
  signed-in employees through the application. Publishing a new version is therefore an upload to that
  store, not a code release. A tiny synthetic stand-in deck is used for automated tests.
- **Leak already present (outside this feature)**: the issue's zip attachment sits on a public GitHub
  issue and could be downloaded without signing in. The owner should remove it and share the bundle
  through an internal channel; this feature cannot undo that.
- **Access model**: «signed-in employee» means exactly the existing employee gate (home-organisation
  tenant, no guests). No new role is introduced; every employee, including Readers, may view the deck.
- **Design System**: the page around the deck is built on the existing Designsystemet foundation. The deck
  itself is a frozen third-party bundle with its own design-system copy and the same Inter typeface; it is
  not restyled. Its internal accessibility (for example text not scaling with browser zoom) is a recorded
  limitation, not a requirement of this feature. The plan's Constitution Check MUST record this and the
  fact that the deck is a static bundle rather than Payload-authored content (Principle II) as a
  documented exception, and decide whether a constitution note is needed.
- **Frontpage card placement**: the issue's two UX mockups have not been reviewed yet. Default: the card
  sits with the other shortcuts on the frontpage in the existing card style. The final position follows
  the mockups once checked; this is cosmetic and does not change any requirement above.
- **Menu**: no top-menu entry is added by this feature. Editors can add one in Site Chrome if wanted.
- **Release note**: saved frontpage and Site Chrome content in the back-office is authoritative over code
  defaults, so the card (FR-004) must not rely on defaults alone in environments where the frontpage
  content has already been saved; the plan decides the mechanism and lists any editor step in the release
  notes.
- **Release gate**: nothing is released to employees before the project lead (Roberto Carrera) confirms on
  issue #183 (bundle README, «project decision 5»). Merging to the main branch is not the same as
  releasing: the feature switch (FR-016) stays off in every deployed environment until then.
- **Languages and devices**: Norwegian (Bokmål) only; desktop browsers are the primary target; phones can
  read the deck via full screen, with the known small-text limitation.
- **Open questions for Roberto** (do not block the spec; recorded on the issue): (1) exact card position
  per his mockups; (2) who prepares and delivers future versions of the deck and in what cadence; (3)
  whether a contact person should be named on the page for questions about the guideline.
