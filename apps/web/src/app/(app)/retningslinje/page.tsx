import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { DeckFrame } from '@/components/DeckFrame';
import { deckIsAvailable, deckUserKey, isGuidelineDeckEnabled } from '@/lib/guideline-deck';

export const metadata: Metadata = { title: 'Retningslinje for agentisk KI i Digdir' };

/**
 * 029 — «Retningslinje for agentisk KI i Digdir»: a regular KI Hub page around the project lead's INTERN
 * slide deck (issue #183). The deck keeps its own player, so its animations, keyboard navigation and
 * slide addresses (`#N`, `#N.b`) behave exactly as its author designed them; this page adds the shell,
 * an introduction and a «Fullskjerm» button; the usage help is a small ⓘ tooltip, not a text block. Gated by `(app)/layout.tsx` `requireSession()`
 * (employees only) and by the release switch: while it is off the page does not exist (404).
 *
 * The deck files come from the private store through `deck/[...path]/route.ts`, never from `public/`.
 * `deckIsAvailable()` keeps the page honest when the files have not been uploaded (FR-012).
 */
export default async function GuidelinePage() {
  if (!isGuidelineDeckEnabled()) notFound();
  const available = await deckIsAvailable();
  // 030: a pseudonymous per-user key so the browser can remember each reader's place apart. No oid → the
  // deck still works, it just does not remember.
  const session = await auth();
  const oid = (session?.user as { oid?: string } | undefined)?.oid;
  const userKey = oid ? deckUserKey(oid) : undefined;

  return (
    <div className="app-container">
      <div className="app-section">
        <h1 className="ds-heading" data-size="xl">
          Retningslinje for agentisk KI i Digdir
        </h1>
        <p className="ds-paragraph" data-size="lg">
          Presentasjonen forklarer hvorfor retningslinjen finnes, hva agentisk KI er og hvem som har
          ansvaret. Den har 104 lysbilder: selve retningslinjen er lysbilde 1–69, og «Vedlegg» med
          kravene ordrett er lysbilde 70–104.
        </p>

        {available ? (
          <DeckFrame userKey={userKey} />
        ) : (
          <div className="ds-alert" data-color="warning">
            <p className="ds-paragraph">
              <strong>Presentasjonen er ikke tilgjengelig akkurat nå.</strong> Prøv igjen senere.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
