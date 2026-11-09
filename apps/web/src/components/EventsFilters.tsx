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
 * 012 FR-005 — the list view's filter sidebar.
 *
 * 026 R6: a real GET form instead of links carrying `aria-pressed`. Each group is a named
 * `fieldset`/`legend`, each option a native checkbox (type, multi) or radio (form, single) inside a
 * Designsystemet chip, so role, group name and checked state are announced natively and the
 * checked state is shown by a check mark and border, not by colour alone. Submitting rebuilds the
 * same `?type=…&form=…` URL the page already parses (`parseEventsSearchParams`), so it works without
 * client-side scripting (012 SC-004) and stays shareable. No auto-submit on change: a context change
 * on input would fail WCAG 3.2.2.
 */
export function EventsFilters({
  activeTypes,
  activeForm,
}: {
  activeTypes: EventTypeValue[];
  activeForm?: EventFormatValue;
}) {
  const hasActive = activeTypes.length > 0 || Boolean(activeForm);

  return (
    <form method="get" action="/events" className="app-filters" aria-label="Filtrer arrangementer">
      <fieldset className="ds-fieldset">
        <legend className="ds-label">Type</legend>
        <div className="app-chip-group">
          {EVENT_TYPES.map((type) => (
            <label key={type} className="ds-chip">
              <input
                className="ds-input"
                type="checkbox"
                name="type"
                value={type}
                defaultChecked={activeTypes.includes(type)}
              />
              {EVENT_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="ds-fieldset">
        <legend className="ds-label">Form</legend>
        <div className="app-chip-group">
          <label className="ds-chip">
            <input className="ds-input" type="radio" name="form" value="" defaultChecked={!activeForm} />
            Alle
          </label>
          {EVENT_FORMATS.map((format) => (
            <label key={format} className="ds-chip">
              <input
                className="ds-input"
                type="radio"
                name="form"
                value={format}
                defaultChecked={activeForm === format}
              />
              {EVENT_FORMAT_LABELS[format]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="app-cluster">
        <button type="submit" className="ds-button" data-size="sm">
          Bruk filter
        </button>
        {hasActive ? (
          <Link href="/events" className="ds-link">
            Nullstill filtre
          </Link>
        ) : null}
      </div>
    </form>
  );
}
