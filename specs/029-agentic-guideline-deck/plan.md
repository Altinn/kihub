# Implementation Plan: Agentic-AI guideline deck («Retningslinje for agentisk KI i Digdir»)

**Branch**: `029-agentic-guideline-deck` | **Date**: 2026-11-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/029-agentic-guideline-deck/spec.md` (issue Altinn/kihub#183)

## Summary

Show the project lead's finished 104-slide HTML deck inside KI Hub, **unchanged**, to signed-in employees
only. A code-owned frontpage banner links to a new regular page `/retningslinje` (portal shell, intro,
usage note, deck in a 16:9 iframe, «Fullskjerm» button with an overlay fallback, plus «Åpne i ny fane»). The deck's files are served by a session-checked
route handler at `/retningslinje/deck/<path>` from a **private Azure Blob container** (local dev: a
gitignored folder), selected by the existing `MEDIA_STORAGE_MODE` seam.

The key planning result (research R1): **the repository and the production image are public**, so the
INTERN deck can be in neither. That reverses the first design (files in `protected-static/` shipped in
the build). Release is gated by `GUIDELINE_DECK_ENABLED` and by uploading the bundle; merging is not
releasing. Slide links (`#N`, `#N.b`) are forwarded into the iframe by one small client component.

## Technical Context

**Language/Version**: TypeScript 5, Node 22, Next.js 16.4.x (App Router), React 19

**Primary Dependencies**: existing — Payload 3.92.1 (not touched), Auth.js v5, Designsystemet, Vitest.
New: `@azure/storage-blob` **12.34.0** (exact; already in the lockfile transitively), devDependency
`axe-core` (verification only).

**Storage**: Azure Blob, new private container `kihub-protected` in the existing `stkihubmedia` account
(prefix `retningslinje/`); local disk folder in dev/tests. No PostgreSQL change, no migration.

**Testing**: Vitest unit (path rules, hash grammar, env/store config, banner), integration for the route
(auth mocked as in `route-protection.test.ts`, synthetic fixture deck), drift tests (reserved slug,
no-static-caching), plus a browser/axe pass with the real deck and an Azurite production-like run.

**Target Platform**: Azure Container Apps (`kihub-web`), standalone Next output, public image.

**Project Type**: web application (single `apps/web`, two surfaces; this feature touches the employee app only).

**Performance Goals**: deck entry (≈ 670 KB HTML, ≈ 50 KB gzipped) visible within normal page-load
expectations; streaming from blob without buffering whole files.

**Constraints**: INTERN — no deck bytes in git/image/logs; no external requests while viewing; no cookies
from the deck; 404 (not 403) for everything unauthorised-by-path; works with `X-Frame-Options:
SAMEORIGIN` and `frame-ancestors 'self'`; entry URL must end in `index.html`.

**Scale/Scope**: one bundle (16 files, ≈ 1.2 MB), ≈ 4 new source files, 1 client component, 3 small edits.

## Constitution Check

*GATE: passed before Phase 0; re-checked after design (below).*

| Principle / rule | Status | Note |
|---|---|---|
| I Git is source of truth for AI artifacts | N/A | the deck is not an AI artifact; Registry principles do not apply |
| II Payload owns native content | **Documented exception** | a static, externally authored, INTERN publication with its own player; stored in the platform's private Azure Blob (part of the stack), not Payload-authored and not editable in KI Hub (R9) |
| III–VI Registry principles | N/A | |
| VII Start simple | PASS | no collection, no migration, no CMS model; one store seam copied from media storage; one flag. Rebuilding the deck in React/CMS rejected (YAGNI + fidelity) |
| VIII Two surfaces | PASS | employee surface only; no admin UI added; role gating server-side (session check in the route) |
| Design System (employee UI) | PASS for the wrapper, **documented exception** for the deck | wrapper uses `ds-*` classes and tokens, no inline visual styles, no own custom properties; the deck is frozen vendor content (R8) |
| WCAG 2.2 AA | PASS for the wrapper with a **recorded limitation** | iframe titled, skip link, one `h1`, 320 px reflow; the deck's text does not scale with browser zoom (its README) — surfaced to readers, not worked around |
| Security: Entra, server-side | PASS | route checks the same session as every page; no new role |
| Data ownership | PASS | nothing persisted in KI Hub; deck bytes live only in the private container |
| Testing (new modules test access control) | PASS | route access matrix + path rules + switch tested |
| Accessibility gate (axe + keyboard) | PASS (planned) | no axe in repo today → `axe-core` dev dependency, run in the browser pane (R8) |

**Amendment proposal (not applied; needs approval)**: constitution 4.3.0 → **4.4.0**, one sentence under
the **Pages** module permitting a page to embed an externally authored static publication served from
private storage, never committed to the repository or image (R9). Violations needing Complexity Tracking:
none.

**Post-design re-check**: unchanged. The revised hosting design adds one dependency and one container but
removes the need for build tracing changes and a Dockerfile edit; no principle is newly strained.

## Project Structure

### Documentation (this feature)

```text
specs/029-agentic-guideline-deck/
├── plan.md
├── research.md          # R1–R10 (R1 reverses the first hosting design)
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── deck-route.md
│   └── guideline-page.md
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code (apps/web)

```text
apps/web/
├── package.json                                   # + @azure/storage-blob 12.34.0; + axe-core (dev)
├── .env.example                                   # + GUIDELINE_DECK_* (documented, disabled by default)
├── protected-static/                              # gitignored, local dev deck (never committed)
├── src/
│   ├── lib/
│   │   ├── guideline-deck.ts                      # NEW: enabled flag, DECK_ENTRY, resolveDeckPath, hash grammar, DeckStore (disk/azure)
│   │   └── page-slug.ts                           # + 'retningslinje' reserved
│   ├── components/
│   │   ├── DeckFrame.tsx                          # NEW 'use client': hash → iframe src + full-screen link
│   │   └── GuidelineBanner.tsx                    # NEW server: frontpage card
│   ├── app/(app)/
│   │   ├── page.tsx                               # + <GuidelineBanner/> when enabled
│   │   └── retningslinje/
│   │       ├── page.tsx                           # NEW: wrapper page
│   │       └── deck/[...path]/route.ts            # NEW: gated file route
│   └── styles/app.css                             # + .app-deck-frame (tokens only)
├── tests/
│   ├── fixtures/deck/                             # NEW synthetic stand-in deck (index.html + assets/)
│   ├── unit/guideline-deck.test.ts                # NEW
│   ├── unit/page-slug.test.ts                     # drift test passes once reserved
│   ├── unit/route-caching.test.ts                 # + new routes
│   └── integration/guideline-deck-route.test.ts   # NEW
.gitignore                                         # + apps/web/protected-static/
documentation/runtime-config.md                    # + GUIDELINE_DECK_ENABLED / _CONTAINER, upload + release steps
.specify/memory/constitution.md                    # only on approval (4.4.0)
```

**Structure Decision**: single `apps/web` project, reusing the existing storage-mode seam and the
employee-app shell. No new package, collection, migration or Dockerfile change. The Dockerfile `public/`
observation (research R10) is explicitly **out of scope** and filed as a separate follow-up.

## Complexity Tracking

No Constitution violations; two recorded exceptions (Principle II, deck's own Design System/zoom) are
documented above rather than tracked as complexity.
