import Image from 'next/image';
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
        <div className="site-footer__brand">
          <Image
            src="/brand/kitt-logo.svg"
            alt="Kitt"
            width={100}
            height={39}
            className="site-footer__logo"
            unoptimized
          />
          <span className="site-footer__brand-label">KI HUB</span>
        </div>

        {/* The label introduces the contact list, so it is hidden with it when no contacts are
            set; the empty column still holds its grid slot so the links stay right-aligned. */}
        <div>
          {footer.contacts.length ? (
            <>
              {footer.contactLabel ? (
                <p style={{ margin: 0, font: '400 18px/1.7 var(--kihub-font-display)' }}>
                  {footer.contactLabel}
                </p>
              ) : null}
              <ul className="site-footer__contacts">
                {footer.contacts.map((contact) => (
                  <li key={`${contact.name}-${contact.email}`}>
                    <span className="site-footer__contact-name">{contact.name}</span>
                    <a href={`mailto:${contact.email}`} className="kihub-focusable">
                      {contact.email}
                    </a>
                  </li>
                ))}
              </ul>
            </>
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
