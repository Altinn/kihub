# Quickstart / validation guide: guideline deck (029)

Prerequisites: local Postgres (colima + `kihub-postgres`, port 55432), `set -a; source apps/web/.env; set
+a`, the real v2.2 bundle extracted somewhere **outside the repo** (it is INTERN; never `git add` it).
Reference copy from the spike: scratchpad `deck183/extract/agentisk-ki-retningslinje-dist-v2.2/`.

## 1. Local run (disk store)

```bash
mkdir -p apps/web/protected-static/retningslinje
cp -R <extracted-bundle>/. apps/web/protected-static/retningslinje/
GUIDELINE_DECK_ENABLED=true pnpm --filter web dev --port 3029
```

Confirm `git status` shows nothing under `protected-static/` (gitignored).

## 2. Access matrix (curl, no browser)

| Request | Expected |
|---|---|
| switch off: `/retningslinje`, `/retningslinje/deck/index.html` | 404 (signed-out page request: redirect to sign-in) |
| switch on, no session: `/retningslinje/deck/index.html`, `…/assets/deck.js`, `…/assets/fonts/InterVariable.woff2` | 303 → `/signin`, empty body |
| switch on, session: same three | 200, `Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, HTML has the CSP |
| session: `…/README.md`, `…/..%2f..%2fpackage.json`, `…/%2e%2e/.env`, `…/assets/` , `…/index.html.map` | 404 plain |
| session: `/retningslinje/deck/` (bare) | 404 (not a listing) |

## 3. Frontpage and page (browser pane, mock sign-in as `Ada Employee`)

1. `/` shows the «Retningslinje for agentisk KI i Digdir» banner between the subscriptions and contribute
   banners; with the switch off it is absent.
2. Click it → `/retningslinje`; heading, intro, «Fullskjerm» with a small ⓘ (hover or focus it for the usage help) and the deck at slide 1.
3. Click the frame, press → until slide 104; ← and Home/End work; browser back returns one slide.
4. `/retningslinje#53` → frame shows «Nødstoppen stanser hele løsningen…»; `#70` → «Vedlegg: kravene
   ordrett»; `#70.2` → step 2; «Fullskjerm» fills the screen on the same slide (native full screen, or the overlay where the browser does not allow it); the arrow keys / Home / End turn slides at once without clicking (focus is in the deck), one Tab reaches the close button, Esc closes from anywhere and returns focus to «Fullskjerm».
5. DevTools: zero console errors; Network shows requests only to the KI Hub origin; no `Set-Cookie` from
   the deck responses (SC-004).
6. Axe (`axe-core` from `node_modules`, injected via the browser pane) on `/retningslinje` and `/`: zero
   violations. Keyboard pass: skip link → banner → page controls → into and out of the frame.
7. Phone width (375 px) and 320 px: page reflows, no horizontal scroll; «Fullskjerm» button prominent (iPhone Safari uses the overlay).

## 4. Production-like run (no deck in the image — SC-009)

```bash
pnpm --filter web build        # migrated scratch DB, AUTH_MODE=entra (see CLAUDE.md 020/016 notes)
find apps/web/.next/standalone -path '*retningslinje*' -o -name 'InterVariable*' -o -name 'deck.js' | head
```
Expected: no deck file listed. Then run Azurite (`docker run -p 10000:10000 mcr.microsoft.com/azure-storage/
azurite azurite-blob --blobHost 0.0.0.0`), create container `kihub-protected`, upload the bundle under
`retningslinje/`, start the built server with `MEDIA_STORAGE_MODE=azure`, the Azurite connection string,
`GUIDELINE_DECK_CONTAINER=kihub-protected`, `GUIDELINE_DECK_ENABLED=true`, repeat §2–§3. Misconfiguration
check: unset `GUIDELINE_DECK_CONTAINER` with the switch on → boot or first request fails naming it.

## 5. Update procedure (FR-013, SC-006)

Replace the blobs with a bundle whose slide title differs; reload the page; the new title shows with no
deploy. Document the `az storage blob upload-batch` command in `documentation/runtime-config.md`
(manual, owner-run).

## 6. Release (only after Roberto confirms on #183 — not part of implementation)

1. Create the private container `kihub-protected` in `stkihubmedia` (Contributor suffices, as for
   `kihub-media`); do **not** enable anonymous access.
2. Upload the bundle under `retningslinje/`.
3. `az containerapp update -n kihub-web -g rg-kihub-app --set-env-vars GUIDELINE_DECK_ENABLED=true
   GUIDELINE_DECK_CONTAINER=kihub-protected`.
4. Re-run §2 against `kihub.digdir.no` with a real Entra session; an anonymous `curl` must 303.
