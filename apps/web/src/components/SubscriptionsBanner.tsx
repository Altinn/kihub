import type { SubscriptionsContent } from '@/lib/site-content-defaults';

/**
 * 011 US1 — the "Tilgjengelige abonnementer" banner (contracts/frontpage-read.md): tinted
 * full-width card with eyebrow, serif heading, description and the subscription chips.
 * Content is editor-managed; a chip renders as a link only when it has a destination.
 */

const chipStyle: React.CSSProperties = {
  border: '1px solid var(--kihub-accent-border)',
  background: 'var(--kihub-bg)',
  color: 'var(--kihub-text)',
  font: '400 14px var(--kihub-font-ui)',
  padding: '7px 12px',
  borderRadius: 'var(--kihub-radius)',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export function SubscriptionsBanner({
  subscriptions,
}: {
  subscriptions: SubscriptionsContent;
}) {
  return (
    <section className="kihub-card kihub-card--tinted" aria-labelledby="fp-subscriptions-heading">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--kihub-space-8)',
          flexWrap: 'wrap',
        }}
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
            <p
              className="kihub-prose"
              style={{ margin: 0, color: 'var(--kihub-text-subtle)' }}
            >
              {subscriptions.description}
            </p>
          ) : null}
        </div>
        {subscriptions.chips.length ? (
          <ul
            style={{
              display: 'flex',
              gap: 'var(--kihub-space-3)',
              flexWrap: 'wrap',
              listStyle: 'none',
              margin: 0,
              padding: 0,
            }}
          >
            {subscriptions.chips.map((chip) => (
              <li key={chip.name}>
                {chip.href ? (
                  <a className="kihub-focusable" href={chip.href} style={chipStyle}>
                    {chip.name}
                  </a>
                ) : (
                  <span style={chipStyle}>{chip.name}</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
