import { ArrowRightIcon } from '@navikt/aksel-icons';
import Link from 'next/link';

/**
 * 029 — the frontpage card for «Retningslinje for agentisk KI i Digdir». The WHOLE card is one link to
 * `/retningslinje`, so it is one tab stop with no nested interactive elements, like `ContributeBanner`.
 * Its accessible name is the heading (`aria-labelledby`).
 *
 * Code-owned on purpose (research R6): the frontpage tiles are editor content and only render when
 * exactly two are saved, so a new tile would not reach production without an editor re-saving the
 * frontpage. The page renders this only while the release switch is on (`isGuidelineDeckEnabled`).
 * It uses the neutral card surface so it is distinguishable from the solid-accent `ContributeBanner`.
 */
export function GuidelineBanner() {
  return (
    <Link
      href="/retningslinje"
      className="ds-card app-banner"
      data-color="neutral"
      aria-labelledby="fp-guideline-heading"
    >
      <span className="ds-tag">Retningslinje</span>
      <h2 id="fp-guideline-heading" className="ds-heading" data-size="sm">
        Retningslinje for agentisk KI i Digdir
      </h2>
      <p className="ds-paragraph">
        Hvorfor retningslinjen finnes, hva agentisk KI er og hvem som har ansvaret. Les presentasjonen
        direkte i KI Hub.
      </p>
      <span className="app-banner__cta">
        Åpne retningslinjen
        <span className="app-arrow-chip" aria-hidden="true">
          <ArrowRightIcon />
        </span>
      </span>
    </Link>
  );
}
