import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { SiteNav } from '@/components/SiteNav';
import { UserMenu } from '@/components/UserMenu';
import { getSiteChrome } from '@/lib/site-content';
import { COLOR_SCHEME_COOKIE, parseColorScheme } from '@/lib/user-menu-view';

/**
 * 011 US4 — the shared site header (contracts/frontpage-read.md), mounted once in
 * `(app)/layout.tsx`: kitt/KI HUB brand lockup, CMS-managed navigation, the "Søk" affordance
 * (→ /registry, the portal's search) and the compact user cluster — identity, admin link for
 * contributor+, and the sign-out server action. It resolves session + chrome itself, so the layout
 * just renders `<SiteHeader />`.
 *
 * 026: Designsystemet has no header pattern, so this is a custom component on ds-* primitives
 * (`ds-link`, `ds-button`, `ds-paragraph`) and app.css tokens. Digdir's logo rule: top-left,
 * with clear space. "Søk" lives inside the navigation list. The signed-in person is a
 * `UserMenu` (Avatar + name opening a Designsystemet Dropdown with Admin, dark mode and Logg ut).
 */
export async function SiteHeader() {
  const [session, chrome, cookieStore] = await Promise.all([auth(), getSiteChrome(), cookies()]);
  const user = session?.user;

  return (
    <header className="app-header">
      <div className="app-container app-header__inner">
        <Link href="/" className="app-header__brand ds-focus" aria-label="Kitt KI HUB, forside">
          <Image src="/brand/kitt-logo.svg" alt="" width={100} height={39} priority unoptimized />
          <span className="app-header__brand-label" aria-hidden="true">
            KI HUB
          </span>
        </Link>

        <SiteNav nav={chrome.nav} search={{ label: 'Søk', href: '/registry' }}>
          {user ? (
            <UserMenu
              name={user.name ?? user.email ?? ''}
              image={user.image}
              showAdmin={user.role !== 'reader'}
              colorScheme={parseColorScheme(cookieStore.get(COLOR_SCHEME_COOKIE)?.value)}
            />
          ) : null}
        </SiteNav>
      </div>
    </header>
  );
}
