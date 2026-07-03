import { Heading, Tag } from '@digdir/designsystemet-react';
import Link from 'next/link';

interface CatalogFiltersProps {
  availableTypes: string[];
  availableTags: string[];
  activeType?: string;
  activeTags: string[];
}

/** Build a catalog URL toggling one filter value while preserving the others. */
function toggleHref(params: { type?: string; tags: string[] }): string {
  const sp = new URLSearchParams();
  if (params.type) sp.set('type', params.type);
  for (const t of params.tags) sp.append('tag', t);
  const qs = sp.toString();
  return qs ? `/?${qs}` : '/';
}

/**
 * URL-param-driven catalog filters (server component — link-based, no client JS).
 * Type filter (also the type-derived category facet) and tag filters combine (AND).
 */
export function CatalogFilters({
  availableTypes,
  availableTags,
  activeType,
  activeTags,
}: CatalogFiltersProps) {
  const hasActive = Boolean(activeType) || activeTags.length > 0;

  return (
    <section aria-label="Filters" style={{ display: 'grid', gap: '0.75rem' }}>
      <div>
        <Heading level={2} data-size="2xs" style={{ marginBottom: '0.35rem' }}>
          Type
        </Heading>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {availableTypes.map((t) => {
            const isActive = activeType === t;
            const href = toggleHref({ type: isActive ? undefined : t, tags: activeTags });
            return (
              <Link key={t} href={href} aria-pressed={isActive}>
                <Tag data-color={isActive ? 'accent' : 'neutral'} data-size="sm">
                  {t}
                </Tag>
              </Link>
            );
          })}
        </div>
      </div>

      {availableTags.length > 0 ? (
        <div>
          <Heading level={2} data-size="2xs" style={{ marginBottom: '0.35rem' }}>
            Tags
          </Heading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {availableTags.map((tag) => {
              const isActive = activeTags.includes(tag);
              const nextTags = isActive
                ? activeTags.filter((x) => x !== tag)
                : [...activeTags, tag];
              return (
                <Link key={tag} href={toggleHref({ type: activeType, tags: nextTags })} aria-pressed={isActive}>
                  <Tag data-color={isActive ? 'accent' : 'info'} data-size="sm">
                    {tag}
                  </Tag>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasActive ? (
        <Link href="/">Clear filters</Link>
      ) : null}
    </section>
  );
}
