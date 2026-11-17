import { ChevronRightIcon } from '@navikt/aksel-icons';
import Image from 'next/image';
import { getSiteChrome } from '@/lib/site-content';

/**
 * 011 US5 — the shared site footer (contracts/frontpage-read.md), mounted once in
 * `(app)/layout.tsx` below the page content: brand lockup, editor-managed link list and contact
 * block.
 *
 * 026: modelled on digdir.no's footer — a Blåsvart ground (Designsystemet's light-scheme neutral
 * base, #1E2B3C) with headed columns: chevron links and a "Kontakt" block. The content sits in a
 * dark-scheme subtree (`data-color-scheme="dark"`, its own background made transparent), so text,
 * link and focus-ring tokens are Designsystemet's light-on-dark values and stay visible.
 */

export async function SiteFooter() {
  const chrome = await getSiteChrome();
  const { footer } = chrome;

  return (
    <footer className="app-footer" data-color-scheme="dark" data-color="neutral">
      <div className="app-footer__scheme">
        <div className="app-container app-footer__inner">
          <div className="app-footer__brand">
            <Image
              src="/brand/kitt-logo.svg"
              alt="Kitt"
              width={100}
              height={39}
              className="app-footer__logo"
              unoptimized
            />
            <span className="app-footer__brand-label">KI HUB</span>
          </div>

          {footer.links.length ? (
            <section aria-labelledby="footer-links-heading">
              <h2 id="footer-links-heading" className="ds-heading app-footer__heading" data-size="xs">
                KI Hub
              </h2>
              <ul className="app-footer__list">
                {footer.links.map((link) => (
                  <li key={`${link.label}-${link.href}`}>
                    <a href={link.href} className="ds-link app-footer__link" data-color="neutral">
                      <ChevronRightIcon aria-hidden className="app-footer__chevron" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Contact block: only when the editors have set contacts. */}
          {footer.contacts.length ? (
            <section aria-labelledby="footer-contacts-heading">
              <h2 id="footer-contacts-heading" className="ds-heading app-footer__heading" data-size="xs">
                {footer.contactLabel || 'Kontakt'}
              </h2>
              <ul className="app-footer__list">
                {footer.contacts.map((contact) => (
                  <li key={`${contact.name}-${contact.email}`} className="app-footer__contact">
                    <span className="ds-paragraph" data-size="sm">
                      {contact.name}
                    </span>
                    <a href={`mailto:${contact.email}`} className="ds-link app-footer__link" data-color="neutral">
                      <ChevronRightIcon aria-hidden className="app-footer__chevron" />
                      {contact.email}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
