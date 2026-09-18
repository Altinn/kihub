# Phase 0 Research: Genuinely interactive subscriptions banner

## R1 — Interaction mechanism: native `<details>`/`<summary>`, no client component

> **Superseded by R5.** This was the initial decision and shipped first; direct user review against
> the issue's own inspiration image asked for a real modal instead (a dropdown that could visually
> break the page layout was explicitly called out as undesirable) and for the visual design to match
> that image more closely. Kept here as the historical record of why `<details>` was chosen first —
> most of the reasoning (zero-JS-by-default, no new client component, reusing an established
> codebase pattern) carried forward into R5's replacement mechanism.

**Decision**: Implement both the tool-chip explanations and the "Hvordan bestille tilgang?"
instructions as native HTML `<details>`/`<summary>` disclosures, rendered entirely in the existing
server component `SubscriptionsBanner.tsx`. No client component, no `useState`, no new JS.

**Rationale**: This is an established, deliberate precedent in this codebase, not a novel choice.
`LearningNav.tsx` (014) uses exactly this pattern for its category-group disclosures, with the
comment: *"A SERVER component built on native `<details>`/`<summary>`, not a client component...
expanding and collapsing work with JavaScript disabled."* `LearningShell`'s mobile nav disclosure
(`lp-shell__disclosure` in `portal.css`) does the same. The spec's FR-008/FR-009 (keyboard-operable,
works with JS disabled) are native `<details>` behavior for free — no ARIA wiring, no focus
management code, no hydration cost. This keeps the site's client-component count at exactly the
three it has today (`SearchBar`, `CopyButton`, `SiteNav`) — `SiteNav`'s own doc comment explicitly
says its client-component approach is used only because it *cannot* satisfy the no-JS requirement,
which does not apply here.

**Alternatives considered**:
- *Client-side modal/popover* (`useState` + conditional render, or the CSS `popover` attribute) —
  rejected: adds a fourth client component, and native `<details>` already satisfies every
  acceptance scenario (open/close, keyboard, no-JS) with zero JS.
- *Dedicated page per tool* (e.g. `/verktoy/github-copilot`) — rejected: the spec explicitly treats
  "reveals... appears" as satisfiable in place (Assumptions section); a new route per tool is a new
  page/content-type for what the issue calls a "short explanation," disproportionate under
  Constitution Principle VII (Start Simple/YAGNI), and it would separate the CTA from the pills it
  needs to visually sit beside (FR-006).
- *Native `title`/`aria-describedby` tooltip* — rejected: browser default tooltips are not
  reliably keyboard-triggerable across browsers and can't hold multi-sentence body copy legibly.

## R2 — Visual hierarchy: reuse `.kihub-btn--secondary` / `.kihub-btn--primary`, style `<summary>`

**Decision**: Style each tool chip's `<summary>` with the existing `kihub-btn kihub-btn--secondary
kihub-focusable` classes (transparent background, subtle border — already exactly "pill/badge,
subtle border, no fill" per the issue) and the "Hvordan bestille tilgang?" `<summary>` with `kihub-btn
kihub-btn--primary kihub-focusable` (accent background — already exactly the "heavier CTA" look).
A small `::after` chevron (▾/▴, flipping on `[open]`) signals expand/collapse, matching the
`lp-nav__group-title` / `lp-shell__disclosure-title` precedent in `portal.css`. The default marker
triangle is removed the same established way: `list-style: none` on the summary plus
`::-webkit-details-marker { display: none; }` for the remaining WebKit case.

**Rationale**: Constitution "Technology & Architecture Constraints" #3 requires custom components to
style exclusively via the shared token layer — `.kihub-btn--secondary`/`--primary` already ARE that
token-layer expression of exactly the two visual weights (subdued vs. heavier/primary) the issue
asks for (FR-006). Inventing new "pill" CSS would duplicate existing tokens and risk drifting from
them; reusing the existing classes on a `<summary>` element (a real, interactive, focusable control)
instead of the old plain `<span>`/`<a>` also directly fixes the false-affordance bug, because the
button-like appearance now belongs to an element that generically does something on click.

**Alternatives considered**:
- *New dedicated `.fp-chip`/`.fp-cta` classes* — rejected: would duplicate `.kihub-btn--secondary`/
  `--primary` token values instead of reusing them (violates the "no hardcoded colors... reuse the
  token layer" constraint) for no visual gain.
- *Designsystemet's own `Button`/`Popover` React components* — rejected: those are client
  components requiring `'use client'` boundaries; the constitution names them as the default for
  "behavioral/interactive primitives," but a static disclosure toggle is adequately, and more
  simply, expressed as semantic HTML per R1 — no primitive is being restyled or forked.

## R3 — Content model: extend the existing `frontpage.subscriptions` group, no new collection

**Decision**: Add `description` (short text) to each `Chip` in the `chips` array, and add a new
`requestAccess: { label, body }` group alongside `eyebrow`/`heading`/`description`/`chips` inside
the existing `subscriptions` group on the `frontpage` global. Drop `Chip.href`, which becomes dead
weight once chips no longer navigate anywhere (see R1) — no defaults ever set it, and Payload's
"Structure" admin UI would otherwise expose a field that visibly does nothing in the new banner.

**Rationale**: Everything the spec requires (FR-007: editors edit heading/description/tool
name+explanation/request-access text without a deploy) is already the exact shape the `subscriptions`
group provides today — this is additive fields on an existing group + an existing array, not a new
content type. Constitution Principle VII (Start Simple) and the precedent of every other
`site-content-defaults.ts` addition (e.g. `hero.primaryCta`/`secondaryCta` are already a
`{label, href}` `Cta` shape) both point at extending in place rather than introducing a `Cta`-like
`href`-based navigation for something that (R1) intentionally doesn't navigate.

**Alternatives considered**:
- *New `subscription-tools` collection* — rejected: the spec's own Assumptions section rules this
  out ("No new page routes or CMS collections are required"); a handful of tool entries with a name
  + short text has no need for Payload's collection machinery (versioning, access control per-doc)
  that a group/array field on an existing global doesn't already provide.
- *Keep `Chip.href` alongside the new `description`* — rejected: with chips no longer rendered as
  links (R1), a live `href` field would be a second, contradictory way to make a chip "actionable"
  that the UI no longer honors — exactly the kind of unused-but-present field the project's dead-code
  conventions avoid elsewhere.

## R4 — Migration shape and the known generator quirk

**Decision**: Generate the migration with `pnpm --filter web migrate:create` against a scratch DB
(`kihub_migtest_017`, following the 014/015/016 precedent of never running `payload migrate` against
the push-mode local dev DB), then hand-verify the generated `up`/`down` before committing it.

**Rationale**: Every native-content feature since 014 has needed a migration for its schema
additions, and every one of them hit the same generator bug in `down`: Payload's migration generator
emits an unconditional `DROP CONSTRAINT`/`DROP INDEX` after a `DROP TABLE ... CASCADE` has already
removed that constraint/index, aborting the transaction — fixed by hand-patching the specific
statements with `IF EXISTS` (`20260810_090312_learning_pages`, `20260812_131624_agents_multisource`,
`20260911_101007_projects`). This feature's schema change is narrower than those (two `ALTER TABLE
... ADD COLUMN` statements — `frontpage_subscriptions_chips.description` and
`frontpage.subscriptions_request_access_label`/`subscriptions_request_access_body` — plus their
`down` `DROP COLUMN`s; no new table, so no CASCADE-vs-named-drop conflict is expected). The migration
is still generated and verified up+down on a scratch DB rather than assumed safe, exactly as prior
features did, because the safe case has not been true every time.

**Alternatives considered**:
- *Skip a migration, rely on Payload's push-mode dev sync* — rejected: every feature since 014 (the
  first to add schema, i.e. the first not covered by the 007/009/011 "no migrations practice" note)
  has shipped a real migration; this repo's production deploy path is migration-based, and skipping
  one here would leave prod's `frontpage` table schema silently behind code.

## R5 — Revision (post-review): Designsystemet `Dialog` modal, dark pill styling, replacing R1's `<details>`

**Decision**: After the feature first shipped with R1's `<details>`/`<summary>` inline disclosures,
direct user review against the issue's own attached inspiration image
(`redesignet_banner_stottede_abonnementer_v2.html`, screenshotted into the issue) asked for two
concrete changes: (1) match that image's visual design — a dark ("inverted") card, fully pill-shaped
chip buttons, and an icon-led request-access button — rather than the light tinted card carried over
from 011; (2) replace the inline dropdown-style disclosure (which grows the card and can shift page
layout) with a real modal, explicitly citing that Designsystemet already ships one. Both are now
implemented:

- **Modal**: `Dialog`/`DialogBlock` from `@digdir/designsystemet-react`, one per chip plus one for
  the CTA, each opened by a plain `<button command="show-modal" commandfor="DIALOG-ID">` — the
  native HTML Invoker Commands API, which Designsystemet's own docs present as the primary,
  TriggerContext-free usage pattern (`dialog.d.ts`'s JSDoc example). This is the same "declarative,
  no imperative JS" spirit as R1's `<details>`: no `useState`, no click handler, no new client
  component of *our own* (Designsystemet's `Button`/`Dialog` are themselves `'use client'`, but a
  Server Component may still render them as leaves without becoming a Client Component itself — see
  existing precedent: `AgentCardPanel.tsx`, `ArtifactCard.tsx` etc. already do this).
- **Trigger styling**: the chip/CTA triggers are plain `<button>` elements styled via kihub tokens
  (`.fp-subscriptions__chip`/`__cta` in `portal.css`) — NOT Designsystemet's `Button` component —
  because the approved dark/pill look cannot be expressed by `Button`'s own variants without
  restyling it, which the constitution's Technology & Architecture Constraints explicitly prohibit
  ("Restyling or forking Designsystemet primitives remains PROHIBITED... build a custom component on
  the tokens instead"). The `Dialog` itself IS used as-is (its default light chrome, close button,
  focus trap, `::backdrop`) since that behavior — not its visual skin — is what "use the design
  system's modal" was asking for, and it is exactly the "complex widget" case the constitution names
  Designsystemet as the default choice for.
- **Dark card**: new `.kihub-card--inverted` variant (`background: var(--kihub-surface-inverted)`,
  `color: var(--kihub-text-inverted)`), reusing tokens that already existed for this exact purpose
  (`--kihub-surface-inverted`/`--kihub-text-inverted`, previously only used by `.kihub-tag--on-accent`
  and `.kihub-tile--accent`) — no new hardcoded colors. Subdued text-on-dark (eyebrow, description)
  uses `rgba(255,255,255,…)`, following the precedent `.kihub-tag--on-accent` already set for
  "translucent white on a colored/dark surface" where no dedicated token exists.
- **Info icon**: a small hand-rolled inline `<svg>` (circle + "i"), matching the existing
  `HeroIllustration` precedent in `FrontpageHero.tsx` for decorative/presentational SVG rather than
  pulling in an icon package for one glyph (Constitution Principle VII, Start Simple/YAGNI — no icon
  library is installed anywhere in this app today).

**Two bugs hit and fixed while wiring this up, both from the same root cause (a client-reference
proxy/CSS-inheritance boundary that a `<details>`-only feature never needed to cross)**:
1. `<Dialog.Block>` (attribute access on the imported `Dialog`) rendered as `undefined` at RSC
   render time — `Dialog` is a Client Component; accessing a static sub-property (`.Block`) on its
   server-side "client reference" placeholder isn't supported the way the plain function itself is.
   Fixed by importing `DialogBlock` as its own named export instead (`export { DialogBlock } from
   './components/dialog/dialog-block.js'` — confirmed present in the package) and using
   `<DialogBlock>` directly.
2. Dialog content rendered completely invisible (white text on the dialog's white background) when
   `<Dialog>` was nested inside `<section className="kihub-card--inverted">`: a native `<dialog>`
   stays in its original DOM position for CSS cascade/inheritance purposes even though it *paints*
   in the browser's top layer, so `.kihub-card--inverted .kihub-h3 { color: var(--kihub-text-inverted) }`
   matched the dialog's own (light-themed) heading too. Fixed by rendering all `<Dialog>` elements as
   siblings of the card (after `</section>`, via a Fragment) instead of nesting them inside it.

**New TypeScript augmentation**: `@types/react` 19.2.17 does not yet type `command`/`commandfor` on
plain intrinsic `<button>` (only Designsystemet's own `ButtonProps` declares them). Rather than cast
or `as any` at every call site, `apps/web/src/types/dom-invoker-commands.d.ts` does one
`declare module 'react' { interface ButtonHTMLAttributes<T> { command?: string; commandfor?: string }
}` — a standard TS declaration-merging pattern for a very new HTML attribute, matching how
Designsystemet's own `ButtonProps` type declares the same pair.

**Hydration note**: `@digdir/designsystemet-web` (the Invoker Commands polyfill, pulled in as a side
effect of importing `Dialog`) augments any `command`/`commandfor` element client-side with
`aria-haspopup="dialog"`. Rather than suppress the resulting hydration warning blindly, our trigger
buttons set `aria-haspopup="dialog"` themselves in the SSR'd markup (so client and server already
agree) AND carry `suppressHydrationWarning`, matching exactly the belt-and-suspenders pattern
Designsystemet's own `Button`/`DialogTrigger` components use for the identical reason (see their
source comment: *"Might get augmented through designsystemet-web with aria-haspopup etc."*).

**Trade-off knowingly accepted (updates spec.md FR-009)**: R1's `<details>` worked with JavaScript
fully disabled in every browser, no exceptions. The Invoker Commands API is native (zero JS) only in
browsers that implement it (verified: Chrome/Chromium 152, used in this session's browser-automation
harness, supports it natively — `'command' in HTMLButtonElement.prototype` is `true`); a browser
without native support depends on `designsystemet-web`'s polyfill JS to make `command`/`commandfor`
work at all. This is a deliberate, informed trade-off — the modal behavior and the
`@digdir/designsystemet-react` dependency were both explicitly requested — not an oversight.

**Verified**: full test suite still 360/360 (no test asserted the previous `<details>` DOM shape);
`tsc --noEmit` and `eslint` clean; live in-browser click-through confirmed both chip dialogs and the
CTA dialog open with correct content, close via the × button, and (per the same synthetic-CDP-key
limitation already noted for R1's Enter/Space) Escape-to-close and click-to-open via the automated
`computer` tool's synthetic key/coordinate events were not independently confirmed as reliable in
this harness — mouse-driven open/close was.
