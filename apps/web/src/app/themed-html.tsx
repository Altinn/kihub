// Designsystemet base component styles + the generated KI Hub theme (Designsystemet's official
// theming pipeline: designsystemet.config.json → `designsystemet tokens create/build`).
import '@digdir/designsystemet-css';
import '../../design-tokens-build/kihub.css';
// KI HUB design-system layer (direction 1a) on top of Designsystemet — see src/styles/kihub/README.md.
import '@/styles/kihub/tokens.css';
import '@/styles/kihub/components.css';
import '@/styles/kihub-fonts.css';
// Bridge: kihub color tokens resolve through the generated theme (single value source).
import '@/styles/kihub-ds-bridge.css';
// 011: structural layout for the shared chrome + frontpage sections (kihub tokens only).
import '@/styles/portal.css';

import localFont from 'next/font/local';

/**
 * Self-hosted from files committed in `src/fonts/` (see its README), not fetched from Google Fonts.
 *
 * `next/font/google` self-hosts at runtime but downloads at BUILD time, so `next build` required
 * network access to fonts.gstatic.com and failed without it. These are the same latin variable woff2
 * files Google was serving — Google returns one variable file per family and points every requested
 * static weight at it — so this is a build-reliability change, not a visual one.
 *
 * `kihub-fonts.css` maps these two variables onto the kihub font tokens; the names are unchanged, so
 * nothing else needed touching.
 */
const displayFont = localFont({
  src: '../fonts/SourceSerif4-Variable.woff2',
  // A variable font: one file covering the range, declared as a range rather than per-weight files.
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-kihub-display',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
const uiFont = localFont({
  src: '../fonts/Inter-Variable.woff2',
  weight: '400 600',
  style: 'normal',
  display: 'swap',
  variable: '--font-kihub-ui',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
});

/**
 * Shared root <html>/<body> shell for the app's route groups. Designsystemet applies
 * background/color to <body> automatically; theming is driven by the data-* attributes on <html>.
 * The KI HUB token layer (imported last) sets the page ground, ink and type on <body>.
 * (Payload's admin route group provides its own root layout.)
 */
export function ThemedHtml({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="nb"
      data-color-scheme="light"
      data-size="md"
      data-color="accent"
      className={`${displayFont.variable} ${uiFont.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
