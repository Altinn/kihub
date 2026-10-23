import Link from 'next/link';

/**
 * 021 — the "Del KI-verktøyene dere lager" banner below the subscriptions banner. The WHOLE banner
 * is one link to `/bidra`, so it is one tab stop with no nested interactive elements, like
 * `FrontpageTile`.
 *
 * 026: a Designsystemet link card (`a.ds-card`) on the light Blå (brand3) tint, the digdir.no
 * card pattern, instead of a hand-coloured accent fill.
 * Its accessible name is its text content (heading + lede), and Designsystemet underlines the
 * heading as the link cue. The tag is a plain `ds-tag`, which fixes the 4.43:1 white-on-tint label.
 */
export function ContributeBanner() {
  return (
    <Link href="/bidra" className="ds-card app-banner app-tint" data-variant="tinted" data-color="brand3">
      <span className="ds-tag" data-color="neutral" data-variant="outline">
        Veiledning for team
      </span>
      <h2 className="ds-heading" data-size="sm">
        Del KI-verktøyene dere lager
      </h2>
      <p className="ds-paragraph">
        Slik får teamet ditt skills, agenter og prompter inn i KI Hub, med agentkort, eksempler og en
        forklaring på hvorfor det lønner seg.
      </p>
    </Link>
  );
}
