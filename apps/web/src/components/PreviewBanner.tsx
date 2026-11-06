import { Alert } from '@digdir/designsystemet-react';

/**
 * 027 — shown on every employee page while an editor's preview is active (contracts/preview-route.md
 * §E, spec FR-015), so unpublished content is never mistaken for live content. Server Component; the
 * Designsystemet `Alert` is a presentational leaf and the exit control is a plain link, so this adds
 * no client JS of our own.
 */
export function PreviewBanner() {
  return (
    <div className="kihub-container preview-banner">
      <Alert data-color="warning" role="status">
        <strong>Forhåndsvisning.</strong> Du ser upubliserte endringer. Andre ansatte ser bare
        publiserte versjoner.{' '}
        <a href="/api/preview/exit" className="kihub-link">
          Avslutt forhåndsvisning
        </a>
      </Alert>
    </div>
  );
}
