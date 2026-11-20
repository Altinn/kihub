'use client';

import { InformationSquareIcon } from '@navikt/aksel-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildDeckSrc,
  deckPositionStorageKey,
  parseDeckHash,
  readDeckPosition,
  resolveStartHash,
  writeDeckPosition,
} from '@/lib/guideline-deck-view';

/** `localStorage`, or null where merely touching it throws (blocked storage, some privacy modes). */
function localStorageOrNull(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readRemembered(storageKey: string | null): string {
  return storageKey ? readDeckPosition(localStorageOrNull(), storageKey) : '';
}

/** Shown on hover / keyboard focus of the ⓘ button (Designsystemet tooltip) instead of a text block. */
const HELP =
  'Bla med pil høyre og venstre, eller klikk. Home og End hopper til første og siste lysbilde. ' +
  'Vises best i fullskjerm (Esc for å gå ut). Nettleserens zoom gjør ikke teksten større.';

/**
 * 029 — the guideline deck inside the page: a «Fullskjerm» button, a small ⓘ with the usage help, and the
 * 16:9 frame.
 *
 * WHY a client component: the URL fragment (`/retningslinje#53`) never reaches the server, so the
 * only way to open the embedded deck on slide 53 is to read it in the browser. It is the one client
 * island of the feature; the server-rendered page around it (heading, intro) works without JavaScript,
 * and a `<noscript>` note says what the deck needs.
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
 *
 * 030 — REMEMBERING THE PLACE: the page address never holds the slide (the deck writes it into the FRAME's
 * address), so a refresh used to restart at slide 1. With a `userKey` (a pseudonymous hash of the signed-in
 * user, derived on the server) the frame's slide address is saved in `localStorage` as the reader moves,
 * and read back on the next open — unless the page address carries its own valid `#N`, which wins. Nothing
 * is sent to a server; blocked storage degrades to the old behaviour silently.
 *
 * KEYBOARD: when full screen opens, focus goes INTO THE DECK, not to the close button — the deck listens
 * for the arrow keys, Home and End on its own document, so a focused button would swallow them and the
 * reader could not turn a slide. The close button stays one Tab away (it follows the frame), and Esc
 * closes from anywhere.
 */
export function DeckFrame({ userKey }: { userKey?: string }) {
  // null on the server and during hydration; the real address only after mount, so hydration never mismatches.
  const [src, setSrc] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const openRef = useRef<HTMLButtonElement>(null);
  const storageKey = userKey ? deckPositionStorageKey(userKey) : null;

  useEffect(() => {
    // The first sync also consults the remembered place (030); later page-hash changes behave as in 029.
    const start = () =>
      setSrc(buildDeckSrc(resolveStartHash(window.location.hash, readRemembered(storageKey))));
    const sync = () => setSrc(buildDeckSrc(window.location.hash));
    start();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [storageKey]);

  // 030 — remember where the reader is. The deck moves with history.pushState/replaceState, which fire no
  // event, so the (same-origin) frame's own address is polled, and read once more as the page goes away.
  const tracking = src !== null && storageKey !== null;
  useEffect(() => {
    if (!tracking || !storageKey) return;
    const storage = localStorageOrNull();
    if (!storage) return;
    let last = '';
    const capture = () => {
      let hash = '';
      try {
        hash = parseDeckHash(frameRef.current?.contentWindow?.location.hash ?? '');
      } catch {
        return; // frame not reachable right now
      }
      if (!hash || hash === last) return;
      last = hash;
      writeDeckPosition(storage, storageKey, hash);
      // A shared `…#53` only decides where the reader STARTS: once they move on, drop it from the page
      // address so a refresh does not pull them back. replaceState fires no `hashchange`: no frame reload.
      const pageHash = parseDeckHash(window.location.hash);
      if (pageHash && pageHash !== hash) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    const timer = window.setInterval(capture, 500);
    window.addEventListener('pagehide', capture);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pagehide', capture);
    };
  }, [tracking, storageKey]);

  /** Give the deck keyboard focus, so arrows / Home / End reach its own key handler. */
  const focusDeck = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    frame.focus();
    try {
      frame.contentWindow?.focus();
    } catch {
      // Not reachable (cross-origin): the iframe element itself has focus, which is the best we can do.
    }
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
      if (outcome === 'ok' || document.fullscreenElement === frame) {
        focusDeck();
        return;
      }
    }
    setOverlay(true);
  }, [focusDeck]);

  // If native full screen engages after the overlay was already shown (a slow browser), native wins.
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement && document.fullscreenElement === frameRef.current) {
        setOverlay(false);
        focusDeck();
      }
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [focusDeck]);

  const closeOverlay = useCallback(() => {
    setOverlay(false);
    openRef.current?.focus();
  }, []);

  // Overlay mode: lock the page scroll, hand keyboard focus to the deck, close on Escape — also when the
  // key is pressed inside the (same-origin) deck frame, where the page's own listener never hears it.
  useEffect(() => {
    if (!overlay) return;
    document.documentElement.classList.add('app-deck-lock');
    focusDeck();

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
  }, [overlay, closeOverlay, focusDeck]);

  return (
    <>
      <div className="app-deck-toolbar">
        {src ? (
          <>
            <button
              ref={openRef}
              type="button"
              className="ds-button"
              data-variant="primary"
              onClick={enterFullscreen}
            >
              Fullskjerm
            </button>
            <button
              type="button"
              className="ds-button"
              data-variant="tertiary"
              data-icon="true"
              data-tooltip={HELP}
            >
              <InformationSquareIcon aria-hidden />
              <span className="ds-sr-only">Slik bruker du presentasjonen</span>
            </button>
          </>
        ) : null}
      </div>
      <noscript>
        <div className="ds-alert" data-color="info">
          <p className="ds-paragraph">Presentasjonen krever JavaScript.</p>
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
