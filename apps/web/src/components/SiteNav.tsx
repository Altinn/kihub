'use client';

import { MagnifyingGlassIcon, MenuHamburgerIcon } from '@navikt/aksel-icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { itemsWrap, nextHamburgerState } from '@/lib/header-view';
import type { NavItem } from '@/lib/site-content-defaults';

/**
 * 011 US4 — the primary navigation. Nav data arrives as props from the server `SiteHeader`, and
 * `children` is the server-rendered `UserMenu` (Avatar + name opening Admin, dark mode, Logg ut).
 *
 * 026: the responsive behaviour follows Designsystemet's own site header
 * (digdir/designsystemet `internal/components/src/header/header.tsx`):
 * - no fixed breakpoint — the menu switches to a hamburger when its items no longer fit on one
 *   line (they wrap), and back only once the window is clearly wider than where it switched
 *   (`lib/header-view.ts`);
 * - the hamburger menu is a Designsystemet drawer: a native modal `dialog.ds-dialog` with
 *   `data-placement="right"`, opened by `command="show-modal"` (Invoker Commands, polyfilled by
 *   designsystemet-web). The browser traps focus, closes on Escape or a backdrop click
 *   (`closedby="any"`) and returns focus to "Meny"; choosing a link closes it too.
 * Without JavaScript the full list simply wraps, so every link stays reachable.
 */

/** Exact match, or a path segment boundary below `href` — never a bare string-prefix match
 * (so `/prosjekter` doesn't also light up for a hypothetical `/prosjekter-2026` route). */
function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const DIALOG_ID = 'site-menu';

export function SiteNav({
  nav,
  search,
  children,
}: {
  nav: NavItem[];
  search?: NavItem;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mode, setMode] = useState({ isHamburger: false, switchedAtWidth: 0 });
  const listRef = useRef<HTMLUListElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const update = () => {
      const items = listRef.current ? [...listRef.current.children] : [];
      setMode((current) => {
        const next = nextHamburgerState({
          ...current,
          windowWidth: window.innerWidth,
          wrapped: itemsWrap(items.map((item) => item.getBoundingClientRect())),
        });
        return next.isHamburger === current.isHamburger && next.switchedAtWidth === current.switchedAtWidth
          ? current
          : next;
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [mode.isHamburger, nav]);

  const closeMenu = () => dialogRef.current?.close();

  const links = () => (
    <>
      {nav.map((item) => (
        <li key={`${item.label}-${item.href}`}>
          <Link
            href={item.href}
            className="ds-link app-nav__link"
            data-color="neutral"
            aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
          >
            {item.label}
          </Link>
        </li>
      ))}
      {search ? (
        <li>
          <Link href={search.href} className="ds-link app-nav__link" data-color="neutral">
            <MagnifyingGlassIcon aria-hidden />
            <span>{search.label}</span>
          </Link>
        </li>
      ) : null}
    </>
  );

  if (!mode.isHamburger) {
    return (
      <>
        <nav className="app-nav" aria-label="Hovedmeny">
          <ul ref={listRef} className="app-nav__list">
            {links()}
          </ul>
        </nav>
        {children}
      </>
    );
  }

  return (
    <div className="app-nav app-nav--hamburger">
      <button
        type="button"
        className="ds-button"
        data-variant="tertiary"
        data-color="neutral"
        command="show-modal"
        commandfor={DIALOG_ID}
        aria-haspopup="dialog"
        // designsystemet-web's invoker-commands polyfill augments these attributes client-side.
        suppressHydrationWarning
      >
        <MenuHamburgerIcon aria-hidden />
        Meny
      </button>
      <dialog
        id={DIALOG_ID}
        ref={dialogRef}
        className="ds-dialog app-menu-dialog"
        data-placement="right"
        closedby="any"
        aria-labelledby={`${DIALOG_ID}-heading`}
      >
        {/* Designsystemet's close button: empty, first child, `command="close"` — its CSS draws ✕. */}
        <button
          type="button"
          className="ds-button"
          data-variant="tertiary"
          data-color="neutral"
          data-icon="true"
          command="close"
          commandfor={DIALOG_ID}
          aria-label="Lukk meny"
          suppressHydrationWarning
        />
        <h2 id={`${DIALOG_ID}-heading`} className="ds-heading" data-size="xs">
          Meny
        </h2>
        <nav aria-label="Hovedmeny">
          {/* Choosing a link closes the drawer (client navigation keeps the page, so it would
              otherwise stay open). */}
          <ul
            className="app-menu-panel__list"
            onClick={(event) => {
              if ((event.target as Element).closest('a')) closeMenu();
            }}
          >
            {links()}
          </ul>
        </nav>
        {children}
      </dialog>
    </div>
  );
}
