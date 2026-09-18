import { Dialog, DialogBlock } from '@digdir/designsystemet-react';
import type { SubscriptionsContent } from '@/lib/site-content-defaults';

/**
 * 011 US1, redesigned in 017 (Altinn/kihub#144) — the "Tilgjengelige abonnementer" banner
 * (contracts/subscriptions-banner-ui.md): dark inverted card with eyebrow, serif heading,
 * description, pill-shaped subscription chips and a request-access CTA. Every chip and the CTA
 * open a real modal (Designsystemet's `Dialog`, the sanctioned primitive for "dialogs" per the
 * constitution's Technology & Architecture Constraints) instead of doing nothing, fixing the old
 * false-affordance `<span>`s. Trigger buttons are plain, kihub-styled `<button>`s — NOT
 * Designsystemet's `Button` — because the approved dark/pill look can't be expressed without
 * restyling that primitive, which the constitution prohibits; they open their `Dialog` via the
 * native declarative `command`/`commandfor` attributes (see
 * `src/types/dom-invoker-commands.d.ts`), so no client component/state is needed here either.
 * The `Dialog`s are rendered as SIBLINGS of the dark card, not nested inside it — a native
 * `<dialog>` stays in its DOM position for CSS inheritance purposes even though it *paints* in
 * the browser's top layer, so nesting it inside `.kihub-card--inverted` would inherit that card's
 * white-on-dark text colors into the (light, Designsystemet-default) dialog and render invisible
 * white-on-white text.
 */

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      className="fp-subscriptions__icon"
    >
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
      <path d="M8 7.4v4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function SubscriptionsBanner({
  subscriptions,
}: {
  subscriptions: SubscriptionsContent;
}) {
  const chipDialogs = subscriptions.chips.map((chip, index) => ({
    chip,
    dialogId: `fp-subscriptions-chip-${index}`,
    headingId: `fp-subscriptions-chip-${index}-heading`,
  }));
  const ctaDialogId = 'fp-subscriptions-request-access';
  const ctaHeadingId = `${ctaDialogId}-heading`;

  return (
    <>
      <section
        className="kihub-card kihub-card--inverted"
        aria-labelledby="fp-subscriptions-heading"
      >
        <div className="kihub-stack" style={{ gap: 'var(--kihub-space-2)', maxWidth: '60ch' }}>
          {subscriptions.eyebrow ? (
            <p className="kihub-eyebrow" style={{ margin: 0 }}>
              {subscriptions.eyebrow}
            </p>
          ) : null}
          <h2 id="fp-subscriptions-heading" className="kihub-h3">
            {subscriptions.heading}
          </h2>
          {subscriptions.description ? (
            <p className="kihub-prose" style={{ margin: 0 }}>
              {subscriptions.description}
            </p>
          ) : null}
        </div>

        {chipDialogs.length ? (
          <ul className="fp-subscriptions__list">
            {chipDialogs.map(({ chip, dialogId }) => (
              <li key={chip.name}>
                <button
                  type="button"
                  command="show-modal"
                  commandfor={dialogId}
                  className="fp-subscriptions__chip kihub-focusable"
                  aria-haspopup="dialog"
                  // designsystemet-web's invoker-commands polyfill augments this attribute
                  // client-side on unsupporting browsers; we set it ourselves so there's nothing
                  // to reconcile (same reasoning as Designsystemet's own Button/DialogTrigger).
                  suppressHydrationWarning
                >
                  {chip.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          command="show-modal"
          commandfor={ctaDialogId}
          className="fp-subscriptions__cta kihub-focusable"
          aria-haspopup="dialog"
          suppressHydrationWarning
        >
          <InfoIcon />
          {subscriptions.requestAccess.label}
        </button>
      </section>

      {chipDialogs.map(({ chip, dialogId, headingId }) => (
        <Dialog
          key={chip.name}
          id={dialogId}
          aria-labelledby={headingId}
          className="fp-subscriptions__dialog"
        >
          <DialogBlock>
            <h3 id={headingId} className="kihub-h3">
              {chip.name}
            </h3>
            {chip.description ? (
              <p className="kihub-prose" style={{ marginTop: 'var(--kihub-space-2)' }}>
                {chip.description}
              </p>
            ) : null}
          </DialogBlock>
        </Dialog>
      ))}
      <Dialog id={ctaDialogId} aria-labelledby={ctaHeadingId} className="fp-subscriptions__dialog">
        <DialogBlock>
          <h3 id={ctaHeadingId} className="kihub-h3">
            {subscriptions.requestAccess.label}
          </h3>
          <p className="kihub-prose" style={{ marginTop: 'var(--kihub-space-2)' }}>
            {subscriptions.requestAccess.body}
          </p>
        </DialogBlock>
      </Dialog>
    </>
  );
}
