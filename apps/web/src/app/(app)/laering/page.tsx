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
 */
export const metadata = { title: 'KI Læring' };

export default async function LearningOverviewPage() {
  const library = await readLearningLibrary();
  const tree = buildLearningTree(library);

  return (
    <LearningShell tree={tree}>
      <h1 className="kihub-h2 lp-title">KI Læring</h1>

      {tree.length === 0 ? (
        <div className="lp-empty">
          <p className="kihub-lead">Det er ingen læringssider publisert ennå.</p>
          <p>
            Når redaktørene har lagt ut innhold, finner du det her — samlet i kategorier du kan bla
            gjennom.
          </p>
        </div>
      ) : (
        <>
          <p className="kihub-lead lp-lead">
            Veiledninger og oppskrifter for å komme i gang med KI-verktøy i Digdir. Velg en kategori
            i menyen, eller start et av stedene under.
          </p>

          <div className="lp-overview">
            {tree.map((category) => (
              <section key={category.title} className="lp-overview__section">
                <h2 className="kihub-h3 lp-overview__heading">{category.title}</h2>
                {category.description ? (
                  <p className="lp-overview__description">{category.description}</p>
                ) : null}
                {category.href ? (
                  <p className="lp-overview__action">
                    <Link href={category.href} className="kihub-link">
                      Gå til {category.title.toLowerCase()} →
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
