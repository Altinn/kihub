'use client';

import { useEffect, useState } from 'react';
import { buildDeckSrc, DECK_ENTRY } from '@/lib/guideline-deck-view';

/**
 * 029 — the guideline deck inside the page: the «Åpne i fullskjerm» link and the 16:9 frame.
 *
 * WHY a client component: the URL fragment (`/retningslinje#53`) never reaches the server, so the
 * only way to open the embedded deck on slide 53 is to read it in the browser. It is the one client
 * island of the feature; the server-rendered page around it (heading, intro, usage note) and the
 * full-screen link work without JavaScript (FR-012), and a `<noscript>` note says what the deck needs.
 *
 * The frame is mounted only after the first client render, so the browser performs ONE load of the
 * deck (with the right slide) instead of loading slide 1 and then jumping. A later `hashchange`
 * changes the frame's `src` by fragment only, which the deck handles through its own `hashchange`
 * listener — no reload. The hash is validated (`buildDeckSrc` → `parseDeckHash`) before it touches an
 * address.
 */
export function DeckFrame() {
  // '' on the server and during hydration; the real hash only after mount, so hydration never mismatches.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setSrc(buildDeckSrc(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const href = src ?? DECK_ENTRY;

  return (
    <>
      <div className="app-deck-toolbar">
        <a
          className="ds-button"
          data-variant="secondary"
          href={href}
          target="_blank"
          rel="noopener"
        >
          Åpne i fullskjerm
        </a>
      </div>
      <noscript>
        <div className="ds-alert" data-color="info">
          <p className="ds-paragraph">
            Presentasjonen krever JavaScript. Bruk «Åpne i fullskjerm» over for å åpne den i en ny fane.
          </p>
        </div>
      </noscript>
      {src ? (
        <iframe
          className="app-deck-frame"
          src={src}
          title="Retningslinje for agentisk KI i Digdir (presentasjon)"
          allow="fullscreen"
          allowFullScreen
        />
      ) : null}
    </>
  );
}
