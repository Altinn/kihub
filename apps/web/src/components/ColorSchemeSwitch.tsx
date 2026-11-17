'use client';

import { useId, useState } from 'react';
import { colorSchemeCookie, type AppColorScheme } from '@/lib/user-menu-view';

/**
 * 026 — the "Mørk modus" switch in the user menu: a Designsystemet Switch
 * (`ds-field` > `input.ds-input[role=switch]` + `label.ds-label`). Flipping it sets
 * `data-color-scheme` on <html> at once and stores the choice in a cookie, which `ThemedHtml`
 * reads on the server so later pages render in the chosen scheme from the first paint.
 * The label comes first so the switch sits at the row's end, as in a settings menu. It uses the
 * accent colour (the menu around it is neutral) so "on" reads clearly in both schemes.
 */
export function ColorSchemeSwitch({ initial }: { initial: AppColorScheme }) {
  const id = useId();
  const [scheme, setScheme] = useState(initial);

  return (
    <ds-field className="ds-field app-user-menu__switch" data-color="accent">
      <label className="ds-label" data-weight="regular" htmlFor={id}>
        Mørk modus
      </label>
      <input
        id={id}
        className="ds-input"
        type="checkbox"
        role="switch"
        checked={scheme === 'dark'}
        onChange={(event) => {
          const next: AppColorScheme = event.target.checked ? 'dark' : 'light';
          document.documentElement.dataset.colorScheme = next;
          document.cookie = colorSchemeCookie(next, window.location.protocol === 'https:');
          setScheme(next);
        }}
      />
    </ds-field>
  );
}
