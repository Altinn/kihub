import Link from 'next/link';
import { EventsDayList } from '@/components/EventsDayList';
import { formatTimeHM } from '@/lib/event-dates';
import {
  EVENT_TYPE_COLORS,
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  buildMonthGrid,
  eventDayKeys,
  formatDateChip,
  formatMonthTitle,
  weekdayHeaders,
  type EventTypeValue,
} from '@/lib/events-view';
import type { Event } from '@/payload-types';

/**
 * 012 US2 — the month grid (FR-006/007/008): legend mapping the five event types to their
 * categorical colours (name always in text — SC-007), Monday-first weekday headers, 6×7 cells
 * with dimmed adjacent-month days and a highlighted today. Multi-day events appear in every
 * spanned cell; a cell shows at most MAX_CELL_ENTRIES entries + "+N flere" (the list view
 * carries the full set). Table semantics for screen-reader navigation.
 *
 * Narrow viewports get a different treatment instead of a sideways-scrolling table: the grid
 * compacts to a viewport-wide overview (day numbers + type-coloured dots, entry links hidden) and
 * the month's events render as a tappable agenda list below. Both variants are in the DOM; CSS
 * media queries pick one — no client JS.
 *
 * 026: a Designsystemet `ds-table` with a `<caption>` naming the month; sentence-case weekday
 * headers with the full day name for screen readers; every entry's accessible name carries its
 * date, time and type (FR-017); today is `aria-current="date"`; "+N flere" links to that day in
 * the list view when the day is still upcoming. Type colours come from Designsystemet via
 * `data-color` (no inline styles); the phone dots are decorative — the agenda below states the
 * type in text.
 */

const MAX_CELL_ENTRIES = 3;
/** Dot overview cap on mobile — enough to signal "busy day" without overflowing a small cell. */
const MAX_CELL_DOTS = 4;

export function EventsMonthCalendar({
  year,
  month,
  todayKey,
  events,
}: {
  year: number;
  month: number;
  todayKey: string;
  events: Event[];
}) {
  const grid = buildMonthGrid(year, month, todayKey);

  // dayKey → events shown in that cell, insertion-ordered by start (events arrive sorted).
  const byDay = new Map<string, Event[]>();
  for (const event of events) {
    for (const key of eventDayKeys(event)) {
      const cell = byDay.get(key);
      if (cell) cell.push(event);
      else byDay.set(key, [event]);
    }
  }

  return (
    <div>
      <ul className="app-legend" aria-label="Fargeforklaring for arrangementstyper">
        {EVENT_TYPES.map((type) => (
          <li key={type}>
            <span className="app-dot" data-color={EVENT_TYPE_COLORS[type]} aria-hidden="true" />
            {EVENT_TYPE_LABELS[type]}
          </li>
        ))}
      </ul>

      <table className="ds-table app-cal" data-border="true">
        <caption className="ds-sr-only">{formatMonthTitle(year, month)}</caption>
        <thead>
          <tr>
            {weekdayHeaders().map((day) => (
              <th key={day.long} scope="col">
                <span aria-hidden="true">{day.short}</span>
                <span className="ds-sr-only">{day.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week, weekIndex) => (
            <tr key={week[0]?.dayKey ?? weekIndex}>
              {week.map((cell) => {
                const cellEvents = byDay.get(cell.dayKey) ?? [];
                const overflow = cellEvents.length - MAX_CELL_ENTRIES;
                const dayLabel = formatDateChip(cell.dayKey);
                return (
                  <td
                    key={cell.dayKey}
                    className={`app-cal__cell${cell.inMonth ? '' : ' app-cal__cell--dim'}`}
                    aria-current={cell.isToday ? 'date' : undefined}
                  >
                    <span className="app-cal__day">
                      {cell.dayNumber}
                      {cell.isToday ? <span className="ds-sr-only"> (i dag)</span> : null}
                    </span>
                    {cellEvents.slice(0, MAX_CELL_ENTRIES).map((event) => {
                      const type = event.eventType as EventTypeValue;
                      const time = formatTimeHM(event.startDateTime);
                      return (
                        <Link
                          key={`${event.id}-${cell.dayKey}`}
                          href={`/events/${event.slug ?? ''}`}
                          className="app-cal__entry ds-focus"
                          aria-label={`${event.title}, ${EVENT_TYPE_LABELS[type]}, ${dayLabel} kl. ${time}`}
                        >
                          <span className="app-dot" data-color={EVENT_TYPE_COLORS[type]} aria-hidden="true" />
                          <span className="app-cal__entry-text">
                            {time} {event.title}
                          </span>
                        </Link>
                      );
                    })}
                    {overflow > 0 ? (
                      cell.dayKey >= todayKey ? (
                        <Link href={`/events#dag-${cell.dayKey}`} className="ds-link app-cal__more">
                          +{overflow} flere<span className="ds-sr-only"> {dayLabel}</span>
                        </Link>
                      ) : (
                        <span className="app-cal__more">+{overflow} flere</span>
                      )
                    ) : null}
                    {cellEvents.length > 0 ? (
                      // Phone-only overview dots (CSS-toggled); the agenda below carries the
                      // readable, tappable entries with the type in text, so these are decorative.
                      <span className="app-cal__dots" aria-hidden="true">
                        {cellEvents.slice(0, MAX_CELL_DOTS).map((event) => (
                          <span
                            key={`dot-${event.id}-${cell.dayKey}`}
                            className="app-dot"
                            data-color={EVENT_TYPE_COLORS[event.eventType as EventTypeValue]}
                          />
                        ))}
                      </span>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <MonthAgenda year={year} month={month} events={events} />
    </div>
  );
}

/**
 * Phone-only agenda for the displayed month (hidden on desktop via `.app-agenda`): the month's
 * events — including any spanning into it from an adjacent month — as the same grouped rows the
 * list view uses, one heading level below the month heading.
 */
function MonthAgenda({ year, month, events }: { year: number; month: number; events: Event[] }) {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const monthEvents = events.filter((event) =>
    eventDayKeys(event).some((key) => key.startsWith(monthPrefix)),
  );

  return (
    <div className="app-agenda">
      {monthEvents.length === 0 ? (
        <p className="ds-paragraph app-meta">Ingen arrangementer denne måneden.</p>
      ) : (
        <EventsDayList events={monthEvents} hasActiveFilters={false} headingLevel={3} />
      )}
    </div>
  );
}
