import { ArrowRightIcon } from '@navikt/aksel-icons';
import Link from 'next/link';

/**
 * 021 — the "Del KI-verktøyene dere lager" banner below the subscriptions banner. The WHOLE banner
 * is one link to `/bidra`, so it is one tab stop with no nested interactive elements, like
 * `FrontpageTile`.
 *
 * 026 (review revision): the solid accent banner of 021/025 is kept, on Designsystemet tokens: a
 * link card (`a.ds-card.app-solid`, `data-color="accent"`) on `base-default` #0062BA with its
 * generated white `base-contrast-default` text (≈6.6:1). The tag and the "Les veiledningen" arrow
 * chip use the inverse pair (white fill, accent text), as 025's did.
 * Its accessible name is the heading (`aria-labelledby`), as in 021.
 */
export function ContributeBanner() {
  return (
    <Link
      href="/bidra"
      className="ds-card app-banner app-solid"
      data-color="accent"
      aria-labelledby="fp-contribute-heading"
    >
      <span className="ds-tag app-solid__inverse">Veiledning for team</span>
      <h2 id="fp-contribute-heading" className="ds-heading app-solid__title" data-size="sm">
        Del KI-verktøyene dere lager
      </h2>
      <p className="ds-paragraph">
        Slik får teamet ditt skills, agenter og prompter inn i KI Hub, med agentkort, eksempler og en
        forklaring på hvorfor det lønner seg.
      </p>
      <span className="app-banner__cta">
        Les veiledningen
        <span className="app-arrow-chip app-solid__inverse" aria-hidden="true">
          <ArrowRightIcon />
        </span>
      </span>
    </Link>
  );
}
