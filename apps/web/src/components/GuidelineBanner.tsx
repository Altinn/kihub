import { ArrowRightIcon, PlayFillIcon } from '@navikt/aksel-icons';
import Link from 'next/link';

/**
 * 029 — the frontpage card for «Retningslinje for agentisk KI i Digdir»: a light accent card with the
 * title, one line, a «Åpne retningslinjen» button and, on the right, a preview of the deck's cover so it
 * is clear that a presentation opens. The WHOLE card is one link to `/retningslinje`, so it is one tab
 * stop with no nested interactive elements (the «button» is a styled span inside the link, like
 * `ContributeBanner`'s cue). Its accessible name is the heading (`aria-labelledby`); the preview is
 * decoration (`aria-hidden`).
 *
 * The preview is drawn from Designsystemet tokens, NOT an image of the real first slide: the deck is
 * INTERN, and anything under `public/` is served to anyone. The title and «1 / 104» are not secret.
 *
 * Code-owned on purpose (research R6): the frontpage tiles are editor content and only render when
 * exactly two are saved, so a new tile would not reach production without an editor re-saving the
 * frontpage. The page renders this only while the release switch is on (`isGuidelineDeckEnabled`).
 */
export function GuidelineBanner() {
  return (
    <Link
      href="/retningslinje"
      className="ds-card app-guideline"
      data-color="accent"
      aria-labelledby="fp-guideline-heading"
    >
      <div className="app-guideline__text">
        <span className="ds-tag" data-color="neutral">
          Opplæring
        </span>
        <h2 id="fp-guideline-heading" className="ds-heading" data-size="lg">
          Retningslinje for agentisk KI i Digdir
        </h2>
        <p className="ds-paragraph" data-size="lg">
          Interaktiv gjennomgang på 104 lysbilder, i ditt eget tempo.
        </p>
        <span className="ds-button app-guideline__cta" data-variant="primary">
          Åpne retningslinjen
          <ArrowRightIcon aria-hidden />
        </span>
      </div>
      <div className="app-guideline__slide" aria-hidden="true">
        <span className="app-guideline__eyebrow">Opplæring · Digdir</span>
        <span className="app-guideline__title">Retningslinje for agentisk KI</span>
        <span className="app-guideline__play">
          <PlayFillIcon />
        </span>
        <span className="app-guideline__count">1 / 104</span>
        <span className="app-guideline__circle" />
        <span className="app-guideline__square" />
      </div>
    </Link>
  );
}
