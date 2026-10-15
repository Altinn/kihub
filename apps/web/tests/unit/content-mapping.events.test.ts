import { describe, expect, it } from 'vitest';
import { toEventItem } from '@/lib/content/payload/events';
import type { Event } from '@/payload-types';

/** 023 T016 — Payload Event → EventItem (data-model.md). */

const description = {
  root: { type: 'root', children: [], direction: 'ltr', format: '', indent: 0, version: 1 },
} as Event['description'];

const event = (overrides: Partial<Event> = {}): Event => ({
  id: 7,
  title: 'Webinar',
  slug: 'webinar',
  description,
  startDateTime: '2026-10-20T08:00:00.000Z',
  eventType: 'webinar',
  format: 'digitalt',
  status: 'published',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  ...overrides,
});

describe('toEventItem', () => {
  it('maps every nullable field to null when absent', () => {
    expect(toEventItem(event())).toEqual({
      id: '7',
      slug: 'webinar',
      title: 'Webinar',
      description: { format: 'lexical', document: description },
      startDateTime: '2026-10-20T08:00:00.000Z',
      endDateTime: null,
      location: null,
      onlineUrl: null,
      organizer: null,
      channel: null,
      eventType: 'webinar',
      format: 'digitalt',
      capacity: null,
      seatsTaken: null,
    });
  });

  it('passes values through, keeping 0 seats taken as 0', () => {
    const item = toEventItem(
      event({
        slug: null,
        endDateTime: '2026-10-20T09:00:00.000Z',
        location: 'Oslo',
        onlineUrl: 'https://teams.example',
        organizer: 'KI-teamet',
        channel: 'Teams',
        eventType: 'kurs',
        format: 'hybrid',
        capacity: 20,
        seatsTaken: 0,
      }),
    );
    expect(item).toMatchObject({
      slug: '',
      endDateTime: '2026-10-20T09:00:00.000Z',
      location: 'Oslo',
      onlineUrl: 'https://teams.example',
      organizer: 'KI-teamet',
      channel: 'Teams',
      eventType: 'kurs',
      format: 'hybrid',
      capacity: 20,
      seatsTaken: 0,
    });
  });

  it('carries no status/featured/tags/timestamps (ordering is the source’s job)', () => {
    const item = toEventItem(event({ featured: true, tags: ['x'] })) as unknown as Record<string, unknown>;
    for (const key of ['status', 'featured', 'tags', 'createdAt', 'updatedAt']) {
      expect(item).not.toHaveProperty(key);
    }
  });
});
