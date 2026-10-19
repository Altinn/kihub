# Quickstart: verify the hero design element

Prerequisites: local DB running (colima + `docker compose`, `kihub-postgres` on 55432) and
`apps/web/.env` present.

1. Start the dev server (`.claude/launch.json` → `kihub-web`, or `pnpm --filter web dev`).
2. Sign in (mock auth locally) and open `/`.
3. **Expect (desktop width ≥ the hero breakpoint)**: the coral circle with the overlapping
   rotated navy square sits right of the hero heading, at most 420px wide, with no white box
   behind it (spec US1 #1–#2).
4. **Expect**: the `<img>` has `alt=""` + `role="presentation"`, and `src` ends with
   `/brand/hero-design-element.svg` (US1 #3).
5. **Expect (narrow width)**: the art slot is hidden, as before.
6. `grep -rn hero-illustration apps/web` returns nothing (FR-005).
7. `pnpm --filter web lint` and `pnpm --filter web exec tsc --noEmit` are clean.
