# Contract: `SubscriptionsBanner` interaction & markup

Governs `apps/web/src/components/SubscriptionsBanner.tsx`. Server component; renders
Designsystemet's `Dialog`/`DialogBlock` (Client Components) as leaves, so the file itself stays a
Server Component (no `'use client'`, no new client component of our own — see research.md R5).

> Revised after initial implementation: shipped first with native `<details>`/`<summary>` inline
> disclosures (research.md R1/R2); direct user review against the issue's own inspiration image
> asked for a real modal and the dark/pill visual design instead. This contract describes what
> shipped. research.md R1/R2 remain as the historical record of the superseded approach.

## Structure

```tsx
<>
  <section className="kihub-card kihub-card--inverted" aria-labelledby="fp-subscriptions-heading">
    {/* eyebrow / heading / description */}

    <ul className="fp-subscriptions__list">
      {subscriptions.chips.map((chip, index) => (
        <li key={chip.name}>
          <button
            type="button"
            command="show-modal"
            commandfor={`fp-subscriptions-chip-${index}`}
            className="fp-subscriptions__chip kihub-focusable"
            aria-haspopup="dialog"
            suppressHydrationWarning
          >
            {chip.name}
          </button>
        </li>
      ))}
    </ul>

    <button
      type="button"
      command="show-modal"
      commandfor="fp-subscriptions-request-access"
      className="fp-subscriptions__cta kihub-focusable"
      aria-haspopup="dialog"
      suppressHydrationWarning
    >
      <InfoIcon />
      {subscriptions.requestAccess.label}
    </button>
  </section>

  {/* Dialogs are SIBLINGS of the card, not nested inside it — see research.md R5 bug #2:
      a native <dialog> stays in its DOM position for CSS inheritance even though it paints in
      the browser's top layer, so nesting it inside .kihub-card--inverted would inherit that
      card's white-on-dark text colors into the (light, Designsystemet-default) dialog chrome. */}
  {subscriptions.chips.map((chip, index) => (
    <Dialog key={chip.name} id={`fp-subscriptions-chip-${index}`} aria-labelledby={/* heading id */ ''} className="fp-subscriptions__dialog">
      <DialogBlock>
        <h3>{chip.name}</h3>
        {chip.description ? <p className="kihub-prose">{chip.description}</p> : null}
      </DialogBlock>
    </Dialog>
  ))}
  <Dialog id="fp-subscriptions-request-access" className="fp-subscriptions__dialog">
    <DialogBlock>
      <h3>{subscriptions.requestAccess.label}</h3>
      <p className="kihub-prose">{subscriptions.requestAccess.body}</p>
    </DialogBlock>
  </Dialog>
</>
```

## Behavioral rules (spec traceability)

- **FR-001/SC-001** — every `chip` gets its own real `<button command="show-modal" commandfor=...>`
  paired with its own `<Dialog id=...>` — a click always opens that dialog. No conditional branch
  renders a non-interactive fallback (the original bug: `chip.href ? <a> : <span>`, long since
  removed).
- **FR-002** — `chip.description`, when present, renders inside the dialog body. When absent, the
  dialog still opens with just the heading — still satisfies "genuinely clickable" (spec
  Assumptions: only the no-op-click failure mode is prohibited).
- **FR-003** — closing is native `<dialog>` behavior: the `Dialog` component's built-in close button
  (`command="close"` on its own internal Designsystemet `Button`, default label "Lukk dialogvindu")
  and the Escape key (native `<dialog>` `closedby: 'closerequest'` default). No custom JS.
- **FR-004/FR-005** — `requestAccess`'s `Dialog` always renders (unconditional in the component), and
  its body is plain text inside a `<p>` — no form, no button that submits/purchases/links to an order
  flow. A `mailto:` link MAY appear inside the body text itself without violating FR-005 (composing
  an email is the employee's own subsequent action, not something the click itself does).
- **FR-006** — `.fp-subscriptions__chip` (pill: `border-radius: var(--kihub-radius-full)`) vs.
  `.fp-subscriptions__cta` (rectangular: `border-radius: var(--kihub-radius)`, with a leading info
  icon) is the visual-hierarchy mechanism — both share the same subdued outline-on-dark treatment,
  distinguished by shape, the icon, and standing on its own row below the chips, matching the shape
  distinction in the issue's own inspiration image.
- **FR-008** — the trigger `<button>`s are natively focusable/in the tab order; `Dialog` traps focus
  while open (native `showModal()` behavior) and autofocuses its first `[autofocus]` element or
  close button. `.kihub-focusable`'s focus-visible ring is used for the triggers, with
  `--kihub-focus-outer`/`--kihub-focus-inner` inverted locally on `.fp-subscriptions__chip`/`__cta`
  only (not on `.kihub-card--inverted` itself) so the override never leaks into the (light-themed)
  dialog content.
- **FR-009** — native in browsers that implement the HTML Invoker Commands API (verified: Chrome/
  Chromium 152); depends on `@digdir/designsystemet-web`'s polyfill JS in browsers that don't yet
  (research.md R5, "Trade-off knowingly accepted").
- **FR-010** — when `subscriptions.chips` is empty, `<ul className="fp-subscriptions__list">` is
  omitted (`subscriptions.chips.length ? <ul>...</ul> : null`, unchanged guard) — heading/
  description/CTA still render.
- **FR-011** — this component does not touch `FrontpageTile`/`content.tiles` at all.

## CSS contract (`portal.css`, `fp-subscriptions__*` + `kihub-card--inverted`)

- `.kihub-card--inverted` — new `.kihub-card` variant: `background: var(--kihub-surface-inverted)`,
  `color: var(--kihub-text-inverted)`, plus scoped overrides for `.kihub-eyebrow`/`.kihub-h3`/
  `.kihub-prose` *within* it (not global) so this card's text reads correctly on the dark ground
  without changing those classes' behavior anywhere else on the site.
- `.fp-subscriptions__chip`, `.fp-subscriptions__cta` — transparent background,
  `border: 1px solid rgba(255,255,255,.32)`, `color: var(--kihub-text-inverted)`; chip gets
  `border-radius: var(--kihub-radius-full)` (full pill), cta gets `border-radius: var(--kihub-radius)`
  plus `display: inline-flex` for the icon+label pairing. Both locally override
  `--kihub-focus-outer`/`--kihub-focus-inner` to invert the focus ring on the dark surface.
- `.fp-subscriptions__icon` — sizing/alignment only for the hand-rolled info `<svg>`; no new color
  (uses `currentColor`, resolving to the button's own `--kihub-text-inverted`).
- `.fp-subscriptions__dialog.ds-dialog { max-width: 420px; }` — the only override to Designsystemet's
  own `Dialog` chrome; its default light theme, close button, shadow and `::backdrop` are otherwise
  used as-is (per the constitution's "don't restyle/fork primitives" constraint).
- No new hardcoded colors beyond the `rgba(255,255,255,…)` translucency pattern, which mirrors the
  existing `.kihub-tag--on-accent` precedent for "subdued white on a dark/colored surface" where no
  dedicated token exists.
