import Link from 'next/link';

/**
 * 021 — the blue "Del verktøyene deres" banner below the subscriptions banner. It uses the same
 * accent fill as the "KI Prosjekter i BOD" tile. The WHOLE banner is one link to `/bidra`, so it
 * is one tab stop with no nested interactive elements, like `FrontpageTile`. The light sweep is
 * decorative and stops under prefers-reduced-motion.
 */
export function ContributeBanner() {
  return (
    <Link href="/bidra" className="fp-contribute kihub-focusable" aria-labelledby="fp-contribute-heading">
      <div className="fp-contribute__text">
        <span className="kihub-tag kihub-tag--on-accent">Veiledning for team</span>
        <h2 id="fp-contribute-heading" className="kihub-h3 fp-contribute__heading">
          Del KI-verktøyene dere lager
        </h2>
        <p className="fp-contribute__lede">
          Slik får teamet ditt skills, agenter og prompter inn i KI Hub, med agentkort, eksempler og
          en forklaring på hvorfor det lønner seg.
        </p>
        <span className="fp-contribute__cta">
          Les veiledningen
          <span className="kihub-tile__arrow" aria-hidden="true">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
