'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDeckSrc, DECK_ENTRY } from '@/lib/guideline-deck-view';

/**
 * 029 — the guideline deck inside the page: a «Fullskjerm» button, a secondary «Åpne i ny fane» link and
 * the 16:9 frame.
 *
 * WHY a client component: the URL fragment (`/retningslinje#53`) never reaches the server, so the
 * only way to open the embedded deck on slide 53 is to read it in the browser. It is the one client
 * island of the feature; the server-rendered page around it (heading, intro, usage note) and the
 * new-tab link work without JavaScript (FR-012), and a `<noscript>` note says what the deck needs.
 *
 * The frame is mounted only after the first client render, so the browser performs ONE load of the
 * deck (with the right slide) instead of loading slide 1 and then jumping. A later `hashchange`
 * changes the frame's `src` by fragment only, which the deck handles through its own `hashchange`
 * listener — no reload. The hash is validated (`buildDeckSrc` → `parseDeckHash`) before it touches an
 * address.
 *
 * Full screen: the button asks the browser to put the FRAME itself in full screen (Esc leaves it, the
 * browser says so). Where that is unavailable or refused — iPhone Safari does not do element full
 * screen — the same button falls back to an overlay: the frame is restyled `position: fixed` over the
 * page (a style change, so the deck is not reloaded and keeps its slide), with a visible close button,
 * Esc to close (also from inside the same-origin frame), a locked page scroll and focus handed back to
 * the button on close.
 */
export function DeckFrame() {
  // '' on the server and during hydration; the real hash only after mount, so hydration never mismatches.
  const [src, setSrc] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => setSrc(buildDeckSrc(window.location.hash));
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const frame = frameRef.current;
    if (frame && typeof frame.requestFullscreen === 'function') {
      // Do NOT just await the request: in some embedded browsers (the Claude desktop pane) its promise
      // never settles, which would leave the button doing nothing. Give the browser a moment, and if the
      // frame is not in full screen by then — refused, unsupported or hanging — use the overlay.
      const outcome = await Promise.race([
        frame.requestFullscreen().then(
          () => 'ok' as const,
          () => 'failed' as const,
        ),
        new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 700)),
      ]);
      if (outcome === 'ok' || document.fullscreenElement === frame) return;
    }
    setOverlay(true);
  }, []);

  // If native full screen engages after the overlay was already shown (a slow browser), native wins.
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement && document.fullscreenElement === frameRef.current) {
        setOverlay(false);
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlay(false);
    openRef.current?.focus();
  }, []);

  // Overlay mode: lock the page scroll, move focus to the close button, close on Escape — also when the
  // key is pressed inside the (same-origin) deck frame, where the page's own listener never hears it.
  useEffect(() => {
    if (!overlay) return;
    document.documentElement.classList.add('app-deck-lock');
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlay();
    };
    window.addEventListener('keydown', onKey);
    let frameDoc: Document | null = null;
    try {
      frameDoc = frameRef.current?.contentDocument ?? null;
      frameDoc?.addEventListener('keydown', onKey);
    } catch {
      frameDoc = null;
    }
    return () => {
      document.documentElement.classList.remove('app-deck-lock');
      window.removeEventListener('keydown', onKey);
      frameDoc?.removeEventListener('keydown', onKey);
    };
  }, [overlay, closeOverlay]);

  const href = src ?? DECK_ENTRY;

  return (
    <>
      <div className="app-deck-toolbar">
        {src ? (
          <button
            ref={openRef}
            type="button"
            className="ds-button"
            data-variant="primary"
            onClick={enterFullscreen}
          >
            Fullskjerm
          </button>
        ) : null}
        <a className="ds-link" href={href} target="_blank" rel="noopener">
          Åpne i ny fane
        </a>
        {src ? (
          <span className="ds-paragraph" data-size="sm">
            Trykk Esc for å gå ut av fullskjerm.
          </span>
        ) : null}
      </div>
      <noscript>
        <div className="ds-alert" data-color="info">
          <p className="ds-paragraph">
            Presentasjonen krever JavaScript. Bruk «Åpne i ny fane» over for å åpne den alene.
          </p>
        </div>
      </noscript>
      {src ? (
        <div className="app-deck">
          <iframe
            ref={frameRef}
            className={overlay ? 'app-deck-frame app-deck-frame--overlay' : 'app-deck-frame'}
            src={src}
            title="Retningslinje for agentisk KI i Digdir (presentasjon)"
            allow="fullscreen"
            allowFullScreen
          />
          {overlay ? (
            <button
              ref={closeRef}
              type="button"
              className="ds-button app-deck-close"
              data-variant="primary"
              onClick={closeOverlay}
            >
              Lukk fullskjerm (Esc)
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
