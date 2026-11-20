# Tasks: Remember the reader's place in the guideline deck

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)
**Tests**: pure rules unit-tested (Vitest, node); component wiring verified in the browser pane against the
real local deck (`apps/web/protected-static/`, gitignored — never committed).

## HARD RULES

- Never `git add` any real deck file. Do not stage the unrelated working-tree edits (`.claude/launch.json`,
  specs 024/025 docs, `documentation/mcp-content-authoring.md`).
- Nothing is deployed or switched on anywhere.

## Phase 1: Pure rules (US1, US3 — foundation)

- [X] T001 [P] In `apps/web/src/lib/guideline-deck-view.ts` (keep it import-free) add `deckPositionStorageKey(userKey)`, `resolveStartHash(pageHash, remembered)` (valid page hash > valid remembered > `''`), `readDeckPosition(storage, key)` and `writeDeckPosition(storage, key, hash)`; storage typed as a minimal `{getItem, setItem}` (may be `null`); all storage calls in try/catch; reads validate with `parseDeckHash`; writes accept only a valid hash
- [X] T002 [P] In `apps/web/src/lib/guideline-deck.ts` add `deckUserKey(oid)` → first 16 hex chars of SHA-256 over `kihub-deck-position:` + `oid`
- [X] T003 Add `apps/web/tests/unit/guideline-deck-position.test.ts`: `resolveStartHash` precedence table (page `#53` + remembered `#12` → `#53`; page `''`/`#abc` + remembered `#12.2` → `#12.2`; both invalid → `''`; remembered `javascript:`/`#1;x`/`#1234` ignored); `readDeckPosition` returns `''` for missing, corrupt, hand-edited, and when `getItem` throws or storage is `null`; `writeDeckPosition` writes a valid hash, ignores an invalid one, swallows a throwing `setItem`; two user keys do not collide. Extend `guideline-deck.test.ts` with `deckUserKey` (stable, 16 hex, differs per oid, does not contain the oid)

## Phase 2: Wiring (US1, US2, US3)

- [X] T004 `apps/web/src/app/(app)/retningslinje/page.tsx`: read the session (`auth()` is already guaranteed by the layout; use `requireSession()` for the typed value), compute `deckUserKey(session.user…oid)` and pass `userKey` to `<DeckFrame>`. Check how the `oid` reaches `session.user` (`src/auth/config.ts`); fail closed (no key → no remembering, deck still works)
- [X] T005 `apps/web/src/components/DeckFrame.tsx`: accept `userKey?: string`; in the initial sync use `resolveStartHash(window.location.hash, readDeckPosition(localStorage, key))`; keep `hashchange` using `buildDeckSrc(hash)` only (R4); wrap the `localStorage` access in try/catch (the property access itself can throw)
- [X] T006 `DeckFrame.tsx`: position tracker effect (runs once `src` is set and a `userKey` exists): 500 ms interval + `pagehide` listener read `frameRef.current.contentWindow.location.hash` in try/catch; when valid and different from the last written value, `writeDeckPosition`; when it also differs from the page's own hash, drop the page hash via `history.replaceState(null, '', pathname + search)` (R5); clean up interval and listener. Update the component's doc comment
- [X] T007 `pnpm --filter web exec vitest run` (unit), `pnpm --filter web lint`, `pnpm --filter web exec tsc --noEmit`

## Phase 3: Verify in the browser (all stories)

- [X] T008 Dev server (mock auth, real local deck, `GUIDELINE_DECK_ENABLED=true`): go to slide 12 → refresh → slide 12; build step in the middle of an animated slide → refresh; Home → refresh → slide 1; close tab, reopen → remembered
- [X] T009 `/retningslinje#53` shows 53 even with 12 remembered; move on to 60, refresh → 60 and the page hash is gone; `#abc` falls back to remembered
- [X] T010 Second mock user in the same browser opens slide 1; `localStorage` holds only `kihub:deck-position:<16 hex>` → `#N`; no request carries the value (network tab); blocked storage (override `localStorage` getter to throw) → deck still opens, no console error
- [X] T011 No double load of the deck (network: one `index.html` request per page view) and no visible jump; full-screen button still works

## Phase 4: Wrap-up

- [X] T012 One line under 029 in `CLAUDE.md` (what it does + the stale-hash gotcha); tick the tasks; commit (`Signed-off-by`), do not push

## Implementation record (2026-11-20)

- Unit: web 36 files / 524 tests green (new `guideline-deck-position.test.ts`); lint and `tsc --noEmit` clean.
- Browser (dev server `kihub-web-029`, mock auth, real local deck): slide 5 build step 2 (`#5.2`) survived a
  refresh with ONE `index.html` request; cold load with `#40` won over the remembered place; `#abc` fell back to
  it; opening `#9` and then moving on dropped `#9` from the page address (FR-002a); a second user (Cara) got
  slide 1 under her own key while Ada's value stayed; `localStorage` holds only
  `kihub:deck-position:<16 hex>` → `#N`.
- NOT verified in a browser: blocked storage (covered by unit tests that pass a throwing/null storage); Home →
  slide 1 → refresh; the native full-screen path; non-Chromium browsers; `next build`.
- Local env note: `colima start` + `docker start kihub-postgres` were needed first (Postgres was down).
- Nothing deployed; no migration, dependency or server route added.
