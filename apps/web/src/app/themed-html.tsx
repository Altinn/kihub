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

import { Inter, Source_Serif_4 } from 'next/font/google';

// Self-hosted via next/font; kihub-fonts.css maps these variables onto the kihub font tokens.
const displayFont = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-kihub-display',
});
const uiFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-kihub-ui',
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
