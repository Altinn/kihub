import type { Role } from '@kihub/governance-core';
import type { CollectionConfig } from 'payload';
import { validateEventInterval } from '../lib/event-dates';
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
 * non-editors) and in `lib/events.ts` (the read queries filter `status: published`). The employee
 * list additionally hides past events, which is a list-only concern in `lib/events.ts` (FR-004) — a
 * published past event stays reachable by its detail URL.
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const Event: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'startDateTime', 'featured', 'location'],
  },
  access: {
    // Contributor+ read everything (drafts + published) in the back-office/API; everyone else is
    // constrained to published — API-path defense in depth for the "no draft leaks" invariant (US3).
    read: ({ req }) => (isEditor(req.user) ? true : { status: { equals: 'published' } }),
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
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
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: ['draft', 'published'],
    },
    { name: 'tags', type: 'text', hasMany: true },
    { name: 'featured', type: 'checkbox', defaultValue: false },
  ],
};
