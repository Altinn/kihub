import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DeckFrame } from '@/components/DeckFrame';
import { deckIsAvailable, isGuidelineDeckEnabled } from '@/lib/guideline-deck';

export const metadata: Metadata = { title: 'Retningslinje for agentisk KI i Digdir' };

/**
 * 029 — «Retningslinje for agentisk KI i Digdir»: a regular KI Hub page around the project lead's INTERN
 * slide deck (issue #183). The deck keeps its own player, so its animations, keyboard navigation and
 * slide addresses (`#N`, `#N.b`) behave exactly as its author designed them; this page adds the shell,
 * an introduction, a usage note and a full-screen link. Gated by `(app)/layout.tsx` `requireSession()`
 * (employees only) and by the release switch: while it is off the page does not exist (404).
 *
 * The deck files come from the private store through `deck/[...path]/route.ts`, never from `public/`.
 * `deckIsAvailable()` keeps the page honest when the files have not been uploaded (FR-012).
 */
export default async function GuidelinePage() {
  if (!isGuidelineDeckEnabled()) notFound();
  const available = await deckIsAvailable();

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

        <div className="ds-alert" data-color="info">
          <p className="ds-paragraph">
            <strong>Slik bruker du presentasjonen.</strong> Klikk i presentasjonen og bruk pil høyre,
            mellomrom eller klikk for å gå videre, pil venstre for å gå tilbake, og Home/End for å hoppe
            til første eller siste lysbilde. Tilbake-knappen i nettleseren tar deg til forrige lysbilde.
            Presentasjonen vises best i fullskjerm. Merk at nettleserens zoom ikke gjør teksten større,
            så åpne den i fullskjerm og bruk et større vindu. Den fungerer best på datamaskin.
          </p>
        </div>

        {available ? (
          <DeckFrame />
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
