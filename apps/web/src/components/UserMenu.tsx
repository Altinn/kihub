import { CogIcon, LeaveIcon } from '@navikt/aksel-icons';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from '@/auth';
import { ColorSchemeSwitch } from '@/components/ColorSchemeSwitch';
import { initialsOf, type AppColorScheme } from '@/lib/user-menu-view';

const MENU_ID = 'user-menu';
const SIGN_OUT_FORM_ID = 'sign-out-form';

/**
 * 026 — the signed-in person in the header: a button with their Avatar and name that opens a
 * Designsystemet Dropdown (`div.ds-dropdown[popover]`, opened by `popovertarget`; the browser
 * handles open/close, Escape and outside clicks, and designsystemet-web places it under the
 * button). The menu holds Admin (contributor+), the dark-mode switch and "Logg ut".
 *
 * The Avatar shows the Entra profile photo when the session has one, otherwise the initials. It is
 * `aria-hidden`, because the visible name already names the button.
 *
 * "Logg ut" is a submit button tied to a form outside the list (`form=`), so it stays a direct
 * child of its `li` and gets Designsystemet's dropdown item styling.
 */
export function UserMenu({
  name,
  image,
  showAdmin,
  colorScheme,
}: {
  name: string;
  image?: string | null;
  showAdmin: boolean;
  colorScheme: AppColorScheme;
}) {
  return (
    <div className="app-header__user">
      <button
        type="button"
        className="ds-button app-user-menu__trigger"
        data-variant="tertiary"
        data-color="neutral"
        popoverTarget={MENU_ID}
      >
        <span className="ds-avatar" data-size="sm" data-color="accent" aria-hidden="true">
          {image ? <Image src={image} alt="" width={64} height={64} unoptimized /> : initialsOf(name)}
        </span>
        {name}
      </button>
      <div
        className="ds-dropdown app-user-menu"
        id={MENU_ID}
        popover="auto"
        data-placement="bottom-end"
        data-color="neutral"
      >
        <form
          id={SIGN_OUT_FORM_ID}
          hidden
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/signin' });
          }}
        />
        <ul>
          {showAdmin ? (
            // Contributor+ may enter the back-office (Users.access.admin) — role management and
            // discovery triggers both live there.
            <li>
              <Link href="/cms" className="ds-button" data-variant="tertiary">
                <CogIcon aria-hidden />
                Admin
              </Link>
            </li>
          ) : null}
          <li>
            <ColorSchemeSwitch initial={colorScheme} />
          </li>
          <li>
            <button type="submit" form={SIGN_OUT_FORM_ID} className="ds-button" data-variant="tertiary">
              <LeaveIcon aria-hidden />
              Logg ut
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
