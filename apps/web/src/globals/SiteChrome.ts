import type { Role } from '@kihub/governance-core';
import type { GlobalConfig } from 'payload';
import { DEFAULT_SITE_CHROME } from '../lib/site-content-defaults';

/**
 * 011 frontpage — the `site-chrome` global: header navigation + footer content rendered on every
 * employee page (contracts/site-content-globals.md). Native platform content (Constitution
 * Principle II) authored in the back-office; the employee app reads it through
 * `lib/site-content.ts` only. Update is gated to Contributor+ — the same `role !== 'reader'`
 * posture as News/Events — enforced server-side (Principle VIII).
 */
function isEditor(user: { role?: unknown } | null | undefined): boolean {
  return Boolean(user) && (user?.role as Role) !== 'reader';
}

export const SiteChrome: GlobalConfig = {
  slug: 'site-chrome',
  label: 'Site chrome (header & footer)',
  access: {
    read: () => true,
    update: ({ req }) => isEditor(req.user),
  },
  fields: [
    {
      name: 'nav',
      type: 'array',
      labels: { singular: 'Nav item', plural: 'Nav items' },
      admin: { description: 'Header navigation, in order.' },
      minRows: 1,
      maxRows: 8,
      defaultValue: DEFAULT_SITE_CHROME.nav,
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
    {
      name: 'footer',
      type: 'group',
      fields: [
        {
          name: 'contactLabel',
          type: 'text',
          defaultValue: DEFAULT_SITE_CHROME.footer.contactLabel,
        },
        {
          name: 'contactEmail',
          type: 'email',
          defaultValue: DEFAULT_SITE_CHROME.footer.contactEmail,
        },
        {
          name: 'links',
          type: 'array',
          labels: { singular: 'Footer link', plural: 'Footer links' },
          maxRows: 10,
          defaultValue: DEFAULT_SITE_CHROME.footer.links,
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'href', type: 'text', required: true },
          ],
        },
      ],
    },
  ],
};
