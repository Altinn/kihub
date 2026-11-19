# Proposed constitution amendment (NOT applied — needs approval)

**From** 4.3.0 **to** 4.4.0 (MINOR: a clarification of an existing module, no principle removed).
`.specify/memory/constitution.md` is **unchanged** by this proposal.

## Why

Feature 029 puts an externally authored, INTERN static slide deck inside KI Hub. It is not Payload-authored
native content (Principle II) and not an artifact (Registry principles do not apply). The repository and
the production image are public, so such a publication must live in private storage and never in git or
the image. The plan records this as a documented exception; a one-sentence note under **Pages** would make
it a rule the next such request can rely on instead of re-arguing.

## Proposed text — under **Product Modules → Pages**, after the sentence ending «…Registry principles (I, III, IV, V, VI) do not apply to it.»

> A page may embed an externally authored static publication (for example an internal slide deck). Such
> a publication is served only to signed-in employees from private storage through the application; it
> MUST NOT be committed to the repository or included in the container image, and it is not editable in
> KI Hub. A publication classified INTERN is hidden behind an operator-controlled release switch until
> its owner confirms.

## Sync Impact Report lines (to add on approval)

- Version change: 4.3.0 → 4.4.0.
- Modified: Product Modules → Pages (embedded publications).
- No template changes required (plan/spec/tasks templates are unaffected).
- Follow-up: none.

## Also recorded in the plan (no amendment needed)

- Design System: the page around the deck is Designsystemet-compliant; the deck itself is frozen vendor
  content with its own design-system copy and typeface.
- WCAG: the deck's text does not scale with browser zoom (its README); surfaced on the page, not worked
  around.
