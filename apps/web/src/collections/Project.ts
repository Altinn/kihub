import type { CollectionConfig } from 'payload';
import { CONTENT_VERSIONS, contentAccess } from '../lib/content-versions';
import { previewUrl } from '../lib/preview-paths';
import { slugify } from '../lib/slug';

/**
 * 016 — Prosjekt. Native platform content (Constitution Principle II) shown to employees at
 * `/prosjekter`: a flat, editor-authored list of AI projects underway in Digdir (Altinn/kihub#135).
 * No Git source, no relationship to `Artifact` — a project is not an AI asset (Principle III).
 *
 * Access and the auto-slug hook follow `News.ts`/`LearningPage.ts` rather than reinventing them:
 * Contributor+ read everything (drafts + published); everyone else is constrained to `published`
 * — the second line of defence alongside `lib/projects.ts`'s own status filter, so a draft cannot
 * leak through the employee pages or the REST/GraphQL path.
 *
 * 027: Payload's built-in drafts (`lib/content-versions.ts`) replaced the hand-rolled `status`
 * select; `readVersions` keeps version history (which holds draft content) editor-only.
 */
export const Project: CollectionConfig = {
  slug: 'projects',
  labels: { singular: 'Prosjekt', plural: 'Prosjekter' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', '_status', 'order'],
    // 027 — «Forhåndsvis»: opens the latest draft on the employee site for editors (lib/preview-paths.ts).
    preview: (doc) => previewUrl('projects', doc?.slug as string | undefined),
  },
  access: contentAccess,
  versions: CONTENT_VERSIONS,
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Derive a URL-safe slug from the title when the editor leaves it blank; keep any
        // explicit slug so it stays stable across title edits (same pattern as News/LearningPage).
        if (data && !data.slug && typeof data.title === 'string' && data.title.trim()) {
          data.slug = slugify(data.title);
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Tittel',
      // A whitespace-only title passes Payload's own `required` check (it's a non-empty string)
      // but the beforeValidate hook below only derives a slug from a non-blank title — reject it
      // here so a published project can never end up without one (a card with no slug would link
      // to `/prosjekter/`, not a real page).
      validate: (value: string | null | undefined) =>
        typeof value === 'string' && value.trim().length > 0
          ? true
          : 'Tittel kan ikke være tom eller bare mellomrom.',
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      label: 'Adresse',
      admin: {
        description: 'URL-håndtak (/prosjekter/<adresse>); utledes fra tittelen når feltet står tomt.',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      label: 'Sammendrag',
      admin: { description: 'Kort ingress vist i prosjektlisten.' },
    },
    { name: 'body', type: 'richText', required: true, label: 'Beskrivelse' },
    {
      name: 'order',
      type: 'number',
      defaultValue: 100,
      label: 'Rekkefølge',
      admin: {
        position: 'sidebar',
        description: 'Lav verdi vises først; like verdier sorteres etter opprettelsesdato.',
      },
    },
  ],
};
