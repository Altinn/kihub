import Image from 'next/image';
import Link from 'next/link';
import type { HeroContent } from '@/lib/site-content-defaults';

/**
 * 011 US1 — the frontpage hero (contracts/frontpage-read.md): eyebrow, serif H1 with one
 * accent-colored word, lead, CTA pair and a decorative illustration slot. Content is
 * editor-managed (FR-003) and arrives merged with seeded defaults via `lib/site-content.ts`.
 */

/** Wrap the first occurrence of `accentWord` in the accent span; no match → plain heading. */
function headingWithAccent(heading: string, accentWord?: string) {
  if (!accentWord) return heading;
  const index = heading.indexOf(accentWord);
  if (index === -1) return heading;
  return (
    <>
      {heading.slice(0, index)}
      <span className="kihub-accent-word">{accentWord}</span>
      {heading.slice(index + accentWord.length)}
    </>
  );
}

export function FrontpageHero({ hero }: { hero: HeroContent }) {
  return (
    <section className="fp-hero" aria-labelledby="fp-hero-heading">
      <div className="kihub-stack" style={{ gap: 'var(--kihub-space-5)' }}>
        {hero.eyebrow ? (
          <p className="kihub-eyebrow kihub-eyebrow--accent" style={{ margin: 0 }}>
            {hero.eyebrow}
          </p>
        ) : null}
        <h1 id="fp-hero-heading" className="kihub-h1">
          {headingWithAccent(hero.heading, hero.accentWord)}
        </h1>
        {hero.lead ? <p className="kihub-lead">{hero.lead}</p> : null}
        {hero.primaryCta || hero.secondaryCta ? (
          <div className="kihub-row" style={{ marginTop: 'var(--kihub-space-2)' }}>
            {hero.primaryCta ? (
              <Link className="kihub-btn kihub-btn--primary" href={hero.primaryCta.href}>
                {hero.primaryCta.label} →
              </Link>
            ) : null}
            {hero.secondaryCta ? (
              <Link className="kihub-btn kihub-btn--secondary" href={hero.secondaryCta.href}>
                {hero.secondaryCta.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="fp-hero__art">
        <Image
          src="/brand/hero-illustration.jpg"
          alt=""
          role="presentation"
          width={2000}
          height={1660}
          priority
          style={{ width: '100%', maxWidth: '420px', height: 'auto', display: 'block' }}
        />
      </div>
    </section>
  );
}
