# Quickstart: Learning Pages (KI Læring)

**Feature**: `014-learning-pages` | **Date**: 2026-08-10

How to run, seed and validate the feature end to end. Read
[contracts/](./contracts/) for the guarantees each step is checking.

---

## 0. Prerequisites

Local Postgres running (colima + docker compose, `kihub-postgres` on port 55432):

```bash
colima start && docker compose up -d
```

Environment. `MEDIA_STORAGE_MODE` is new — omit it or set `disk` for local work; **no Azure variable
is needed locally** (media-storage.md §B1.4):

```bash
cd /Users/adi/kihub && printf '\n# --- Learning media uploads (014) ---\nMEDIA_STORAGE_MODE=disk\n' >> apps/web/.env
```

Integration tests read the env from the shell, so it must be **exported**:

```bash
set -a; source apps/web/.env; set +a
```

## 1. Install and migrate

```bash
pnpm install && pnpm --filter web migrate
```

Two new dependencies (research §4, §6) — both exact pins:
`shiki@4.4.3`, `@payloadcms/storage-azure@3.85.2` (its peer range is `payload: "3.85.2"` exactly, so it
must move in lockstep with Payload).

The migration is additive — four new tables, nothing existing altered. Running it against the local
database, which already holds data from prior phases, **is** the SC-012 check.

## 2. Run

```bash
pnpm --filter web dev
```

- Employee surface: <http://localhost:3000/laering>
- Back-office: <http://localhost:3000/cms>

## 3. Seed a library in `/cms`

Enough content to exercise every branch of the tree assembly:

1. **Læringskategorier** — create `Grunnleggende` (order 10, with a description) and `Referanse`
   (order 20, description). Create `Praktisk` (order 30) and leave it **empty** — it must never
   appear on the employee surface (FR-008).
2. **Læringsunderkategorier** — under `Grunnleggende`, create `Tips & triks` (order 10).
3. **Læringssider** — create:
   - `Hva er agenter` — category `Grunnleggende`, **no** subcategory, order 10, published.
   - `Instruksjoner` — category `Grunnleggende`, no subcategory, order 20, published.
   - `Få dybde, ikke fluff` — category `Grunnleggende`, subcategory `Tips & triks`, published.
   - `Ordliste` — category `Referanse`, published.
   - `Utkast` — category `Referanse`, **draft**.

In one page's body, add: an `h2`, a bullet list, a link, a blockquote, a **dragged-in image** (give it
alt text), and **two code blocks** — one `shell`, one `json`.

## 4. Validate the employee surface

### 4.1 Structure and order

- `/laering` lists `Grunnleggende` then `Referanse` with their descriptions. `Praktisk` is absent
  (FR-008 / contract C3).
- The sidebar shows `Hva er agenter`, `Instruksjoner` (ungrouped, in order) **before** the
  `Tips & triks` group (contract B7).
- `Utkast` appears nowhere; `/laering/utkast` is a 404 (FR-012 / FR-032).

### 4.2 Current page and disclosure

- Open `/laering/fa-dybde-ikke-fluff`. Its `Grunnleggende` group is already expanded on load
  (FR-004 / B4), and the link carries `aria-current="page"` plus a visible treatment (B2).

### 4.3 No JavaScript (SC-009 — the one that is easy to skip)

Disable JavaScript in devtools (Command palette → "Disable JavaScript"), reload, then:

- expand and collapse a category group — it must still work (native `<details>`, FR-005);
- navigate to another page from the sidebar;
- on a 375 px viewport, open the collapsed sidebar disclosure.

Only the code-block copy button should be inert. Nothing about navigating or reading may depend on
scripting.

### 4.4 Responsive (SC-004)

At 360, 375 and 768 px: single column, sidebar collapsed above the content, and **no horizontal
scrolling** — especially on the page with code blocks. Verify a long unbroken code line scrolls
*inside* its own block (contract B2.7).

### 4.5 Code samples

- Both blocks are highlighted, indentation and blank lines preserved exactly (B2.1).
- "Kopier" copies the raw sample text — paste it into an editor and diff against the source (B2.5).
- Nothing executes. Add a block with `<script>alert(1)</script>` and one with `${process.env.SECRET}`
  as the sample text: both must render as visible inert text (FR-027, B2.8).
- Set a block's language to something outside the curated map — it renders as plain monospace, not an
  error (FR-028).
- Inspect a token in devtools: its `color` must be a `var(--shiki-token-*)` reference, **not** a hex
  value (FR-034, B2.4).

### 4.6 Images

- The image renders at content width with its alt text, and does not overflow at 360 px (B1.4).
- Mark it `decorative` on the node → the rendered `alt` becomes `""` (B1.2).
- Try uploading an **SVG** and a **>5 MB** file: both refused with a clear message (FR-022).
- Delete the media document while a published page still references it → the page still renders, just
  without the image (B1.5).

### 4.7 Editorial safety

- Try deleting `Grunnleggende` while it holds pages → refused, with a Norwegian message naming the
  count (FR-016).
- Via the API path (not the admin form), attach a page in `Referanse` to the `Tips & triks`
  subcategory (which belongs to `Grunnleggende`) → rejected by the validation hook, not just hidden by
  the admin filter (FR-014):

```bash
curl -X PATCH "http://localhost:3000/payload-api/learning-pages/<id>" -H 'Content-Type: application/json' -H "Cookie: <editor session>" -d '{"subcategory":"<tips-triks-id>"}'
```

- Rename a page's title → its address handle does not change (FR-011).

### 4.8 Contrast (SC-011)

Measure with devtools or a contrast checker: body text, the subtle "Sist oppdatert" line, every
highlighted code token role, and the current-page nav link — all ≥ 4.5:1 (≥ 3:1 for large text and
the non-text current-page indicator).

## 5. Run the suite

```bash
set -a; source apps/web/.env; set +a && pnpm --filter web test
```

Then lint and a production build (the house gate — 013 shipped on "suite green, lint + prod build
green"):

```bash
pnpm --filter web lint && pnpm --filter web build
```

The build is not ceremony here: it is what proves shiki's fine-grained bundle traces correctly into
`.next/standalone` with no WASM asset (research §4).

## 6. Deploy notes

### 6.1 The navigation entry does not appear by itself

`lib/site-content.ts` treats a **saved** `site-chrome` nav as authoritative wholesale, so adding
"KI Læring" to `DEFAULT_SITE_CHROME` only affects environments that have never saved the global
(research §11). No migration touches editor-owned content.

**Action for any environment with a customised nav**: in `/cms` → Globals → Site Chrome, add a nav
item — label `KI Læring`, href `/laering` — and the same to the footer links. One edit; the module is
reachable by URL meanwhile.

### 6.2 Durable image storage

Until the platform team provisions the blob container, deployed environments run
`MEDIA_STORAGE_MODE=disk` and **uploaded images are ephemeral** — they disappear on restart
(media-storage.md §C). Flipping to durable storage is configuration only, no code change:

```
MEDIA_STORAGE_MODE=azure
AZURE_STORAGE_CONNECTION_STRING=<from the platform team>
AZURE_STORAGE_CONTAINER_NAME=<container>
```

Set these **before** editors start filling the library — files uploaded during the `disk` period are
not migrated and must be re-uploaded. A misconfigured `azure` mode crash-loops the container at boot
with a named error rather than silently serving broken images (media-storage.md §B1).
