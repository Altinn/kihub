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

  it('tells readers about full screen and the zoom limitation', () => {
    expect(page).toMatch(/fullskjerm/);
    expect(page).toMatch(/zoom/i);
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

  it('keeps a secondary link that opens the deck alone in a new tab that cannot reach the page', () => {
    expect(frame).toMatch(/target="_blank"/);
    expect(frame).toMatch(/rel="noopener"/);
    expect(frame).toContain('Åpne i ny fane');
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
    expect(frame).toMatch(/closeRef\.current\?\.focus\(\)/);
    expect(frame).toMatch(/app-deck-lock/);
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

