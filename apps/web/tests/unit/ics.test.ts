import { describe, expect, it } from 'vitest';
import { buildEventIcs } from '@/lib/ics';

/**
 * T002 (US2, FR-007) — the pure RFC 5545 generator behind "+ Legg til i kalender"
 * (contracts/event-ics.md). No dependencies, no Payload imports.
 */

const BASE_URL = 'https://kihub.example.com';

const baseEvent = {
  title: 'Kom i gang med Claude Teams i BOD',
  slug: 'kom-i-gang-med-claude-teams',
  startDateTime: '2026-07-03T08:00:00.000Z',
};

/** Unfold folded lines (CRLF + single space/tab continuation) for content assertions. */
function unfold(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '');
}

describe('buildEventIcs (contracts/event-ics.md)', () => {
  it('emits a VCALENDAR/VEVENT envelope with VERSION and PRODID', () => {
    const ics = unfold(buildEventIcs(baseEvent, BASE_URL));
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('VERSION:2.0\r\n');
    expect(ics).toContain('PRODID:');
    expect(ics).toContain('BEGIN:VEVENT\r\n');
    expect(ics).toContain('END:VEVENT\r\n');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('uses CRLF line endings exclusively', () => {
    const ics = buildEventIcs(baseEvent, BASE_URL);
    expect(ics).not.toMatch(/[^\r]\n/); // every \n is preceded by \r
    expect(ics).toContain('\r\n');
  });

  it('folds so no line exceeds 75 octets (excluding CRLF)', () => {
    const long = {
      ...baseEvent,
      title:
        'Et usedvanlig langt arrangementsnavn som helt sikkert kommer til å overstige grensen på syttifem oktetter per linje i kalenderfilen',
    };
    const lines = buildEventIcs(long, BASE_URL).split('\r\n');
    for (const line of lines) {
      expect(Buffer.byteLength(line, 'utf8')).toBeLessThanOrEqual(75);
    }
  });

  it('derives a stable UID from the slug', () => {
    const first = unfold(buildEventIcs(baseEvent, BASE_URL));
    const second = unfold(buildEventIcs(baseEvent, BASE_URL));
    expect(first).toContain('UID:kom-i-gang-med-claude-teams@kihub\r\n');
    expect(second).toContain('UID:kom-i-gang-med-claude-teams@kihub\r\n');
  });

  it('emits DTSTART (and DTSTAMP) in UTC basic format', () => {
    const ics = unfold(buildEventIcs(baseEvent, BASE_URL));
    expect(ics).toContain('DTSTART:20260703T080000Z\r\n');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z\r\n/);
  });

  it('emits DTEND when endDateTime is present and omits it otherwise', () => {
    const withEnd = unfold(
      buildEventIcs({ ...baseEvent, endDateTime: '2026-07-03T09:30:00.000Z' }, BASE_URL),
    );
    expect(withEnd).toContain('DTEND:20260703T093000Z\r\n');
    expect(unfold(buildEventIcs(baseEvent, BASE_URL))).not.toContain('DTEND:');
  });

  it('emits LOCATION only when present', () => {
    const withLocation = unfold(
      buildEventIcs({ ...baseEvent, location: 'Møterom Fjorden' }, BASE_URL),
    );
    expect(withLocation).toContain('LOCATION:Møterom Fjorden\r\n');
    expect(unfold(buildEventIcs(baseEvent, BASE_URL))).not.toContain('LOCATION:');
  });

  it('escapes TEXT values per RFC 5545 §3.3.11', () => {
    const tricky = {
      ...baseEvent,
      title: 'Kaffe, kake; og backslash \\ quiz',
      location: 'Rom 1; etasje 2, bygg A',
    };
    const ics = unfold(buildEventIcs(tricky, BASE_URL));
    expect(ics).toContain('SUMMARY:Kaffe\\, kake\\; og backslash \\\\ quiz\r\n');
    expect(ics).toContain('LOCATION:Rom 1\\; etasje 2\\, bygg A\r\n');
  });

  it('links back to the event detail page via URL', () => {
    const ics = unfold(buildEventIcs(baseEvent, BASE_URL));
    expect(ics).toContain(`URL:${BASE_URL}/events/kom-i-gang-med-claude-teams\r\n`);
  });

  it('describes organizer and online URL when present', () => {
    const ics = unfold(
      buildEventIcs(
        { ...baseEvent, organizer: 'KITT-teamet', onlineUrl: 'https://teams.example.com/join' },
        BASE_URL,
      ),
    );
    expect(ics).toMatch(/DESCRIPTION:.*KITT-teamet/);
    expect(ics).toMatch(/DESCRIPTION:.*https:\/\/teams.example.com\/join/);
    expect(unfold(buildEventIcs(baseEvent, BASE_URL))).not.toContain('DESCRIPTION:');
  });
});
