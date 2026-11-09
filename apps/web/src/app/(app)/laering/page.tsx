import { ArrowRightIcon } from '@navikt/aksel-icons';
import Link from 'next/link';
import { LearningShell } from '@/components/LearningShell';
import { readLearningLibrary } from '@/lib/learning';
import { buildLearningTree } from '@/lib/learning-view';

/**
 * 014 US1 — the KI Læring overview (contracts/learning-page-ui.md §C).
 *
 * Derived entirely from the categories the editors created: a heading, then one section per category
 * showing its description and a link into its first page (FR-007). There is deliberately no separate
 * editor-managed landing document — the category descriptions ARE the landing copy (spec Assumption
 * 2).
 *
 * Inside the `(app)` route group, so `requireSession` already gates it (FR-033).
 *
 * 026: Designsystemet heading and paragraph markup; each category is a card on the light Gul tint
 * (the digdir.no "Hva skal du gjøre?" pattern) with its h2, description and an underlined
 * "Gå til …" link (the arrow is decorative).
 */
export const metadata = { title: 'KI Læring' };

export default async function LearningOverviewPage() {
  const library = await readLearningLibrary();
  const tree = buildLearningTree(library);

  return (
    <LearningShell tree={tree}>
      <h1 className="ds-heading" data-size="xl">
        KI Læring
      </h1>

      {tree.length === 0 ? (
        <div className="ds-card app-empty" data-color="neutral">
          <p className="ds-paragraph" data-size="lg">
            Det er ingen læringssider publisert ennå.
          </p>
          <p className="ds-paragraph">
            Når redaktørene har lagt ut innhold, finner du det her — samlet i kategorier du kan bla
            gjennom.
          </p>
        </div>
      ) : (
        <>
          <p className="ds-paragraph app-learning__lead" data-size="lg">
            Veiledninger og oppskrifter for å komme i gang med KI-verktøy i Digdir. Velg en kategori
            i menyen, eller start et av stedene under.
          </p>

          <div className="app-learning__overview">
            {tree.map((category, index) => (
              <section
                key={category.title}
                className="ds-card app-tint"
                data-variant="tinted"
                data-color="brand2"
                aria-labelledby={`learning-cat-${index}`}
              >
                <h2 id={`learning-cat-${index}`} className="ds-heading" data-size="sm">
                  {category.title}
                </h2>
                {category.description ? (
                  <p className="ds-paragraph app-meta">{category.description}</p>
                ) : null}
                {category.href ? (
                  <p className="ds-paragraph">
                    <Link href={category.href} className="ds-link">
                      <span>Gå til {category.title.toLowerCase()}</span>
                      <ArrowRightIcon aria-hidden />
                    </Link>
                  </p>
                ) : null}
              </section>
            ))}
          </div>
        </>
      )}
    </LearningShell>
  );
}
