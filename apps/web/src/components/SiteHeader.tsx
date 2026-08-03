import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { SiteNav } from '@/components/SiteNav';
import { getSiteChrome } from '@/lib/site-content';

/**
 * 011 US4 — the shared site header (contracts/frontpage-read.md), mounted once in
 * `(app)/layout.tsx`: kitt/KI HUB brand lockup, CMS-managed navigation, the "Søk" affordance
 * (→ /registry, the portal's search) and the compact user cluster carried over from the retired
 * `PortalHeader` — identity, admin-only role management link, and the sign-out server action.
 * It resolves session + chrome itself, so the layout just renders `<SiteHeader />`.
 */
export async function SiteHeader() {
  const [session, chrome] = await Promise.all([auth(), getSiteChrome()]);
  const user = session?.user;

  return (
    <header className="site-header">
      <div className="kihub-container site-header__inner">
        <Link href="/" className="site-header__brand kihub-focusable">
          <span
            style={{
              font: '600 22px var(--kihub-font-ui)',
              letterSpacing: '-.02em',
              color: 'var(--kihub-accent)',
            }}
          >
            kitt
          </span>
          <span style={{ font: '400 17px var(--kihub-font-ui)', letterSpacing: '.05em' }}>
            KI HUB
          </span>
        </Link>

        <SiteNav nav={chrome.nav} />

        <div className="site-header__user">
          <Link href="/registry" className="site-nav__link kihub-focusable">
            Søk
          </Link>
          {user ? (
            <>
              <span
                style={{
                  font: '400 13px var(--kihub-font-ui)',
                  color: 'var(--kihub-text-subtle)',
                  textAlign: 'right',
                }}
              >
                {user.name}
                {user.role === 'admin' ? (
                  <>
                    {' · '}
                    <a href="/admin/roles" className="kihub-link">
                      Roller
                    </a>
                  </>
                ) : null}
              </span>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/signin' });
                }}
              >
                <button
                  type="submit"
                  className="kihub-btn kihub-btn--secondary"
                  style={{ padding: '7px 12px', fontSize: '14px' }}
                >
                  Logg ut
                </button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
