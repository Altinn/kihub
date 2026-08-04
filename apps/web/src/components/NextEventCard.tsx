import Link from 'next/link';
import type { Event } from '@/payload-types';
import {
  formatDayNumeral,
  formatMonthYear,
  formatTimeHM,
  formatWeekday,
} from '@/lib/event-dates';

/**
 * 011 US2 — the "Neste arrangement" card (contracts/frontpage-read.md): tinted date zone with the
 * big day numeral, then tag, title, meta line, a primary "Se arrangementet" action to the detail
 * page (no registration concept — clarification) and the "+ Legg til i kalender" ICS download.
 */

/** Compose the meta line from the parts that exist — never a dangling separator. */
function metaLine(event: Event): string {
  return [event.location, event.onlineUrl ? 'Digitalt' : null, event.organizer]
    .filter(Boolean)
    .join(' · ');
}

export function NextEventCard({ event }: { event: Event }) {
  const slug = event.slug ?? '';
  const tag = event.tags?.[0];
  const meta = metaLine(event);

  return (
    <article
      className="kihub-card"
      style={{ padding: 0, overflow: 'hidden' }}
      aria-label="Neste arrangement"
    >
      <div style={{ background: 'var(--kihub-surface-accent)', padding: '20px 22px' }}>
        <p className="kihub-eyebrow" style={{ margin: 0 }}>
          Neste arrangement
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 'var(--kihub-space-3)',
            marginTop: 'var(--kihub-space-2)',
          }}
        >
          <span
            style={{
              font: '400 40px/1 var(--kihub-font-display)',
              color: 'var(--kihub-text)',
            }}
          >
            {formatDayNumeral(event.startDateTime)}
          </span>
          <span
            style={{
              font: '400 18px var(--kihub-font-display)',
              color: 'var(--kihub-text-subtle)',
            }}
          >
            {formatMonthYear(event.startDateTime)} · {formatWeekday(event.startDateTime)} ·{' '}
            {formatTimeHM(event.startDateTime)}
          </span>
        </div>
      </div>

      <div style={{ padding: '20px 22px' }}>
        {tag ? (
          <span
            className="kihub-tag kihub-tag--tinted"
            style={{ textTransform: 'uppercase', letterSpacing: '.1em', fontSize: '12px' }}
          >
            {tag}
          </span>
        ) : null}
        <h3 className="kihub-h4" style={{ marginTop: tag ? 'var(--kihub-space-4)' : 0 }}>
          <Link
            href={`/events/${slug}`}
            className="kihub-focusable"
            style={{ color: 'inherit', textDecoration: 'none' }}
          >
            {event.title}
          </Link>
        </h3>
        {meta ? (
          <p
            style={{
              margin: 'var(--kihub-space-2) 0 0',
              font: '400 13px var(--kihub-font-ui)',
              color: 'var(--kihub-text-subtle)',
            }}
          >
            {meta}
          </p>
        ) : null}
        <Link
          href={`/events/${slug}`}
          className="kihub-btn kihub-btn--primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--kihub-space-5)' }}
        >
          Se arrangementet
        </Link>
        <p style={{ margin: 'var(--kihub-space-4) 0 0', textAlign: 'center' }}>
          <a
            href={`/events/${slug}/ics`}
            className="kihub-link"
            style={{ font: '400 15px var(--kihub-font-display)' }}
          >
            + Legg til i kalender
          </a>
        </p>
      </div>
    </article>
  );
}
