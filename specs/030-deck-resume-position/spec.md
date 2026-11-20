# Feature Specification: Remember the reader's place in the guideline deck

**Feature Branch**: `030-deck-resume-position` (stacked on `029-agentic-guideline-deck`, which is not yet merged)

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Employees complained that when they refresh the «Retningslinje for agentisk KI i
Digdir» page they lose which slide they were on. Make the deck reopen where the reader left off. Everyone is
signed in anyway, so keep it simple: remember it in the browser, tied to the signed-in user — no database."

## Background

Feature 029 shows the 104-slide guideline deck inside KI Hub. The deck moves between slides on its own and
writes the current slide into the address of the frame (`#N`, or `#N.b` for a build step inside a slide). That
address belongs to the frame, not to the KI Hub page around it, so the page's own address stays plain
`/retningslinje`. When the reader refreshes, closes the tab by accident, or comes back the next day, the page
loads the deck from slide 1.

The deck is long (a 69-slide guideline plus a 35-slide appendix), so people read it over several sittings.
Losing the place is the one repeated complaint.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refresh keeps my slide (Priority: P1)

A signed-in employee is on slide 53 of the deck and refreshes the page (or the browser reloads it, or they
accidentally close and reopen the tab). The deck opens on slide 53 again, not slide 1.

**Why this priority**: This is the complaint. It alone is a viable fix.

**Independent Test**: Open the page, move to slide 12, refresh. The deck shows slide 12.

**Acceptance Scenarios**:

1. **Given** a reader who has moved to slide 53, **When** they refresh the page, **Then** the deck opens on
   slide 53.
2. **Given** a reader who stopped in the middle of an animated slide (build step 2 of slide 20), **When** they
   refresh, **Then** the deck opens on that slide at that step.
3. **Given** a reader who goes back to earlier slides and refreshes, **When** the page reloads, **Then** it
   shows the slide they were on last, not the furthest slide they ever reached.
4. **Given** a reader who has never opened the deck in this browser, **When** they open the page, **Then**
   the deck opens on slide 1 as before.

---

### User Story 2 - Come back later (Priority: P2)

The same employee closes the browser and returns the next day, opening the page from the frontpage card. The
deck opens where they stopped.

**Why this priority**: Natural extension of Story 1 for a deck read over several sittings, and it costs nothing
extra once the place is remembered. Not what was reported, so it ranks below it.

**Independent Test**: Move to slide 40, close the browser window, reopen it, sign in, open the page. The deck
shows slide 40.

**Acceptance Scenarios**:

1. **Given** a reader who left at slide 40, **When** they return in a new browser session on the same
   computer and browser, **Then** the deck opens on slide 40.
2. **Given** a reader who wants to start over, **When** they go to the first slide (Home key or the deck's own
   controls), **Then** the remembered place becomes slide 1 and the next visit opens there.

---

### User Story 3 - A shared link still wins, and people don't mix (Priority: P2)

A colleague shares `…/retningslinje#53`. The recipient must see slide 53 — not whatever they happened to be on
last time. And on a shared computer, one person's place must not be offered to another person who signs in.

**Why this priority**: Without it, the feature would break the deep links 029 already supports and would
confuse people on shared devices.

**Independent Test**: With a remembered place of slide 12, open the page with `#53`: the deck shows 53. Sign in
as a different user in the same browser: the deck shows slide 1.

**Acceptance Scenarios**:

1. **Given** a remembered place of slide 12, **When** the page is opened with a valid slide address
   (`#53` or `#53.2`), **Then** the deck opens on that address, and that address becomes the new remembered
   place as the reader moves on.
2. **Given** a reader who opened the page with `#53`, moved on to slide 60 and refreshes, **When** the page
   reloads, **Then** the deck shows slide 60: the shared address only decides where the reader STARTS; once
   they move, it no longer applies.
3. **Given** a remembered place of slide 12 and a page address with an invalid slide address (for example
   `#abc`), **When** the page opens, **Then** the remembered place is used, as if there were no address.
4. **Given** two different employees using the same browser one after the other, **When** the second signs in
   and opens the page, **Then** the deck opens on slide 1 (or on their own remembered place), never on the
   first person's.

---

### Edge Cases

- The browser blocks or has no storage (private window, locked-down policy): the deck behaves exactly as it
  does today — opens on slide 1, and nothing shows an error.
- The remembered value is missing, empty, corrupted or hand-edited to something that is not a slide address:
  it is ignored and the deck opens on slide 1.
- The remembered slide is beyond the end of a later, shorter version of the deck: the deck's own handling of
  out-of-range addresses applies (it shows the nearest slide); nothing breaks.
- The reader opens the page in two tabs: the last slide change anywhere wins; neither tab breaks.
- The reader moves quickly through many slides and refreshes immediately: the place saved may lag by a
  moment, but is never a slide the reader did not visit.
- Full screen (native or the overlay fallback) is entered or left: the place is unaffected and keeps being
  tracked.
- Reading history in the deck (the browser's back button inside the deck) changes the slide: the remembered
  place follows it.
- A different browser or a different computer does not carry the place over; this is accepted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the guideline page opens and the page address has no valid slide address, the deck MUST open
  on the slide and build step the signed-in reader last viewed in this browser, if one is remembered.
- **FR-002**: When the page address has a valid slide address, the deck MUST open there, regardless of any
  remembered place.
- **FR-002a**: A slide address in the page address MUST decide only where the deck STARTS. Once the reader
  has moved to a different slide, that address MUST no longer be applied on a refresh (the reader's actual
  place is).
- **FR-003**: The system MUST update the remembered place whenever the reader changes slide or build step by
  any means (keys, click, the deck's own controls, the browser's back/forward, going to the first/last slide).
- **FR-004**: The remembered place MUST be kept per signed-in user: a different employee signing in on the
  same browser MUST NOT be opened on the previous person's place.
- **FR-005**: The remembered place MUST be stored only in the reader's browser. KI Hub MUST NOT save it on its
  servers or in its database, and no server-side change is needed.
- **FR-006**: The remembered value MUST be checked against the deck's slide-address format before it is used;
  anything else MUST be ignored.
- **FR-007**: If the browser's storage is unavailable, blocked or full, the feature MUST silently do nothing
  and the deck MUST behave exactly as it does without the feature: no error message, no broken page, no
  console error that interrupts reading.
- **FR-008**: The feature MUST NOT change what the deck shows or how it moves between slides, MUST NOT change
  the deck files, and MUST NOT reload the deck an extra time when opening it.
- **FR-009**: The feature MUST NOT add anything to the page's visible interface that the reader has to
  operate; remembering is automatic.
- **FR-010**: The remembered value MUST contain only the slide address (for example `#53.2`) and no personal
  information beyond what is needed to keep users apart; it MUST NOT contain the person's name or e-mail
  address in readable form.
- **FR-011**: The feature MUST work with the page's existing access control and the release switch unchanged:
  when the deck page is off or the reader is not signed in, nothing is read or stored.

### Key Entities

- **Remembered place**: the last slide address (`#N` or `#N.b`) the reader viewed, belonging to one signed-in
  user in one browser. One value per user; no history; no timestamp is required.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a refresh, the deck reopens on the same slide and step the reader was on in 100 % of
  attempts across the first, a middle, the last slide and a mid-animation step, when storage is available.
- **SC-002**: A reader returning in a new browser session reaches their previous slide with zero extra clicks.
- **SC-003**: A page opened with a valid slide address shows exactly that slide in 100 % of attempts, whatever
  was remembered.
- **SC-004**: With storage blocked, the page loads and works exactly as before, with no visible error.
- **SC-005**: A second employee signing in on the same browser is never opened on the first employee's slide.
- **SC-006**: The deck is loaded once per page view, with no visible jump from slide 1 to the remembered slide.
- **SC-007**: No remembered-place data is present in any request KI Hub's servers receive for this feature.

## Assumptions

- «Remembered» means in the reader's browser only; moving to another browser or computer starts from slide 1.
  This is accepted for a presentation people read at one desk.
- No expiry is needed: the value is a few characters, and a later shorter deck is handled by the deck's own
  out-of-range handling.
- The deck itself is unchanged and keeps writing its slide address as it does today; the feature only reads it.
- Employees who clear their browser data lose the place; that is expected.
- Detecting that the reader is signed in is already guaranteed by 029's access control; this feature only
  needs a stable, non-readable key for the signed-in person from the existing session.
- The remembered place is not a privacy risk: it is a slide number in the reader's own browser, never sent
  anywhere.
- Out of scope: syncing across devices, a «continue where you left off» prompt or banner, reading-progress
  statistics, bookmarks, and any change to the frontpage card.
