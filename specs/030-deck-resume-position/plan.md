# Implementation Plan: Remember the reader's place in the guideline deck

**Branch**: `030-deck-resume-position` (stacked on 029) | **Date**: 2026-11-20 | **Spec**: [spec.md](./spec.md)

## Summary

`DeckFrame` (029's only client component) learns to (1) open the frame on a remembered slide when the page
address has none, and (2) keep that memory current by observing the same-origin frame's own address. Storage
is the browser's `localStorage`, one small value per signed-in user. No server route, database, migration,
dependency or deck-file change. The only server-side touch is passing a pseudonymous per-user key from the
page (which already runs behind `requireSession()`) into `DeckFrame`.

## Technical Context

**Language/Version**: TypeScript, Next.js App Router, React 19 (existing `apps/web`)
**Dependencies**: none new
**Storage**: browser `localStorage` only (R1)
**Testing**: Vitest (node environment, no JSX, no jsdom) — pure helpers get unit tests with a fake storage;
the component wiring is verified in the browser pane against the real local deck (the repo's existing
practice, see 028-docs-navigation gotcha)
**Constraints**: no extra deck load, no visible jump, silent degradation when storage is unavailable

## Research (decisions)

- **R1 — `localStorage`, not a cookie.** A cookie is sent with every request, including each of the deck's
  ~dozens of asset requests, and the server never needs the value. `localStorage` is read only by the
  client, survives closing the browser, and is per origin. A failed write is a try/catch away from a no-op
  (FR-007).
- **R2 — per-user key, computed on the server.** The page already holds the session. It derives
  `deckUserKey(oid)` = first 16 hex of SHA-256 over a fixed prefix + the Entra `oid`, and passes it to
  `DeckFrame` as a prop. The browser therefore never stores the raw `oid`, name or e-mail (FR-010). It is
  pseudonymous, not secret: its job is to keep two people on one browser apart (FR-004), not to hide
  anything from the browser's owner. Storage key: `kihub:deck-position:<userKey>`.
- **R3 — how to observe the frame.** The deck moves with `history.pushState` / `replaceState`, which fire no
  event in the frame, and `hashchange` fires only for fragment navigations. The frame is same-origin (served
  by our own gated route), so `DeckFrame` reads `frame.contentWindow.location.hash` on a 500 ms interval and
  once more on `pagehide` (a refresh or tab close inside the interval would otherwise lose the last step).
  Reads are wrapped in try/catch (cross-origin or detached frame → skip). The loop writes only when the
  value is a valid slide address AND differs from the last value written. An empty/`about:blank` hash before
  the frame loads is invalid and ignored. Alternatives rejected: patching the frame's `history` methods
  (reaches into the deck's internals, breaks if the bundle changes), a MutationObserver on the frame's
  `<title>` (fires before the deck writes the hash; fragile), changing the deck to post messages (the deck
  must stay byte-identical, 029 FR-015).
- **R4 — precedence.** Pure function `resolveStartHash(pageHash, remembered)`: a valid page hash wins, else a
  valid remembered value, else `''`. It is used ONCE, for the initial `src`; later `hashchange` events on the
  page keep 029's behaviour (`buildDeckSrc(hash)` only).
- **R5 — a stale page hash must stop winning (FR-002a).** If the page opened as `/retningslinje#53` and the
  reader moves on, a refresh would re-read `#53`. When the tracker sees a valid position that differs from
  the page's own hash, it drops the page hash with `history.replaceState(null, '', pathname + search)`
  (replaceState fires no `hashchange`, so the frame is not reloaded). We strip rather than mirror the
  position into the page address: it keeps the page address meaning what 029 says it means, and the user
  asked for browser memory, not a new URL scheme.
- **R6 — validation.** Both the remembered value and the page hash go through 029's `parseDeckHash` (`#N`,
  `#N.b`). A value from storage is never concatenated into an address unvalidated. Out-of-range numbers are
  left to the deck, which clamps them.
- **R7 — graceful degradation.** `getItem`/`setItem` are only ever called inside try/catch in two tiny
  functions that accept a minimal `{getItem, setItem}` object, so a throwing or missing `localStorage`
  (private mode, policy, quota) yields «no remembered place» / «write skipped».
- **R8 — nothing to render.** No visible UI (FR-009); no new text, so no i18n or axe change.

## Constitution Check

| Principle / constraint | Status | Note |
|---|---|---|
| Data ownership / persistence | PASS | nothing stored by KI Hub; a slide address in the reader's own browser |
| Security: Entra, server-side | PASS | page is already behind `requireSession()`; no new route, role or secret |
| Privacy | PASS | key is a truncated hash of the `oid`; value is a slide address; never sent to a server |
| Pages module / Design System | PASS | no markup or style change |
| Testing | PASS | pure rules unit-tested; browser verification for the wiring |
| Dependencies | PASS | none added |

No violations; no amendment; no Complexity Tracking.

## Project Structure

```text
specs/030-deck-resume-position/{spec.md, plan.md, tasks.md, checklists/requirements.md}

apps/web/
├── src/
│   ├── lib/
│   │   ├── guideline-deck-view.ts      # + deckPositionStorageKey, resolveStartHash, read/writeDeckPosition (browser-safe, no imports)
│   │   └── guideline-deck.ts           # + deckUserKey(oid) (node crypto, server only)
│   ├── components/DeckFrame.tsx        # + `userKey` prop; initial src from resolveStartHash; position tracker
│   └── app/(app)/retningslinje/page.tsx# + reads the session, passes `userKey`
└── tests/unit/
    ├── guideline-deck.test.ts          # + deckUserKey
    └── guideline-deck-position.test.ts # NEW: resolveStartHash, read/write with a fake/throwing storage
documentation/ (none)  CLAUDE.md (one line under 029)
```

**Structure Decision**: extend the existing 029 seam (pure view module + the one client island); no new files
in `src/` beyond tests.
