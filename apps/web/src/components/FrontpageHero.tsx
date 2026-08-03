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

/** Decorative placeholder artwork until final artwork is provided (research §10). */
function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 320 260"
      role="presentation"
      aria-hidden="true"
      style={{ width: '100%', maxWidth: '360px', height: 'auto', display: 'block' }}
    >
      <circle
        cx="228"
        cy="72"
        r="44"
        fill="var(--kihub-bg)"
        stroke="var(--kihub-accent-border)"
        strokeWidth="1.5"
      />
      <text
        x="228"
        y="80"
        textAnchor="middle"
        fill="var(--kihub-text)"
        style={{ font: '400 26px var(--kihub-font-display)' }}
      >
        KI
      </text>
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1={196 + i * 16}
          y1={16 - (i % 2) * 6}
          x2={202 + i * 16}
          y2={30 - (i % 2) * 6}
          stroke="var(--kihub-accent)"
          strokeWidth="1.5"
        />
      ))}
      <path
        d="M40 250c-6-60 8-108 44-128 24-13 52-10 70 6M84 250c-2-36 6-64 24-82"
        fill="none"
        stroke="var(--kihub-accent-border)"
        strokeWidth="1.5"
      />
      <path
        d="M118 168c14-10 34-12 50-4l14 8"
        fill="none"
        stroke="var(--kihub-accent-border)"
        strokeWidth="1.5"
      />
    </svg>
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
        <HeroIllustration />
      </div>
    </section>
  );
}
