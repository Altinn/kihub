// Designsystemet base component styles + the generated KI Hub theme (Digdir's official
// Designsystemet theme: designsystemet.config.json → `designsystemet tokens create/build`).
import '@digdir/designsystemet-css';
import '../../design-tokens-build/kihub.css';
// 026: the app's own layout + custom-component CSS, on --ds-* tokens only.
import '@/styles/app.css';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import localFont from 'next/font/local';
import { DesignsystemetWeb } from '@/components/DesignsystemetWeb';
import { COLOR_SCHEME_COOKIE, parseColorScheme } from '@/lib/user-menu-view';

/** Shared `<title>` template for the (app) and (auth) route groups: "Page · KI Hub". */
export const SITE_TITLE: Metadata = { title: { default: 'KI Hub', template: '%s · KI Hub' } };

/**
 * Self-hosted from a file committed in `src/fonts/` (see its README), not fetched from Google Fonts.
 *
 * `next/font/google` self-hosts at runtime but downloads at BUILD time, so `next build` required
 * network access to fonts.gstatic.com and failed without it. This is the same latin variable woff2
 * Google was serving.
 *
 * Inter is Digdir's typeface for digital surfaces; `styles/app.css` hands this variable to
 * Designsystemet as `--ds-font-family`.
 */
const inter = localFont({
  src: '../fonts/Inter-Variable.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});

/**
 * Shared root <html>/<body> shell for the app's route groups. Designsystemet applies
 * background/color to <body> automatically; theming is driven by the data-* attributes on <html>.
 * 026: the skip link is the first focusable element on every page (WCAG 2.4.1); each route group
 * renders the `#main-content` landmark it targets. (Payload's admin route group provides its own
 * root layout.)
 * The colour scheme is the person's choice from the user menu (a cookie), light by default.
 */
export async function ThemedHtml({ children }: { children: React.ReactNode }) {
  const colorScheme = parseColorScheme((await cookies()).get(COLOR_SCHEME_COOKIE)?.value);
  return (
    <html
      lang="nb"
      data-color-scheme={colorScheme}
      data-size="md"
      data-color="accent"
      className={inter.variable}
    >
      <body>
        <a className="ds-skip-link" href="#main-content">
          Hopp til hovedinnhold
        </a>
        {children}
        <DesignsystemetWeb />
      </body>
    </html>
  );
}
