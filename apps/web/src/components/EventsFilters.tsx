import Link from 'next/link';
import {
  EVENT_FORMAT_LABELS,
  EVENT_FORMATS,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  type EventFormatValue,
  type EventTypeValue,
} from '@/lib/events-view';

/**
 * 012 FR-005 — the list view's filter sidebar. URL-param driven server component in the
 * CatalogFilters pattern: every control is a link that re-renders the page with the next
 * filter state, so it works with client-side scripting disabled (SC-004). Rows are STYLED as
 * checkboxes (TYPE, multi) and radios (FORM, single) but are anchors carrying `aria-pressed`.
 */

function filtersHref(types: EventTypeValue[], form?: EventFormatValue): string {
  const sp = new URLSearchParams();
  for (const t of types) sp.append('type', t);
  if (form) sp.set('form', form);
  const qs = sp.toString();
  return qs ? `/events?${qs}` : '/events';
}

export function EventsFilters({
  activeTypes,
  activeForm,
}: {
  activeTypes: EventTypeValue[];
  activeForm?: EventFormatValue;
}) {
  const hasActive = activeTypes.length > 0 || Boolean(activeForm);

  return (
    <nav aria-label="Filtrer arrangementer" className="ev-filters">
      <div>
        <p className="kihub-eyebrow">Type</p>
        <ul className="ev-filter-list">
          {EVENT_TYPES.map((type) => {
            const isActive = activeTypes.includes(type);
            const nextTypes = isActive
              ? activeTypes.filter((t) => t !== type)
              : [...activeTypes, type];
            return (
              <li key={type}>
                <Link
                  href={filtersHref(nextTypes, activeForm)}
                  aria-pressed={isActive}
                  className="ev-filter kihub-focusable"
                >
                  <span
                    className={`ev-filter__box${isActive ? ' ev-filter__box--on' : ''}`}
                    aria-hidden="true"
                  />
                  {EVENT_TYPE_LABELS[type]}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="kihub-eyebrow">Form</p>
        <ul className="ev-filter-list">
          <li>
            <Link
              href={filtersHref(activeTypes, undefined)}
              aria-pressed={!activeForm}
              className="ev-filter kihub-focusable"
            >
              <span
                className={`ev-filter__box ev-filter__box--round${!activeForm ? ' ev-filter__box--on' : ''}`}
                aria-hidden="true"
              />
              Alle
            </Link>
          </li>
          {EVENT_FORMATS.map((format) => {
            const isActive = activeForm === format;
            return (
              <li key={format}>
                <Link
                  href={filtersHref(activeTypes, format)}
                  aria-pressed={isActive}
                  className="ev-filter kihub-focusable"
                >
                  <span
                    className={`ev-filter__box ev-filter__box--round${isActive ? ' ev-filter__box--on' : ''}`}
                    aria-hidden="true"
                  />
                  {EVENT_FORMAT_LABELS[format]}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {hasActive ? (
        <Link href="/events" className="kihub-link ev-filters__reset">
          Nullstill filtre
        </Link>
      ) : null}
    </nav>
  );
}
