# Quickstart: verifying Documentation Navigation for Pages

Run against a per-branch database (`kihub_028`, a copy of the local `kihub` DB) with the migration
applied, dev server on port 3028. Sign in once as a reader and once as an editor (contributor+).

## 0. Fixtures

In the CMS, create and publish:

- Page «Kom i gang» (`kom-i-gang`), no parent, with h2 «Før du starter», h3 «Installer agentctl»,
  h2 «Før du starter», h4 «Sjekk versjonen», h2 «🙂».
- Pages «Kom i gang med agentctl» (order 10), «Koble til agenten fra en app» (order 20) and «Gjør
  repoet klart for agenter» (order 30) with parent «Kom i gang».
- Page «Lag en agent for teamet» (order 40) with parent «Kom i gang», saved as **draft only**.
- Page «Om KI Hub» (`om-ki-hub`), no parent, no children, with one h2 «Kontakt».
- Site Chrome: nav item «Kom i gang» → `/kom-i-gang`.

## 1. US1 — anchors and table of contents

1. Open `/kom-i-gang` as a reader. Inspect the headings: `for-du-starter`, `installer-agentctl`,
   `for-du-starter-2`, `sjekk-versjonen`, `avsnitt`.
2. At 1280px wide: «På denne siden» is in the right margin, lists five entries, «Installer agentctl»
   and «Sjekk versjonen» indented. Scroll: the list stays in view.
3. Click «Sjekk versjonen»: the heading is fully visible with space above, marked as the target, and
   the address ends in `#sjekk-versjonen`.
4. Tab through the page: each heading's «#» link appears on focus; a screen reader (VoiceOver)
   announces «Lenke til avsnittet «Før du starter»», and the heading is read without «#».
5. At 375px: «På denne siden» is a closed control before the body text; open and close it with
   keyboard and touch.
6. Disable JavaScript and repeat 2–5.
7. Open `/om-ki-hub`: one heading, so no table of contents; the heading still has `id="kontakt"`.
8. In another page's body, add a link `/om-ki-hub#kontakt`, publish, follow it: it lands on «Kontakt».
9. Open a KI Læring page with several headings: same anchors and TOC, beside «Utforsk innhold».
10. At 1280px and 400% zoom: the TOC is the collapsed variant and covers nothing.
11. Compare with `main`: spacing above and below headings is unchanged, also for a heading first in the
    body and two headings in a row.
12. Run axe on `/kom-i-gang` and a KI Læring page: no violations.

## 2. US2 — hierarchy and nested addresses

1. As a reader, open `/kom-i-gang/koble-til-agenten-fra-en-app`: the page renders; the site menu item
   «Kom i gang» has `aria-current="page"`.
2. Open `/koble-til-agenten-fra-en-app#fra-claude-desktop` (any heading): redirected (307) to
   `/kom-i-gang/koble-til-agenten-fra-en-app#fra-claude-desktop`, landing on the section.
3. Open `/feil/koble-til-agenten-fra-en-app`: redirected to the canonical address.
4. Open `/kom-i-gang/lag-en-agent-for-teamet` (draft): normal 404, no hint of the draft.
5. Open `/news/x/koble-til-agenten-fra-en-app`, `/a/b/c/d`, `/kom-i-gang/Æ`: all 404.
6. As editor: set «Kom i gang med agentctl» as parent of «Kom i gang» → refused «Siden kan ikke ligge
   under en av sine egne undersider.» Set a page as its own parent → refused. Build a three-level chain
   and try a fourth level → refused «… tre nivåer.» Repeat one of these via `PATCH /payload-api/pages/:id`
   → 400 with the same message.
7. As editor, «Forhåndsvis» on the draft «Lag en agent for teamet»: opens at
   `/kom-i-gang/lag-en-agent-for-teamet` with the preview banner.
8. Move «Koble til agenten fra en app» to a new top-level page «Agenter» and publish; open the old
   `/kom-i-gang/koble-til-agenten-fra-en-app`: redirected to `/agenter/koble-til-agenten-fra-en-app`.
   Move it back and publish; open `/agenter/koble-til-agenten-fra-en-app` in the same browser: lands
   on `/kom-i-gang/...` with no redirect loop.
9. Delete «Agenter» (after moving the page back): no orphan errors; any child of it is now top-level.
10. «Om KI Hub» is still at `/om-ki-hub` and looks as before (apart from US1).
11. Create a page «Utkast-seksjon» saved as **draft only**, and publish a page «Barn» with it as parent.
    As a reader, open `/utkast-seksjon/barn`: redirected to `/barn`, and nothing on the page names
    «Utkast-seksjon». As editor in preview, «Forhåndsvis» on «Barn» opens `/utkast-seksjon/barn`.
    Publish «Utkast-seksjon»; as a reader, `/barn` now redirects to `/utkast-seksjon/barn`.

## 3. US3 — section menu

1. As a reader on `/kom-i-gang/gjor-repoet-klart-for-agenter`: a menu titled «Kom i gang» lists «Kom i
   gang», then «Kom i gang med agentctl», «Koble til agenten fra en app», «Gjør repoet klart for
   agenter»; the current page has `aria-current="page"`; the draft is absent.
2. Set two children to the same order: they sort alphabetically.
3. At 375px: the menu is a closed control above the content; works with keyboard, touch and without JS.
4. As an editor in preview of the draft: the page renders, and the menu still lists published pages only.
5. Unpublish «Kom i gang»: as a reader, its children render without a menu (and stay reachable).
6. On a section page, press Tab once: the existing «Hopp til hovedinnhold» (026) appears; Enter moves
   focus to the main content, where the section menu comes first, as on a KI Læring page. With
   VoiceOver, the landmarks list shows the section menu named «Kom i gang» and «Innhold på siden».
7. Run axe (browser extension or `@axe-core/cli`) on a section page and a KI Læring page: no new
   violations compared with `main`.

## 4. Regression

- `pnpm --filter web test`, lint, `tsc --noEmit`, `next build` with `AUTH_MODE=entra` against a migrated
  scratch DB.
- Existing routes (`/`, `/news`, `/laering`, `/prosjekter`, `/events`, `/bidra`, `/registry`) unchanged.
