import type { CollectionConfig } from 'payload';
import { CONTENT_VERSIONS, contentAccess } from '../lib/content-versions';
import { previewUrl } from '../lib/preview-paths';
import { validateEventInterval } from '../lib/event-dates';
import { EVENT_FORMAT_LABELS, EVENT_TYPE_LABELS, validateSeatCapacity } from '../lib/events-view';
import { slugify } from '../lib/slug';

/**
 * Phase 8 — Calendar / Events. A native platform-content collection (Constitution Principle II):
 * events are authored and published in the `/cms` back-office and read by all employees in the app.
 * Events has no Git source and is NOT an artifact; it has no relationship at all — the organizer is
 * a free-text label (research §7).
 *
 * Authoring is gated to Contributor+ (the same posture as the Phase 6 admin gate); Events is
 * intentionally NOT wired into `@kihub/governance-core`'s Registry permission matrix (research §3).
 * Employees only ever see `published` events — enforced both here (the `read` access rule constrains
 * non-editors) and in `lib/events.ts` (the read queries filter `_status: published`). The employee
 * list additionally hides past events, which is a list-only concern in `lib/events.ts` (FR-004) — a
 * published past event stays reachable by its detail URL.
 *
 * 027: Payload's built-in drafts (`lib/content-versions.ts`) replaced the hand-rolled `status`
 * select; `readVersions` keeps version history (which holds draft content) editor-only.
 */

export const Event: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'startDateTime', 'eventType', 'format', 'location'],
    // 027 — «Forhåndsvis»: opens the latest draft on the employee site for editors (lib/preview-paths.ts).
    preview: (doc) => previewUrl('events', doc?.slug as string | undefined),
  },
  // Contributor+ read everything (drafts + published, and version history) in the back-office/API;
  // everyone else is constrained to published — API-path defense in depth for "no draft leaks".
  access: contentAccess,
  versions: CONTENT_VERSIONS,
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data;
        // Derive a URL-safe slug from the title when the editor leaves it blank (FR-013); keep any
        // explicit slug so it stays stable across title edits.
        if (!data.slug && typeof data.title === 'string' && data.title.trim()) {
          data.slug = slugify(data.title);
        }
        // Reject an end datetime that precedes the start (FR-011); a missing end is always valid.
        if (data.startDateTime) {
          validateEventInterval(
            data.startDateTime as string | Date,
            data.endDateTime as string | Date | null | undefined,
          );
        }
        // 012 FR-012: capacity/seatsTaken must be whole numbers in range and seatsTaken ≤ capacity.
        validateSeatCapacity(
          data.capacity as number | null | undefined,
          data.seatsTaken as number | null | undefined,
        );
        return data;
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      // Not API-required: always populated by the `beforeValidate` hook from the (required) title.
      // Uniqueness — the FR-013 guarantee — comes from `unique`, not from requiredness.
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { description: 'URL handle (/events/<slug>); auto-derived from the title when left blank.' },
    },
    { name: 'description', type: 'richText', required: true },
    {
      name: 'startDateTime',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime', timeIntervals: 15 },
        description: 'When the event starts (Europe/Oslo).',
      },
    },
    {
      name: 'endDateTime',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime', timeIntervals: 15 },
        description: 'Optional end; must not be before the start.',
      },
    },
    { name: 'location', type: 'text', admin: { description: 'Free-text place (optional).' } },
    {
      name: 'onlineUrl',
      type: 'text',
      label: 'Online meeting URL',
      admin: { description: 'Optional online-meeting link.' },
    },
    {
      name: 'organizer',
      type: 'text',
      admin: { description: 'Who runs the event — a person, team, or external party (free text).' },
    },
    {
      // 012 FR-009: closed category set driving the type badge, calendar color, and TYPE filter.
      name: 'eventType',
      type: 'select',
      required: true,
      defaultValue: 'internt',
      options: (Object.entries(EVENT_TYPE_LABELS) as [string, string][]).map(
        ([value, label]) => ({ value, label }),
      ),
      admin: { description: 'Category shown as the badge and the calendar color.' },
    },
    {
      // 012 FR-009: form of participation driving the FORM filter and the "Digitalt" place text.
      name: 'format',
      type: 'select',
      required: true,
      defaultValue: 'digitalt',
      options: (Object.entries(EVENT_FORMAT_LABELS) as [string, string][]).map(
        ([value, label]) => ({ value, label }),
      ),
      admin: {
        description: 'Form of participation — drives the FORM filter and the "Digitalt" place text.',
      },
    },
    {
      name: 'channel',
      type: 'text',
      admin: { description: 'Delivery channel for digital/hybrid events, e.g. "Teams" (optional).' },
    },
    {
      // Capacity is the switch: set → "X av Y plasser igjen"; unset → "Åpen for alle" (FR-004).
      name: 'capacity',
      type: 'number',
      min: 1,
      admin: { description: 'Total seats. Leave blank for open events ("Åpen for alle").' },
    },
    {
      name: 'seatsTaken',
      type: 'number',
      min: 0,
      admin: {
        description:
          'Seats already taken (maintained editorially — no registration flow). Never above capacity.',
      },
    },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'featured', type: 'checkbox', defaultValue: false },
  ],
};
