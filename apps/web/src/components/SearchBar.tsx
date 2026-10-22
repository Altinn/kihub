import Link from 'next/link';

/**
 * Catalog keyword search box (Phase 5). Sets/clears the `q` URL param while preserving the existing
 * `type`/`tag` filter params, so search and the Phase 2 filters compose on one catalog surface; the
 * server component re-renders results.
 *
 * 026: a SERVER component — a plain GET form with Designsystemet's `ds-search` markup, so search
 * works without client-side scripting and needs no router. The field has a VISIBLE label (FR-019);
 * the active filters ride along as hidden inputs. Clearing is a link, not a reset button: a native
 * reset would restore the current query instead of emptying it.
 */
export function SearchBar({
  initialQuery = '',
  basePath = '/registry',
  type,
  tags = [],
}: {
  initialQuery?: string;
  basePath?: string;
  type?: string;
  tags?: string[];
}) {
  const clearParams = new URLSearchParams();
  if (type) clearParams.set('type', type);
  for (const t of tags) clearParams.append('tag', t);
  const clearHref = clearParams.size ? `${basePath}?${clearParams}` : basePath;

  return (
    <form method="get" action={basePath} role="search" className="app-search">
      <label className="ds-label" htmlFor="registry-search">
        Søk i verktøy og ressurser
      </label>
      <div className="ds-search">
        <input
          id="registry-search"
          className="ds-input"
          type="search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Navn, beskrivelse eller README"
        />
        <button type="submit" className="ds-button">
          Søk
        </button>
      </div>
      {type ? <input type="hidden" name="type" value={type} /> : null}
      {tags.map((t) => (
        <input key={t} type="hidden" name="tag" value={t} />
      ))}
      {initialQuery ? (
        <p className="ds-paragraph" data-size="sm">
          <Link href={clearHref} className="ds-link">
            Tøm søk
          </Link>
        </p>
      ) : null}
    </form>
  );
}
