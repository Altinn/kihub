import { ChevronLeftIcon, ChevronRightIcon } from '@navikt/aksel-icons';
import Link from 'next/link';
import { EventsDayList } from '@/components/EventsDayList';
import { EventsFilters } from '@/components/EventsFilters';
import { EventsMonthCalendar } from '@/components/EventsMonthCalendar';
import { EventsViewToggle } from '@/components/EventsViewToggle';
import { listEventsInRange, listUpcomingEvents } from '@/lib/events';
import {
  formatMonthTitle,
  gridRange,
  nextMonth,
  osloDayKey,
  parseEventsSearchParams,
  prevMonth,
  type EventFormatValue,
  type EventTypeValue,
} from '@/lib/events-view';

/**
 * 012 — "Arrangementer" (contracts/events-page-ui.md). One server component, two views driven
 * entirely by URL search params (FR-001, graceful fallbacks FR-018), so everything works with
 * client-side scripting disabled (SC-004). Liste: published upcoming events, grouped per Oslo
 * day, filtered server-side (FR-002/005). Kalender: the displayed month's full 6-week grid,
 * past-in-month included (FR-006/007). Access is gated by `(app)/layout.tsx` `requireSession()`.
 *
 * 026: Designsystemet heading and button links; month navigation is tertiary icon buttons with
 * spoken names, and the month heading (h2) exists in the calendar view only, above its table.
 */

type SearchParams = Record<string, string | string[] | undefined>;

function monthHref(year: number, month: number): string {
  return `/events?view=kalender&month=${year}-${String(month).padStart(2, '0')}`;
}

export const metadata = { title: 'Arrangementer' };

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const state = parseEventsSearchParams(await searchParams);

  return (
    <div className="app-container">
      <div className="app-section">
        <div className="app-page-head">
          <h1 className="ds-heading" data-size="xl">
            Arrangementer
          </h1>
          <EventsViewToggle view={state.view} />
        </div>

        {state.view === 'kalender' ? (
          <CalendarView year={state.year} month={state.month} />
        ) : (
          <ListView types={state.types} form={state.form} />
        )}
      </div>
    </div>
  );
}

async function ListView({
  types,
  form,
}: {
  types: EventTypeValue[];
  form?: EventFormatValue;
}) {
  // The read lib boosts featured events first (011 frontpage contract); the grouped list is
  // strictly chronological (FR-002), so restore soonest-first before grouping by day.
  const events = (await listUpcomingEvents({ types, form })).sort(
    (a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime(),
  );
  const hasActiveFilters = types.length > 0 || Boolean(form);

  return (
    <div className="app-sidebar-layout">
      <EventsFilters activeTypes={types} activeForm={form} />
      <EventsDayList events={events} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}

async function CalendarView({ year, month }: { year: number; month: number }) {
  const range = gridRange(year, month);
  const events = await listEventsInRange(range.fromIso, range.toIso);
  const prev = prevMonth(year, month);
  const next = nextMonth(year, month);

  return (
    <div>
      <div className="app-monthnav">
        <Link
          href={monthHref(prev.year, prev.month)}
          aria-label="Forrige måned"
          className="ds-button"
          data-variant="tertiary"
          data-icon="true"
        >
          <ChevronLeftIcon aria-hidden />
        </Link>
        <h2 className="ds-heading" data-size="md">
          {formatMonthTitle(year, month)}
        </h2>
        <Link
          href={monthHref(next.year, next.month)}
          aria-label="Neste måned"
          className="ds-button"
          data-variant="tertiary"
          data-icon="true"
        >
          <ChevronRightIcon aria-hidden />
        </Link>
      </div>
      <EventsMonthCalendar
        year={year}
        month={month}
        todayKey={osloDayKey(new Date())}
        events={events}
      />
    </div>
  );
}
