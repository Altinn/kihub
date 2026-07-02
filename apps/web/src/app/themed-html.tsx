// Designsystemet base component styles + default Digdir theme (constitution: mandatory UI system).
import '@digdir/designsystemet-css';
import '@digdir/designsystemet-css/theme';

/**
 * Shared root <html>/<body> shell for the app's route groups. Designsystemet applies
 * background/color to <body> automatically; theming is driven by the data-* attributes on <html>.
 * (Payload's admin route group provides its own root layout.)
 */
export function ThemedHtml({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb" data-color-scheme="light" data-size="md" data-color="brand1">
      <body>{children}</body>
    </html>
  );
}
