import type { Role } from '@kihub/governance-core';
import type { GlobalConfig } from 'payload';
import { DEFAULT_FRONTPAGE } from '../lib/site-content-defaults';

/**
 * 011 frontpage — the `frontpage` global: hero, the two navigation tiles, and the "Tilgjengelige
 * abonnementer" banner (contracts/site-content-globals.md). The sections are fixed by the page
 * design (hence a singleton global and the fixed tile count); only their content is editable.
 * Same access posture as `site-chrome`: employee-read, Contributor+ update, enforced server-side.
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const Frontpage: GlobalConfig = {
  slug: 'frontpage',
  label: 'Frontpage (hero, tiles, subscriptions)',
  access: {
    read: () => true,
    update: ({ req }) => isEditor(req.user),
  },
  fields: [
    {
      name: 'hero',
      type: 'group',
      fields: [
        { name: 'eyebrow', type: 'text', defaultValue: DEFAULT_FRONTPAGE.hero.eyebrow },
        { name: 'heading', type: 'text', defaultValue: DEFAULT_FRONTPAGE.hero.heading },
        {
          name: 'accentWord',
          type: 'text',
          defaultValue: DEFAULT_FRONTPAGE.hero.accentWord,
          admin: {
            description:
              'Part of the heading rendered in the accent color (must match a substring of the heading).',
          },
        },
        { name: 'lead', type: 'textarea', defaultValue: DEFAULT_FRONTPAGE.hero.lead },
        {
          name: 'primaryCta',
          type: 'group',
          fields: [
            { name: 'label', type: 'text', defaultValue: DEFAULT_FRONTPAGE.hero.primaryCta?.label },
            { name: 'href', type: 'text', defaultValue: DEFAULT_FRONTPAGE.hero.primaryCta?.href },
          ],
        },
        {
          name: 'secondaryCta',
          type: 'group',
          fields: [
            {
              name: 'label',
              type: 'text',
              defaultValue: DEFAULT_FRONTPAGE.hero.secondaryCta?.label,
            },
            { name: 'href', type: 'text', defaultValue: DEFAULT_FRONTPAGE.hero.secondaryCta?.href },
          ],
        },
      ],
    },
    {
      name: 'tiles',
      type: 'array',
      labels: { singular: 'Tile', plural: 'Tiles' },
      admin: { description: 'The two navigation tiles below the hero (fixed count).' },
      minRows: 2,
      maxRows: 2,
      defaultValue: DEFAULT_FRONTPAGE.tiles,
      fields: [
        { name: 'tag', type: 'text' },
        { name: 'title', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
        {
          name: 'variant',
          type: 'select',
          options: [
            { label: 'Tinted (light blue)', value: 'tinted' },
            { label: 'Accent (blue)', value: 'accent' },
          ],
          defaultValue: 'tinted',
        },
      ],
    },
    {
      name: 'subscriptions',
      type: 'group',
      fields: [
        {
          name: 'eyebrow',
          type: 'text',
          defaultValue: DEFAULT_FRONTPAGE.subscriptions.eyebrow,
        },
        {
          name: 'heading',
          type: 'text',
          defaultValue: DEFAULT_FRONTPAGE.subscriptions.heading,
        },
        {
          name: 'description',
          type: 'textarea',
          defaultValue: DEFAULT_FRONTPAGE.subscriptions.description,
        },
        {
          name: 'chips',
          type: 'array',
          labels: { singular: 'Subscription', plural: 'Subscriptions' },
          maxRows: 12,
          defaultValue: DEFAULT_FRONTPAGE.subscriptions.chips,
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'href', type: 'text' },
          ],
        },
      ],
    },
  ],
};
