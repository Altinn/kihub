import Link from 'next/link';
import { formatTimeHM } from '@/lib/event-dates';
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPES,
  buildMonthGrid,
  eventDayKeys,
  weekdayHeaders,
  type EventTypeValue,
} from '@/lib/events-view';
import type { Event } from '@/payload-types';

/**
 * 012 US2 — the month grid (FR-006/007/008): legend mapping the five event types to their
 * categorical colors (name always in text — SC-007), Monday-first MAN–SØN headers, 6×7 cells
 * with dimmed adjacent-month days and a highlighted today. Multi-day events appear in every
 * spanned cell; a cell shows at most MAX_CELL_ENTRIES entries + "+N flere" (the list view
 * carries the full set). Table semantics for screen-reader navigation.
 */

const MAX_CELL_ENTRIES = 3;

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
      <ul className="ev-legend" aria-label="Fargeforklaring for arrangementstyper">
        {EVENT_TYPES.map((type) => (
          <li key={type}>
            <span
              className="ev-legend__swatch"
              style={{ background: `var(--ev-cat-${type})` }}
              aria-hidden="true"
            />
            {EVENT_TYPE_LABELS[type]}
          </li>
        ))}
      </ul>

      <div className="ev-cal-scroll">
        <table className="ev-cal">
          <thead>
            <tr>
              {weekdayHeaders().map((day) => (
                <th key={day} scope="col">
                  {day}
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
                  return (
                    <td
                      key={cell.dayKey}
                      className={`ev-cell${cell.inMonth ? '' : ' ev-cell--dim'}`}
                    >
                      <span className={`ev-cell__day${cell.isToday ? ' ev-cell__day--today' : ''}`}>
                        {cell.dayNumber}
                      </span>
                      {cellEvents.slice(0, MAX_CELL_ENTRIES).map((event) => {
                        const type = event.eventType as EventTypeValue;
                        return (
                          <Link
                            key={`${event.id}-${cell.dayKey}`}
                            href={`/events/${event.slug ?? ''}`}
                            className="ev-entry kihub-focusable"
                            aria-label={`${event.title}, ${EVENT_TYPE_LABELS[type]}, ${formatTimeHM(event.startDateTime)}`}
                          >
                            <span
                              className="ev-entry__dot"
                              style={{ background: `var(--ev-cat-${type})` }}
                              aria-hidden="true"
                            />
                            <span className="ev-entry__text">
                              {formatTimeHM(event.startDateTime)} {event.title}
                            </span>
                          </Link>
                        );
                      })}
                      {overflow > 0 ? (
                        <span className="ev-cell__more">+{overflow} flere</span>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
