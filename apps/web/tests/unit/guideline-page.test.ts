import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 029 US1 — wiring of the guideline page, frontpage banner and frame. The suite has no JSX renderer
 * (tests are `.ts`, node environment), so — like `route-caching.test.ts` — these read the sources to
 * pin the decisions that must not drift: the release switch gates BOTH surfaces, the card is one link,
 * the frame is titled, and the full-screen link never lets the new tab reach the page.
 */
const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
const read = (file: string) => readFileSync(`${SRC}${file}`, 'utf8');

describe('guideline page', () => {
  const page = read('app/(app)/retningslinje/page.tsx');

  it('does not exist while the release switch is off', () => {
    expect(page).toMatch(/isGuidelineDeckEnabled\(\)/);
    expect(page).toMatch(/notFound\(\)/);
  });

  it('has exactly one h1 with the guideline title and no heading below h1 that skips a level', () => {
    expect(page.match(/<h1\b/g)).toHaveLength(1);
    expect(page).toContain('Retningslinje for agentisk KI i Digdir');
    expect(page).not.toMatch(/<h[3-6]\b/);
  });

  it('does not teach readers with a text block — the usage help is a hover tooltip on the frame', () => {
    expect(page).not.toMatch(/Slik bruker du presentasjonen/);
    expect(page).not.toMatch(/data-color="info"/);
  });

  it('falls back to a message instead of an empty frame when the deck is missing', () => {
    expect(page).toMatch(/deckIsAvailable\(\)/);
    expect(page).toContain('Presentasjonen er ikke tilgjengelig akkurat nå');
  });
});

describe('DeckFrame', () => {
  const frame = read('components/DeckFrame.tsx');

  it('titles the iframe and allows full screen', () => {
    expect(frame).toMatch(/title="Retningslinje for agentisk KI i Digdir/);
    expect(frame).toMatch(/allowFullScreen/);
  });

  it('has no new-tab link — the deck is read on the page or in full screen', () => {
    expect(frame).not.toMatch(/target="_blank"/);
    expect(frame).not.toContain('Åpne i ny fane');
    expect(frame).not.toContain('Åpne i fullskjerm');
  });

  it('puts the usage help in a small ⓘ with a Designsystemet tooltip (hover AND keyboard focus)', () => {
    expect(frame).toMatch(/InformationSquareIcon/);
    expect(frame).toMatch(/data-tooltip=\{HELP\}/);
    // A real button, so it is focusable and the tooltip opens on focus; its name is visible to screen readers.
    expect(frame).toMatch(/<button[^>]*data-icon="true"[^>]*data-tooltip/);
    expect(frame).toMatch(/ds-sr-only">Slik bruker du presentasjonen/);
    // The help still says how to move, how to leave, and the zoom limitation (FR-002).
    expect(frame).toMatch(/pil høyre og venstre/);
    expect(frame).toMatch(/Esc for å gå ut/);
    expect(frame).toMatch(/zoom/i);
  });

  it('has a Fullskjerm button that asks the browser for real full screen first', () => {
    expect(frame).toContain('Fullskjerm');
    expect(frame).toMatch(/<button[\s\S]*?type="button"[\s\S]*?onClick=\{enterFullscreen\}/);
    expect(frame).toMatch(/requestFullscreen\(\)/);
  });

  it('never waits forever on the browser: a hanging fullscreen request still ends in the overlay', () => {
    // Found in the Claude desktop pane: the request's promise never settles, so a plain `await` left
    // the button dead. The request must be raced against a timeout.
    expect(frame).toMatch(/Promise\.race\(/);
    expect(frame).toMatch(/setTimeout\(\(\) => resolve\('timeout'\), \d+\)/);
    expect(frame).toMatch(/document\.fullscreenElement === frame/);
    expect(frame).not.toMatch(/await frame\.requestFullscreen\(\)/);
  });

  it('falls back to an overlay, restyling the frame instead of reloading it', () => {
    // Same iframe element, only its class changes — so the deck keeps its slide.
    expect(frame.match(/<iframe\b/g)).toHaveLength(1);
    expect(frame).toMatch(/app-deck-frame--overlay/);
    expect(frame).toMatch(/setOverlay\(true\)/);
  });

  it('makes the overlay closable and accessible: Esc (also inside the frame), a visible button, focus back', () => {
    expect(frame).toMatch(/event\.key === 'Escape'/);
    expect(frame).toMatch(/contentDocument/);
    expect(frame).toContain('Lukk fullskjerm (Esc)');
    expect(frame).toMatch(/openRef\.current\?\.focus\(\)/);
    expect(frame).toMatch(/app-deck-lock/);
  });

  it('gives keyboard focus to the DECK when full screen opens, never to the close button', () => {
    // Found by the owner: with focus on the close button the arrow keys went to the button and the deck
    // could not be turned. The deck listens on its own document, so the frame must hold focus.
    expect(frame).toMatch(/frame\.focus\(\)/);
    expect(frame).toMatch(/frame\.contentWindow\?\.focus\(\)/);
    expect(frame.match(/focusDeck\(\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(frame).not.toMatch(/closeRef/);
  });

  it('only ever puts a validated hash into an address', () => {
    expect(frame).toMatch(/buildDeckSrc\(window\.location\.hash\)/);
    expect(frame).not.toMatch(/location\.hash\s*\}/);
  });

  it('keeps visual styling out of the component (tokens live in app.css)', () => {
    expect(frame).not.toMatch(/style=\{/);
  });

  it('imports only the browser-safe view module, never the node/Azure store module', () => {
    // `lib/guideline-deck.ts` pulls node:fs and the Azure SDK; in a client component Turbopack panics.
    expect(frame).toMatch(/from '@\/lib\/guideline-deck-view'/);
    expect(frame).not.toMatch(/from '@\/lib\/guideline-deck'/);
    const view = read('lib/guideline-deck-view.ts');
    expect(view).not.toMatch(/^import\s/m);
    expect(view).not.toMatch(/\bnode:/);
  });
});

describe('frontpage banner', () => {
  const banner = read('components/GuidelineBanner.tsx');
  const frontpage = read('app/(app)/page.tsx');

  it('is one link to /retningslinje named by its heading', () => {
    expect(banner).toMatch(/href="\/retningslinje"/);
    expect(banner).toMatch(/aria-labelledby="fp-guideline-heading"/);
    expect(banner).toMatch(/id="fp-guideline-heading"/);
    expect(banner).toContain('Retningslinje for agentisk KI i Digdir');
    expect(banner.match(/<Link\b/g)).toHaveLength(1);
    expect(banner).not.toMatch(/<a\b|<button\b/);
  });

  it('is rendered on the frontpage only while the release switch is on', () => {
    expect(frontpage).toMatch(/isGuidelineDeckEnabled\(\) \? <GuidelineBanner \/> : null/);
  });

  it('has a styled «Åpne retningslinjen» button that is NOT a nested interactive element', () => {
    // The card is the link; the button is a styled span inside it (one tab stop, valid HTML).
    expect(banner).toContain('Åpne retningslinjen');
    expect(banner).toMatch(/<span className="ds-button app-guideline__cta" data-variant="primary">/);
  });

  it('uses the same type sizes as the other frontpage cards (sm heading, default paragraph)', () => {
    // Found by the owner: lg/lg made this card's text larger than the tiles and the contribute banner.
    const contribute = read('components/ContributeBanner.tsx');
    expect(contribute).toMatch(/className="ds-heading[^"]*" data-size="sm"/);
    expect(banner).toMatch(/className="ds-heading" data-size="sm"/);
    expect(banner).not.toMatch(/data-size="(lg|xl|md)"/);
    expect(banner).toMatch(/<p className="ds-paragraph">/);
    expect(read('styles/app.css')).toMatch(
      /\.app-guideline__text \.ds-heading\s*\{\s*font-weight:\s*var\(--ds-font-weight-regular\)/,
    );
  });

  it('shows a cover preview on the right that is decoration, not an image of the INTERN deck', () => {
    expect(banner).toMatch(/className="app-guideline__slide" aria-hidden="true"/);
    expect(banner).toContain('1 / 104');
    expect(banner).toContain('PlayFillIcon');
    // The deck is INTERN and `public/` is served to anyone: no <img>, no file reference.
    expect(banner).not.toMatch(/<img\b|<Image\b|\.(png|jpe?g|webp|svg)\b|\/brand\//i);
  });
});

describe('frontpage card styles', () => {
  const css = read('styles/app.css');
  // The whole 029 card section of app.css, from its comment to the next section's.
  const start = css.indexOf('/* 029 — the guideline card');
  const end = css.indexOf('/* Subscriptions:', start);
  const section = start >= 0 && end > start ? css.slice(start, end) : '';
  const NO_RAW_VALUES = /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(|\d\s?(px|em)\b/;

  it('finds the card section', () => {
    expect(section.length).toBeGreaterThan(500);
    expect(section.match(/\{/g)?.length).toBeGreaterThanOrEqual(12);
  });

  it('removes the link underline from the card and its heading', () => {
    const card = /\.app-guideline\.ds-card\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(card).toMatch(/text-decoration:\s*none/);
    expect(css).toMatch(/\.app-guideline__text \.ds-heading,[\s\S]*?text-decoration:\s*none/);
  });

  it('uses Designsystemet tokens only: no raw colours, no pixel or em values', () => {
    expect(section).not.toMatch(NO_RAW_VALUES);
    expect(section).not.toMatch(/letter-spacing/);
  });

  it('is top-aligned with the same 13 px rhythm as the other banners, not vertically centred', () => {
    // Found by the owner: `align-items: center` pushed the text 60 px down next to the tall cover, while
    // every other card starts its content at the top.
    const card = /\.app-guideline\.ds-card\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(card).toMatch(/align-items:\s*start/);
    expect(card).not.toMatch(/align-items:\s*center/);
    const text = /\.app-guideline__text\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(text).toMatch(/gap:\s*var\(--ds-size-3\)/);
    // ds-card gives a following child a top margin; the cover must start level with the text.
    const slide = /\.app-guideline__slide\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
    expect(slide).toMatch(/margin:\s*0/);
  });

  it('keeps the cover small enough that the card is about as tall as its neighbours', () => {
    expect(css).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 22rem\)/);
  });

  it('draws the cover with the neutral surface and the brand colours as graphics', () => {
    expect(css).toMatch(/\.app-guideline__slide\s*\{[^}]*var\(--ds-color-neutral-base-default\)/);
    expect(css).toMatch(/\.app-guideline__circle\s*\{[^}]*var\(--ds-color-brand1-base-default\)/);
    expect(css).toMatch(/\.app-guideline__square\s*\{[^}]*var\(--ds-color-brand2-base-default\)/);
  });

  it('stacks on narrow screens and never clips the cover content on a phone', () => {
    const narrow = /@media \(max-width: 48rem\)\s*\{[\s\S]*?\n\}\n/.exec(css.slice(css.indexOf('app-guideline')))?.[0] ?? '';
    expect(narrow).toMatch(/\.app-guideline\.ds-card\s*\{\s*grid-template-columns:\s*minmax\(0, 1fr\)/);
    expect(narrow).toMatch(/aspect-ratio:\s*auto/);
  });
});

describe('frame styles', () => {
  const css = read('styles/app.css');
  const rule = (selector: string) =>
    new RegExp(`${selector.replace(/[.\\-]/g, '\\$&')}\\s*\\{[^}]*\\}`).exec(css)?.[0] ?? '';
  const NO_RAW_VALUES = /#[0-9a-fA-F]{3,8}\b|\brgb\(|\bhsl\(/;

  it('is a 16:9 box and a frame styled with Designsystemet tokens only', () => {
    expect(rule('.app-deck')).toMatch(/aspect-ratio:\s*16 \/ 9/);
    const frame = rule('.app-deck-frame');
    expect(frame).toMatch(/var\(--ds-color-neutral-border-subtle\)/);
    expect(frame).toMatch(/var\(--ds-border-radius-md\)/);
    expect(frame).not.toMatch(NO_RAW_VALUES);
  });

  it('lifts the frame over the page in the overlay without hard-coded colours', () => {
    const overlay = rule('.app-deck-frame--overlay');
    expect(overlay).toMatch(/position:\s*fixed/);
    expect(overlay).toMatch(/inset:\s*0/);
    expect(overlay).not.toMatch(NO_RAW_VALUES);
    expect(rule('.app-deck-close')).not.toMatch(NO_RAW_VALUES);
    expect(css).toMatch(/html\.app-deck-lock\s*\{\s*overflow:\s*hidden/);
  });
});

/**
 * The repo and the production image are PUBLIC; the INTERN deck must never reach either. Next's file
 * tracing follows `process.cwd()` joins (a local copy of the deck WAS traced into `.next/standalone`),
 * and `docker build` copies gitignored files from the build context, so both doors are closed and pinned.
 */
describe('the deck can never reach git or the public image', () => {
  const ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
  const readRoot = (file: string) => readFileSync(`${ROOT}${file}`, 'utf8');

  it('is gitignored', () => {
    expect(readRoot('.gitignore')).toMatch(/^apps\/web\/protected-static\/$/m);
  });

  it('is excluded from the docker build context', () => {
    expect(readRoot('.dockerignore')).toMatch(/^\*\*\/protected-static$/m);
  });

  it('is excluded from Next file tracing (standalone output)', () => {
    const config = readRoot('apps/web/next.config.mjs');
    expect(config).toMatch(/outputFileTracingExcludes:\s*\{\s*'\*':\s*\['\.\/protected-static\/\*\*\/\*'\]/);
  });
});

describe('frontpage card titles share one weight', () => {
  const css = read('styles/app.css');

  it('gives the subscriptions card title the regular weight like the tiles and banners', () => {
    // It was the only title left at the design system default (medium), so it looked bold next to the rest.
    expect(css).toMatch(
      /\.app-subscriptions\.ds-card > \.ds-heading\s*\{\s*font-weight:\s*var\(--ds-font-weight-regular\)/,
    );
    expect(css).toMatch(/\.app-solid\.ds-card > \.app-solid__title\s*\{[^}]*font-weight:\s*var\(--ds-font-weight-regular\)/);
    expect(css).toMatch(/\.app-guideline__text \.ds-heading\s*\{\s*font-weight:\s*var\(--ds-font-weight-regular\)/);
  });
});

