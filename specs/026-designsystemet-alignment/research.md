# Research: Designsystemet alignment and Digdir profile (026)

Sources:
- Digdir profile: design.digdir.no/digdir/farger and profilveileder.digdir.no.
- designsystemet.no.
- The installed 1.18.0 packages: `@digdir/designsystemet-css`, `-react` and `-web`.
- A trial theme build in a scratch directory on 2026-10-21.
- A read-only audit of every employee-facing component and page.

## R1 — Theme: Digdir's official web theme, no overrides

**Decision.** Use this `designsystemet.config.json` theme:

```json
"colors": {
  "accent": "#0062BA",
  "brand1": "#F45F63",
  "brand2": "#E5AA20",
  "brand3": "#1E98F5",
  "neutral": "#1E2B3C"
},
"typography": { "fontFamily": "Inter" },
"borderRadius": 4
```

The theme name stays `kihub`. **All `overrides` are dropped**, including focus and severity.

**Rationale.**
- These are exactly the values on Digdir's farger page for the official Designsystemet web theme.
- A trial build showed the generator already reproduces every accent value we used to pin by
  hand: `background-tinted` `#eef4fa`, `surface-tinted` `#ddeaf6`, `text-default` `#002c54`,
  `base-hover` `#004f96`.
- It also pins `base-default` to the input colour by itself.
- Neutral resolves to `text-default` `#1f2c3d`, which is Blåsvart within rounding, and
  `text-subtle` `#545e6b`.
- Focus resolves to `#1f2c3d` outer and `#ffffff` inner.
- With no overrides the theme stays correct when the dark scheme is used (R7). Hand-pinned
  light-only overrides would make the two schemes drift apart.
- The flat `colors` object is the CLI's canonical format: the CLI migrated a `main`/`support`
  trial config back to it.

**Alternatives considered.**
- *Keep `pink`/`yellow` names.* Rejected: Digdir's own theme calls them `brand1..3`, and matching
  it makes our tokens line up with other Digdir services.
- *Pin neutral `text-default` to exactly `#1E2B3C`.* Rejected: a one-step rounding difference is
  invisible, and an override would need a dark counterpart.

**Consequences.**
- `--ds-color-pink-*` and `--ds-color-yellow-*` disappear. Only `.fp-tile--pink/--yellow` and the
  025 bridge lines use them, and both are rewritten in the foundation slice.
- Rerun `theme:build`. The diff becomes a full regeneration, which is expected.

## R2 — Plain HTML plus `ds-*` classes, not Designsystemet React wrappers

**Decision.** Render Designsystemet components as native elements carrying the documented CSS
classes and data attributes in Server Components. Examples: `<button class="ds-button">`,
`<a class="ds-link">`, `<h2 class="ds-heading" data-size="md">`, `<div class="ds-card">`,
`<details class="ds-details">`, `<dialog class="ds-dialog">`, `<table class="ds-table">`.

Stop importing `@digdir/designsystemet-react` in employee-facing code. There is one exception:
a component may import it where the React wrapper adds behaviour that native HTML cannot. None is
needed at present.

**Rationale.**
- In 1.18, **every** React component file, even `Heading`, `Paragraph`, `Card` and `Alert`,
  starts with `'use client'`. So each `<Heading>` in a Server Component becomes a client
  reference, which means hydration and shipped JS for static text.
- The CSS package styles plain elements completely, and its classes are the documented contract.
- This is the user's "plain HTML and CSS where possible" taken literally.
- It also removes the 017 RSC gotcha: `Dialog.Block` is `undefined` server-side.

**Alternatives considered.** *Keep the React wrappers.* Rejected: the extra JS buys nothing for
static content.

## R3 — Load `@digdir/designsystemet-web` once, as progressive enhancement

**Decision.** Add one tiny client module, `components/DesignsystemetWeb.tsx`, that only does
`import '@digdir/designsystemet-web'`, and mount it once in `(app)/layout.tsx` and the signin page.
Declare `@digdir/designsystemet-web@1.18.0` as a direct dependency. It is already installed as a
transitive dependency of `-react`.

**Rationale.**
- `-web` is Designsystemet's framework-free behaviour layer. It provides:
  - the Invoker Commands polyfill (`command`/`commandfor`) for dialogs in browsers that lack it;
    017 relied on this through `-react`;
  - card click delegation (`data-clickdelegatefor`);
  - the `ds-field` id wiring.
- All of these degrade gracefully: without JS, the link in the card heading still works and
  native `<dialog>` still works where Invoker Commands are native.
- Today `-web` loads only on pages that happen to import a React component. Dropping `-react`
  would silently lose the polyfill.

**Alternatives considered.** *No JS at all.* Rejected: it would break the subscriptions dialogs in
Safari and Firefox versions without Invoker Commands.

## R4 — Typography: Inter through `--ds-font-family`, Designsystemet scale

**Decision.**
- Keep `next/font/local` Inter (`--font-kihub-ui`, renamed `--font-inter`).
- Set `--ds-font-family: var(--font-inter), system-ui, sans-serif` in `styles/app.css`.
- All text uses `ds-heading` / `ds-paragraph` `data-size`, or `--ds-heading-*` / `--ds-body-*`
  tokens.
- Delete `kihub-fonts.css`.
- The `body` font size comes from Designsystemet's `data-size="md"` rem scale, so it is no longer
  a fixed 18px.

Size mapping, so the hierarchy stays close to today:

| Was | Becomes |
| --- | --- |
| h1 60px | `data-size="xl"` (2xl only on the frontpage hero) |
| h2 40px | `lg` |
| h3 30px | `md` |
| h4 24px | `sm` |
| card titles | `sm`/`xs` |
| lead | `ds-paragraph data-size="lg"` |
| body | `md` |
| meta | `sm` |

**Rationale.** Designsystemet tokens are rem-based (`--ds-size-unit` = `1rem·4/18·1.125`), which
satisfies FR-015 and WCAG 1.4.4.

**Eyebrows.** The uppercase eyebrows are replaced:
- above a heading, by nothing: the heading itself carries the meaning;
- or by an `sm` paragraph in `text-subtle`, sentence case, no letter-spacing.

## R5 — Clickable cards: link in heading plus `data-clickdelegatefor`

**Decision.** For content cards (news, projects, artifacts, events, learning overview):

```html
<article class="ds-card" data-clickdelegatefor="card-{id}">
  <h3 class="ds-heading"><a id="card-{id}" href>Title</a></h3>
  …
</article>
```

The whole-card `<a class="ds-card">` (Designsystemet's other documented variant) is used only for
the frontpage tiles, where the content is a short tag plus a title.

**Rationale.**
- The accessible name equals the heading (FR-009), and there is one tab stop.
- The card's underline-on-heading affordance is built into `card.css`.
- Without JS only the heading link is clickable, which is still fully operable.
- Today `NewsCard` wraps a whole card in one link, so screen readers read date, summary and image
  alt as the link name.

## R6 — Filters: GET forms with fieldset and legend, plus Designsystemet chips

**Decision.**
- Events filters (type is multi-select, form is single-select) and registry filters (type and
  tags) become `<form method="get">`.
- Each group is `<fieldset class="ds-fieldset"><legend>`.
- Each option is `<label class="ds-chip"><input type="checkbox|radio" name value checked></label>`.
- The form has a `ds-button` "Bruk filter" submit and a `ds-link` "Nullstill".
- Hidden inputs keep the other URL params (view, q).
- Query-param names are unchanged, so existing links and the `events-view` / `registry-view`
  parsers keep working.

**Rationale.**
- Native controls give role, state and group name for free (FR-014, US4).
- Chips show the checked state with a check mark and a border, not colour alone.
- It works without JS (SC-004 of 012), and the URL stays shareable.

**Alternatives considered.**
- *Links with `aria-current`.* Rejected: they still carry no selected/unselected state for a
  multi-select.
- *Auto-submit on change.* Rejected: it needs a client component, and auto-submitting causes
  context changes on input (WCAG 3.2.2).

## R7 — Dark surfaces through `data-color-scheme="dark"`

**Decision.**
- The footer and the subscriptions card set `data-color-scheme="dark"` and use plain role tokens
  (`--ds-color-background-default`, `--ds-color-text-default`).
- Designsystemet then flips text, border and focus tokens for that subtree.
- The subscriptions dialogs stay siblings of the card. The 017 lesson still applies, and as
  siblings they inherit the light scheme.

**Rationale.**
- The generated theme already contains a full `[data-color-scheme="dark"]` block.
- The invisible-focus-on-footer bug (dark outer ring on a dark footer) disappears, because focus
  tokens are per scheme.
- It removes the hand-written `rgba(255,255,255,.64)` text, which also failed contrast checks.

## R8 — The frontpage tiles

**Decision.**
- Each tile is an `<a class="ds-card" data-variant="tinted">` with:
  - the tag as `ds-tag`;
  - the title as `ds-heading data-size="sm"`;
  - a decorative arrow, `aria-hidden`.
- A decorative SVG shape from the Digdir design element sits in the tile's corner. The variant
  picks the shape:
  - `tinted` → a Rød `brand1` circle on an `accent` tinted card;
  - `accent` → a Gul `brand2` square on a `neutral` tinted card.
- The enum values stay unchanged.

**Rationale.**
- Text sits on a generated tinted surface with a guaranteed 4.5:1 contrast.
- The graphic colours appear only as graphics (FR-002, FR-005), in the design element's own
  vocabulary.
- The variants stay distinct by both shape and surface.

**Superseded 2026-10-21 (digdir.no follow-up).** The tiles are now plain tinted cards on the light
Rød (`tinted`) and Gul (`accent`) tints, with no corner shapes. This follows digdir.no's
"Hva skal du gjøre?" cards, whose colours are exactly Designsystemet's brand `surface-tinted` and
`surface-hover` tokens (e.g. `#F8E7C1`). The contribute banner uses the Blå tint, and the
next-event date block the Gul tint.

## R9 — Rich text (Payload Lexical and Markdown)

**Decision.**
- Payload `<RichText>` gets JSX converters that put Designsystemet classes on headings,
  paragraphs, lists, links, tables and blockquotes:
  - `ds-heading` with a `data-size` derived from the level;
  - `ds-paragraph`, `ds-list`, `ds-link`, `ds-table`.
- Content `h1` is demoted to `h2`, so the page keeps one h1 (FR-012).
- `Markdown.tsx` gets the same mapping through react-markdown's `components` prop, and drops
  `ds-prose`, which does not exist.
- One shared helper, `lib/ds-richtext.tsx`, holds the class and level mapping, so news, events,
  projects and learning all use it.
- English READMEs get `lang="en"` on their container (FR-016).

## R10 — Event-type colours

**Decision.**
- Event types render as `ds-tag` with a data-color:
  - webinar `info`;
  - verksted `warning`;
  - kurs `success`;
  - konferanse `danger`;
  - internt `neutral`.
- The type name is always in text.
- Calendar dots on mobile add a visually hidden type label, and the entry's accessible name
  includes date and type.
- The 012 `--ev-cat-*` aliases are re-pointed at `--ds-color-{color}-*`.

**Rationale.** This keeps the 012 encoding, which users already know. Designsystemet's tags
guarantee contrast. Brand colours are not used for text tags (FR-002).

## R11 — Header, footer and navigation

**Decision.**
- **Header.** Kitt logo and "KI HUB" wordmark top-left, with clear space equal to the logo
  height. A `nav aria-label="Hovedmeny"` list of `ds-link data-color="neutral"`, where
  `aria-current="page"` is shown with a 2px underline bar, not colour alone. "Søk" moves inside
  the nav list. The user cluster has the name, an Admin `ds-link`, and a "Logg ut"
  `button.ds-button data-variant="secondary" data-size="sm"`.
- **Mobile.** `SiteNav` stays the single existing client component, but its toggle becomes
  `ds-button data-variant="tertiary"` with a fixed label "Meny" and `aria-expanded`.
- **Footer.** Dark scheme (R7), contact list and links as `ds-link`, `aria-labelledby` headings
  for the two lists.
- **Skip link.** `<a class="ds-skip-link" href="#main-content">Hopp til hovedinnhold</a>` is the
  first child of `<body>`.
- **Main.** `(app)/layout.tsx` owns `<main id="main-content" tabindex="-1">`. Pages render a
  `<div>` or sections instead of their own `<main>`.

**Rationale.** Designsystemet has no header or footer pattern (GitHub #1672/#1673/#1510 are still
open). Digdir's only rules are logo top-left with clear space, which these decisions follow.

## R12 — Phasing: a page-by-page migration that needs no flag day

**Decision.**
- **Slice 0: foundation.** Theme, the `-web` loader, layout (skip link and main), `app.css` with
  layout primitives on `--ds-*`, header, footer and nav.
- **Interim bridge.** During migration, `kihub-ds-bridge.css` stays and is re-pointed at the new
  tokens, so unconverted pages keep rendering. It and `styles/kihub/` are deleted in the final
  slice.
- **Slices 1–6, one per route group:**
  1. frontpage;
  2. news and projects;
  3. events;
  4. learning;
  5. registry, artifacts and sign-in;
  6. /bidra.
- **Slice 7: cleanup.** Delete the kihub layer, the bridge and `kihub-fonts.css`; amend the
  constitution; update the README; run the full accessibility sweep.

**Rationale.** Each slice can be reviewed and merged on its own, which is what "page by page"
means for the user.

## R13 — Verification without new heavy dependencies

**Decision.**
- **Unit tests.** Keep vitest unit tests for pure helpers: the rich-text level and class mapping,
  filter href and form-state builders, and the tile variant mapping.
- **Accessibility.** Check in the browser pane:
  - axe-core 4.10.x (pinned, from cdn.jsdelivr.net/npm) injected into the local dev page;
  - keyboard pass;
  - heading/landmark dump via `read_page`;
  - 24px default-font check;
  - 320px viewport check.
- **Static gates.** Lint, `tsc --noEmit` and `next build` (see quickstart).

**Rationale.** The repo has no DOM rendering or E2E harness. Adding Playwright for one feature
would be out of proportion, and axe in the real browser covers what jsdom cannot.

**Blocker.** The local environment needs `apps/web/.env` and a local Postgres, both currently
missing on this machine. Visual and axe checks cannot run until they exist.

## R14 — Constitution amendment: v3.2.0 to v4.0.0 (MAJOR)

**Decision.** Rewrite the Design System constraint:

1. **Theme.** The visual profile is Digdir's official Designsystemet theme, defined in
   `designsystemet.config.json` and generated with `theme:build`. Values follow Digdir's profile
   at design.digdir.no, not a separate design project.
2. **Components.** Use Designsystemet components and patterns wherever one exists. Render them as
   native HTML with Designsystemet CSS classes by default. Use React wrappers only where they add
   behaviour, plus `@digdir/designsystemet-web` for progressive enhancement.
3. **Custom components.** These are allowed only where Designsystemet has no equivalent, such as
   header, footer and calendar. They use `--ds-*` tokens only: no hard-coded colour, type,
   spacing, radius or shadow.
4. **Overrides.** Restyling or forking Designsystemet primitives stays prohibited, except through
   their documented `--dsc-*` component variables.
5. **Accessibility.** WCAG 2.2 AA is a release gate for employee-facing UI.

The Payload admin exemption stays.

**Rationale.** This removes and redefines a mandated layer (the kihub token and component layer,
and the design-project sync), so the versioning policy requires a MAJOR bump. The user approved
the change on 2026-10-21.
