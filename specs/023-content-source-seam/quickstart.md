# Quickstart: validating the content source seam (023)

## Prerequisites

- Local Postgres up (colima + `docker compose`, container `kihub-postgres`, port 55432).
- The env must be **exported** for tests: `set -a; source apps/web/.env; set +a`.
- No new setting is required. Leaving all `CONTENT_SOURCE_*` unset is the normal case.

## §1 Automated gates (all must pass)

```bash
pnpm --filter web test
```

```bash
pnpm --filter web lint
```

```bash
pnpm --filter web exec tsc --noEmit
```

Expected:
- The full suite is green. Its new members are:
  - `content-source-config` (selection/validation)
  - `content-mapping.<module>` (Payload → view model, one file per module, incl. image + rich-text
  edge cases)
  - `content-parity` (golden HTML, research R8)
  - `content-stand-in` (US3)
- `content-parity` must pass **without** `-u`. The `__parity__/*.html` and `*.queries.json`
  goldens are the ones committed before the refactor; `git log -- apps/web/tests/unit/__parity__` shows a single
  capture commit.
- Lint is clean, including the new `no-restricted-imports` guard (research R9).

`next build` is the gate that catches implicit-`any` slips (014 lesson). Like 020, it needs a
migrated scratch DB and a non-mock auth mode:

```bash
DATABASE_URI=postgres://…/kihub_023 AUTH_MODE=entra pnpm --filter web build
```

## §2 Guardrail check (SC-003)

Temporarily add `import type { News } from '@/payload-types';` to `src/components/NewsCard.tsx` and
run `pnpm --filter web lint`.

Expected: an error that names `lib/content/types.ts`. Revert the line.

## §3 Visual parity in a real browser (SC-001, secondary to §1)

1. On `main`, start the dev server (`kihub-web` launch config, or `pnpm --filter web dev`), sign
   in with the mock persona, and save the `<main>` HTML of each of these pages:
   - `/`
   - `/news`, `/news?page=2`, one article with an uploaded hero, one with a legacy hero
   - `/events` (list and calendar), one event, its `/ics`
   - `/prosjekter`, one project
   - `/laering`, one page with code + video + image
2. Do the same on `023-content-source-seam` against the **same** DB.
3. Diff each pair. Expected: no differences, other than build-specific script hashes outside
   `<main>`.

## §4 Fail-fast check (US2, SC-005)

```bash
CONTENT_SOURCE_NEWS=paylod CONTENT_SOURCE_EVENTS=umbraco pnpm --filter web dev
```

Expected:
- The process exits with a non-zero code before serving any request.
- The log carries **one** message naming `CONTENT_SOURCE_NEWS="paylod"` and
  `CONTENT_SOURCE_EVENTS="umbraco"` with `accepted: payload`.
- The same holds for `next start` on a production build (research R6).

Then confirm the tolerant cases start normally:
- `CONTENT_SOURCE_NEWS=Payload` and `CONTENT_SOURCE_NEWS=" "` both mean `payload`.
- `CONTENT_SOURCE_SOMETHING=x` is ignored.

## §5 Unchanged surfaces (FR-003, FR-015, SC-007)

- `/cms`: open a news article, an event, a learning page and the Frontpage global. They look and
  save as before.
- `git diff main -- apps/web/src/collections apps/web/src/globals apps/web/src/migrations apps/web/src/payload.config.ts`
  is empty, except the `site-content-defaults` type rename if it surfaces in `Frontpage.ts` imports.
- `git diff main -- apps/web/package.json pnpm-lock.yaml` is empty (FR-004: no new dependency).
- `/registry`, an artifact page and registry search behave as before.

## §6 Release notes

There is nothing to configure in any environment. The defaults keep every module on Payload. The
settings only become meaningful when an Umbraco source exists (the next feature, the Projects
pilot).
