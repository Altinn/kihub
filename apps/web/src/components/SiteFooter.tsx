import { getSiteChrome } from '@/lib/site-content';

/**
 * 011 US5 — the shared site footer (contracts/frontpage-read.md), mounted once in
 * `(app)/layout.tsx` below the page content: brand lockup, editor-managed contact block and link
 * list, on the inverted surface (`--kihub-surface-inverted`) — the only dark zone in the design.
 */
export async function SiteFooter() {
  const chrome = await getSiteChrome();
  const { footer } = chrome;

  return (
    <footer className="site-footer">
      <div className="kihub-container site-footer__inner">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--kihub-space-2)' }}>
          <span
            style={{
              font: '600 22px var(--kihub-font-ui)',
              letterSpacing: '-.02em',
              color: 'var(--kihub-accent-border)',
            }}
          >
            kitt
          </span>
          <span style={{ font: '400 17px var(--kihub-font-ui)', letterSpacing: '.05em' }}>
            KI HUB
          </span>
        </div>

        <div>
          {footer.contactLabel ? (
            <p style={{ margin: 0, font: '400 18px/1.7 var(--kihub-font-display)' }}>
              {footer.contactLabel}
            </p>
          ) : null}
          {footer.contactEmail ? (
            <p style={{ margin: 0, font: '400 18px/1.7 var(--kihub-font-display)' }}>
              <a href={`mailto:${footer.contactEmail}`} className="kihub-focusable">
                {footer.contactEmail}
              </a>
            </p>
          ) : null}
        </div>

        {footer.links.length ? (
          <ul className="site-footer__links">
            {footer.links.map((link) => (
              <li key={`${link.label}-${link.href}`}>
                <a
                  href={link.href}
                  className="kihub-focusable"
                  style={{ font: '400 18px var(--kihub-font-display)' }}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </footer>
  );
}
