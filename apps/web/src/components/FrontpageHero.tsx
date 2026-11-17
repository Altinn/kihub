import { ArrowRightIcon } from '@navikt/aksel-icons';
import Image from 'next/image';
import Link from 'next/link';
import type { HeroContent } from '@/lib/site-content-defaults';

/**
 * 011 US1 — the frontpage hero (contracts/frontpage-read.md): kicker, H1 with one accent-coloured
 * word, lead, CTA pair and the decorative Digdir design element. Content is editor-managed
 * (FR-003) and arrives merged with seeded defaults via `lib/site-content.ts`.
 *
 * 026: Designsystemet heading/paragraph/button markup. The editor's eyebrow stays as a plain
 * sentence-case kicker (no uppercase/letter-spacing). The design element sits at the right edge,
 * decorative, hidden on narrow screens so it never competes with the content.
 */

/** Wrap the first occurrence of `accentWord` in the accent span; no match → plain heading. */
function headingWithAccent(heading: string, accentWord?: string) {
  if (!accentWord) return heading;
  const index = heading.indexOf(accentWord);
  if (index === -1) return heading;
  return (
    <>
      {heading.slice(0, index)}
      <span className="app-accent-word">{accentWord}</span>
      {heading.slice(index + accentWord.length)}
    </>
  );
}

export function FrontpageHero({ hero }: { hero: HeroContent }) {
  return (
    <section className="app-hero" aria-labelledby="fp-hero-heading">
      <div className="app-hero__text">
        {hero.eyebrow ? (
          <p className="ds-paragraph app-kicker" data-size="sm">
            {hero.eyebrow}
          </p>
        ) : null}
        <h1 id="fp-hero-heading" className="ds-heading app-hero__heading" data-size="2xl">
          {headingWithAccent(hero.heading, hero.accentWord)}
        </h1>
        {hero.lead ? (
          <p className="ds-paragraph app-hero__lead" data-size="lg">
            {hero.lead}
          </p>
        ) : null}
        {hero.primaryCta || hero.secondaryCta ? (
          <div className="app-cluster">
            {hero.primaryCta ? (
              <Link className="ds-button" data-variant="primary" href={hero.primaryCta.href}>
                {hero.primaryCta.label}
                <ArrowRightIcon aria-hidden />
              </Link>
            ) : null}
            {hero.secondaryCta ? (
              <Link className="ds-button" data-variant="secondary" href={hero.secondaryCta.href}>
                {hero.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="app-hero__art">
        <Image
          src="/brand/hero-design-element.svg"
          alt=""
          width={298}
          height={180}
          priority
          unoptimized
        />
      </div>
    </section>
  );
}
