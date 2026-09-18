'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { NavItem } from '@/lib/site-content-defaults';

/**
 * 011 US4 — the primary navigation, the feature's ONLY client component: on narrow viewports the
 * list collapses behind an accessible hamburger toggle (`aria-expanded`/`aria-controls`, FR-013).
 * Nav data arrives as props from the server `SiteHeader`; breakpoint behavior lives in
 * `styles/portal.css`.
 */

/** Exact match, or a path segment boundary below `href` — never a bare string-prefix match
 * (so `/prosjekter` doesn't also light up for a hypothetical `/prosjekter-2026` route). */
function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav({ nav }: { nav: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="site-nav" aria-label="Hovedmeny">
      <button
        type="button"
        className="site-nav__toggle kihub-focusable"
        aria-expanded={open}
        aria-controls="site-nav-list"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? 'Lukk meny' : 'Meny'}
      </button>
      <ul id="site-nav-list" className="site-nav__list" data-open={open || undefined}>
        {nav.map((item) => (
          <li key={`${item.label}-${item.href}`}>
            <Link
              href={item.href}
              className="site-nav__link kihub-focusable"
              aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
