# Research: Agentic-AI guideline deck (029)

Decisions R1–R10. Each: Decision / Rationale / Alternatives. Evidence marked ✔ was verified locally in
this session (spike with the real v2.2 bundle, mock sign-in, dev server) or against the repository.

## R1 — The deck must NOT live in the repository or the image (reverses the first draft)

**Decision**: The deck's files are stored in a **private Azure Blob container** and streamed to
signed-in employees by the application. They are never committed, never copied into the Docker image.
Tests use a tiny synthetic bundle under `apps/web/tests/fixtures/deck/`.

**Rationale** ✔: `gh repo view Altinn/kihub` → `visibility: PUBLIC`, and `.github/workflows/
deploy-production.yml` publishes a **public** image `ghcr.io/altinn/kihub-web` (a recorded decision in
`documentation/deployment-plan.md`). Anything in git or in the image is therefore on the open web, which
is exactly what the owner's INTERN classification forbids. A bonus: publishing a new deck becomes an
upload (no release), and "blob absent" is a natural second release gate.

**Alternatives**: files in `apps/web/protected-static/` shipped via `outputFileTracingIncludes` (the spike
design — rejected: public repo/image); Payload `media` upload (single-file image-oriented collection, no
relative-path bundle, ties files to DB rows); private submodule/second repo (complexity, CI secrets, still
baked into the public image); encrypting the bundle in git (key management for a 1 MB deck, absurd).

**Related finding (outside this feature)**: the issue's zip attachment is on a public issue and downloaded
anonymously ✔ (`curl` without auth → 200). Owner should delete it; recorded in spec Assumptions.

## R2 — Storage seam mirrors `lib/media-storage.ts`

**Decision**: new `lib/guideline-deck.ts` with a `DeckStore` interface and two implementations selected by
the **existing** `MEDIA_STORAGE_MODE` (`disk` default → local folder `apps/web/protected-static/
retningslinje/`, gitignored; `azure` → blob container). New env: `GUIDELINE_DECK_ENABLED` (release
switch, R5), `GUIDELINE_DECK_CONTAINER` (azure mode, default `kihub-protected`), `GUIDELINE_DECK_DIR`
(optional disk override, used by tests). Azure access reuses the existing `AZURE_STORAGE_CONNECTION_STRING`
secret already on `kihub-web`.

**Rationale**: house style (explicit mode, loud failure on misconfiguration — FR-025 of 014), no second
switch to forget, zero new secrets. A separate container (not `kihub-media`) keeps INTERN deck files
away from Payload's media listing and lets access be revoked independently.

**Alternatives**: separate `GUIDELINE_DECK_STORAGE_MODE` (rejected: two switches drifting); managed
identity (`DefaultAzureCredential`) instead of the account-key string (better long-term; the app already
holds the connection string, so deferred — noted as a hardening follow-up); Azure Static Web Apps with
Entra auth (a second deployment target and auth surface).

**Dependency**: `@azure/storage-blob` is only a transitive dependency (pnpm strict resolution hides it),
so add it as a direct, **exactly pinned** dependency at `12.34.0` — the version already in the lockfile
via `@payloadcms/storage-azure@3.92.1`, so no new version enters the tree.

## R3 — Serving route

**Decision**: route handler `src/app/(app)/retningslinje/deck/[...path]/route.ts` (GET only). Order of
checks: feature enabled (else 404) → `auth()` session (else 303 `/signin`; same employee gate as every
page because sessions only exist for gated employees) → `resolveDeckPath(segments)` (else 404) →
`store.read(path)` (else 404). Response headers: `Content-Type` from a whitelist map,
`Cache-Control: private, no-store`, `X-Robots-Tag: noindex, nofollow`, plus the app-wide security headers
from `next.config.mjs`.

**Rationale** ✔ (spike): the handler does not run through the `(app)` layout, so the session check lives in
the handler; without a session both the entry and every asset 303 to `/signin`; with one all 9 assets of
the real deck return 200 and the Inter font loads.

**Path rules** (`resolveDeckPath`, pure): each segment URL-decoded once, then must match
`^[A-Za-z0-9][A-Za-z0-9._-]*$` (no dotfiles, no `..`, no separators, no NUL); at most 4 segments;
extension whitelist `html css js woff2 svg png jpg jpeg webp gif json txt map?` — **`map` and `md` are
excluded** (`README.md` must not be served); a bare folder returns 404 (no listing). The final key is
`retningslinje/<segments joined by '/'>` for blob, `path.join(root, …)` + prefix check for disk.

**Entry address**: exactly `/retningslinje/deck/index.html` ✔ — Next strips trailing slashes
(`/retningslinje/deck/` → `/retningslinje/deck` → 404) and the bundle uses relative asset paths
(`assets/…`), so the entry file name is part of the URL.

**Hardening, verified against the real deck in tasks**: a `Content-Security-Policy` on `.html` responses
(`default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'
data:; font-src 'self'; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'`)
makes FR-010 (no external requests) a browser-enforced fact rather than a promise. The bundle's README
confirms one tiny inline script and says "no other inline code", so `'unsafe-inline'` for scripts is
accepted instead of a hash that would break on every new export. If the real deck violates it, relax only
the offending directive and record why.

**Alternatives**: static file in `public/` (✔ rejected: `/brand/kitt-logo.svg` returns 200 with no
session); Next middleware (the app has none; adds a global surface); serving a signed blob URL
(redirects employees to a storage URL that can be forwarded — breaks "only through a session").

## R4 — Slide references through the page (hash forwarding)

**Decision**: a **small client component `DeckFrame`** renders the toolbar link and the iframe. It reads
`location.hash` via `useSyncExternalStore` (server snapshot `''`, so no hydration mismatch), accepts it
only if it matches `^#\d{1,3}(\.\d{1,2})?$`, and builds `/retningslinje/deck/index.html` + hash for the
iframe `src` and the «Åpne i fullskjerm» `href`. On `hashchange` the `src` changes by fragment only, which
the deck handles through its own `hashchange` listener ✔ (iframe `#70` opened the Vedlegg slide and a
keypress advanced the build to `#70.2`). The iframe is mounted only after hydration so the browser
performs one load.

**Rationale**: the fragment never reaches the server, so some client code is unavoidable. A client
component is the idiomatic, hydration-safe way; the server-rendered shell keeps the heading, intro, a
`<noscript>` message and the full-screen link working without JS (FR-012). It is the app's only client
island for this feature.

**Alternatives**: inline `<script>` that rewrites `iframe.src` (zero client components, but mutates
React-owned DOM before hydration → `suppressHydrationWarning` hack, harder to test); forwarding via a
query string (`?slide=53`) — rejected, the owner's contract is `#N`; reading the deck's current slide back
for the full-screen link (same-origin makes it possible, but adds coupling to deck internals; the request
only needs the *requested* slide).

## R5 — Release gate

**Decision**: `GUIDELINE_DECK_ENABLED=true` turns the feature on; anything else (default) means the
frontpage card is not rendered and **both** `/retningslinje` and `/retningslinje/deck/*` return 404 for
everyone. Read per request through `isGuidelineDeckEnabled(env)`; pages are already dynamic (the layout
reads the session), and the value is not a `NEXT_PUBLIC_*`, so it is never inlined at build time.
Releasing = after Roberto's written confirmation on #183: upload the deck to the container, then
`az containerapp update … --set-env-vars GUIDELINE_DECK_ENABLED=true`. Neither is run by this feature.

**Rationale**: FR-016 — merge ≠ release; the same switch also covers a deploy where the blob is not yet
uploaded. Documented in `documentation/runtime-config.md`.

**Alternatives**: Payload global toggle (editors could flip an INTERN release gate; also needs a
migration); infer from blob existence (a storage call on every frontpage render).

## R6 — Frontpage card

**Decision**: a **code-owned `GuidelineBanner`** server component (same family as `ContributeBanner`),
rendered on the frontpage only when the feature is enabled, placed between the subscriptions banner and
the contribute banner (an official guideline outranks "share your tools"). Content is fixed Norwegian
text: tag «Retningslinje», heading «Retningslinje for agentisk KI i Digdir», one sentence, CTA «Åpne
retningslinjen». Whole card is one link to `/retningslinje`.

**Rationale** ✔ (code read): `mergeFrontpage` accepts the stored tiles only when there are *exactly two*;
the fixed two-up grid, and saved content is authoritative over defaults, so adding a third default tile
would need a schema change + migration AND would still not appear in production without an editor
re-saving. A code-owned banner reaches production on release with no editor step, which is what FR-004
requires; it is deliberately not editable (like `ContributeBanner` and `/bidra`).

**Alternatives**: third CMS tile (schema/migration + editor step); header-menu entry (a Site Chrome edit
by an editor; still allowed later, listed in Assumptions); changing the hero CTA.

**Placement is provisional** until Roberto's two UX mockups are checked (not downloaded yet); moving
the banner is a one-line change in `app/(app)/page.tsx`.

## R7 — Reserved address

**Decision**: add `'retningslinje'` to `RESERVED_PAGE_SLUGS` (`lib/page-slug.ts`). The 027 drift test scans
`src/app/**` top-level segments, so it fails until the entry exists ✔ (the route lives under `(app)`,
which the scanner descends into). `app/(app)/[...path]` (CMS pages) cannot shadow it: static segments win.

## R8 — Design System and accessibility of the wrapper

**Decision**: the wrapper page uses Designsystemet (`ds-heading`, `ds-paragraph`, `ds-alert` for the
zoom/limits note, `ds-link`/`ds-button`), `main` landmark, one `h1`, no skipped levels. The iframe has a
`title`, `allowfullscreen`, and a CSS class `app-deck-frame` in `styles/app.css` using only `--ds-*` tokens
(border, radius) and `aspect-ratio: 16 / 9` (a ratio is not a design value); no inline visual styles.
The repo has **no axe dependency** (✔ `package.json`), although the constitution requires an automated
WCAG 2.2 AA check on affected routes → add `axe-core` as a devDependency and run it in the browser pane
against `/retningslinje` and the frontpage during verification (recorded in quickstart). The deck itself
is a frozen third-party bundle; its known limits (browser zoom does not scale text; letterboxed 16:9) are
recorded, surfaced to readers in the page intro, and not worked around.

## R9 — Constitution position

- **Principle II** (native content is Payload-owned): a static bundle is not Payload-authored content.
  Treated as a **documented exception**: it is an externally authored, INTERN *publication* with its own
  player, stored in the platform's own private Azure Blob (already part of the stack), not an artifact
  (Registry principles I/III/IV/V/VI do not apply) and not editable in KI Hub.
- **Design System**: the page around the deck complies; the deck is frozen vendor content (README: "frozen
  v1.1 design system copies"). Exception recorded.
- **Recommendation (needs your approval, not applied)**: amend the constitution to **4.4.0** with a short
  note under the **Pages** module: «A page may embed an externally authored static publication served
  from private storage; such a publication is not committed to the repository or image.» Tasks include
  drafting it, but it is applied only on approval.

## R10 — Production verification and a side finding

**Decision**: verify with `next build` (migrated scratch DB + `AUTH_MODE=entra`, as in 020) that the
standalone output contains **no** deck files, then run the built server in `azure` mode against a local
**Azurite** blob emulator (or a throw-away container in the real account created on request) to prove the
blob path end to end. Azurite via docker is the default; real-account steps stay manual.

**Side finding (not part of this feature, unverified in a signed-in session)**: `apps/web/Dockerfile`
copies only `.next/standalone` and `.next/static`; Next's standalone output does not include `public/`.
Production `GET /brand/kitt-logo.svg` without a session returns **307** (✔ `curl` against
`kihub.digdir.no`) while dev returns 200, which suggests the logo and the 024 hero element are missing from
the image. Worth a separate fix (`COPY … apps/web/public`) after someone checks a signed-in page. This
plan does not depend on it, because the deck is not served from `public/`.
