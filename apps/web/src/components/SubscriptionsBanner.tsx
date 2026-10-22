import { InformationSquareIcon } from '@navikt/aksel-icons';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { dsConverters } from '@/lib/ds-richtext-converters';
import type { SubscriptionsContent } from '@/lib/site-content-defaults';

/**
 * 011 US1, redesigned in 017 (Altinn/kihub#144) — the "Tilgjengelige abonnementer" banner
 * (contracts/subscriptions-banner-ui.md): dark card with kicker, heading, description, one chip
 * per subscription and a request-access CTA. Every chip and the CTA open a real modal dialog.
 *
 * 026: all plain Designsystemet HTML — no React wrappers, so no client components:
 * - the card is a `ds-card` in a dark-scheme subtree (`data-color-scheme="dark"`), so its text,
 *   chip borders and focus ring all use Designsystemet's dark tokens (no hand-picked rgba);
 * - triggers are `button.ds-chip` / `button.ds-button`, opening their dialog with the native
 *   `command="show-modal"`/`commandfor` Invoker Commands (polyfilled by designsystemet-web,
 *   loaded once in the shell);
 * - dialogs are native `dialog.ds-dialog` with Designsystemet's empty close button
 *   (`command="close"`, icon drawn by its CSS) and an h2.
 * The dialogs stay SIBLINGS of the dark card (017): a `<dialog>` inherits styles from its DOM
 * position even though it paints in the top layer, so nesting it would make it dark too.
 */

// Dialog bodies sit under the dialog's own h2, so their headings start at h3.
const dialogConverters = dsConverters({ minHeadingLevel: 3 });

function SubscriptionDialog({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children?: React.ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <dialog id={id} className="ds-dialog app-subscriptions__dialog" aria-labelledby={headingId}>
      <button
        type="button"
        className="ds-button"
        data-variant="tertiary"
        data-color="neutral"
        data-icon="true"
        command="close"
        commandfor={id}
        aria-label="Lukk dialogvindu"
        suppressHydrationWarning
      />
      <h2 id={headingId} className="ds-heading" data-size="sm">
        {heading}
      </h2>
      {children}
    </dialog>
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
  }));
  const ctaDialogId = 'fp-subscriptions-request-access';

  return (
    <>
      <section
        className="ds-card app-subscriptions"
        data-color-scheme="dark"
        data-color="neutral"
        aria-labelledby="fp-subscriptions-heading"
      >
        {subscriptions.eyebrow ? (
          <p className="ds-paragraph app-kicker" data-size="sm">
            {subscriptions.eyebrow}
          </p>
        ) : null}
        <h2 id="fp-subscriptions-heading" className="ds-heading" data-size="sm">
          {subscriptions.heading}
        </h2>
        {subscriptions.description ? (
          <p className="ds-paragraph app-subscriptions__description">{subscriptions.description}</p>
        ) : null}

        {chipDialogs.length ? (
          <ul className="app-subscriptions__list">
            {chipDialogs.map(({ chip, dialogId }) => (
              <li key={chip.name}>
                <button
                  type="button"
                  className="ds-chip"
                  command="show-modal"
                  commandfor={dialogId}
                  aria-haspopup="dialog"
                  // designsystemet-web's invoker-commands polyfill augments these attributes
                  // client-side on unsupporting browsers.
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
          className="ds-button"
          data-variant="secondary"
          command="show-modal"
          commandfor={ctaDialogId}
          aria-haspopup="dialog"
          suppressHydrationWarning
        >
          <InformationSquareIcon aria-hidden />
          {subscriptions.requestAccess.label}
        </button>
      </section>

      {chipDialogs.map(({ chip, dialogId }) => (
        <SubscriptionDialog key={chip.name} id={dialogId} heading={chip.name}>
          {chip.description ? (
            <div className="app-richtext">
              <RichText data={chip.description} converters={dialogConverters} />
            </div>
          ) : null}
        </SubscriptionDialog>
      ))}
      <SubscriptionDialog id={ctaDialogId} heading={subscriptions.requestAccess.label}>
        {subscriptions.requestAccess.body ? (
          <div className="app-richtext">
            <RichText data={subscriptions.requestAccess.body} converters={dialogConverters} />
          </div>
        ) : null}
      </SubscriptionDialog>
    </>
  );
}
