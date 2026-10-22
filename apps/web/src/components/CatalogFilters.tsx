import Link from 'next/link';
import { artifactTypeLabel } from '@/lib/registry-view';

interface CatalogFiltersProps {
  availableTypes: string[];
  availableTags: string[];
  activeType?: string;
  activeTags: string[];
  /** The active search query, carried along so filtering keeps the search. */
  query?: string;
  /** Catalog route the form submits to (default `/registry`, where the catalog lives). */
  basePath?: string;
}

/**
 * URL-param-driven catalog filters. Type (single — also the type-derived category facet) and tags
 * (multi) combine (AND).
 *
 * 026 R6: a real GET form instead of `Tag`s wrapped in links carrying `aria-pressed`. Each group is
 * a named fieldset; type options are radios and tags are checkboxes, each inside a Designsystemet
 * chip, so role, group and checked state are announced natively and the selection is shown by a
 * check mark and border, not colour alone. Submitting rebuilds the same `?type=&tag=…&q=` URL the
 * page parses (`parseRegistrySearchParams`); works without client-side scripting.
 */
export function CatalogFilters({
  availableTypes,
  availableTags,
  activeType,
  activeTags,
  query,
  basePath = '/registry',
}: CatalogFiltersProps) {
  const hasActive = Boolean(activeType) || activeTags.length > 0;

  return (
    <form method="get" action={basePath} className="app-filters" aria-label="Filtrer verktøy og ressurser">
      {query ? <input type="hidden" name="q" value={query} /> : null}

      <fieldset className="ds-fieldset">
        <legend className="ds-label">Type</legend>
        <div className="app-chip-group">
          <label className="ds-chip">
            <input className="ds-input" type="radio" name="type" value="" defaultChecked={!activeType} />
            Alle
          </label>
          {availableTypes.map((t) => (
            <label key={t} className="ds-chip">
              <input
                className="ds-input"
                type="radio"
                name="type"
                value={t}
                defaultChecked={activeType === t}
              />
              {artifactTypeLabel(t)}
            </label>
          ))}
        </div>
      </fieldset>

      {availableTags.length > 0 ? (
        <fieldset className="ds-fieldset">
          <legend className="ds-label">Emneord</legend>
          <div className="app-chip-group">
            {availableTags.map((tag) => (
              <label key={tag} className="ds-chip">
                <input
                  className="ds-input"
                  type="checkbox"
                  name="tag"
                  value={tag}
                  defaultChecked={activeTags.includes(tag)}
                />
                {tag}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div className="app-cluster">
        <button type="submit" className="ds-button" data-size="sm">
          Bruk filter
        </button>
        {hasActive ? (
          <Link href={query ? `${basePath}?q=${encodeURIComponent(query)}` : basePath} className="ds-link">
            Nullstill filtre
          </Link>
        ) : null}
      </div>
    </form>
  );
}
