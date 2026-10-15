import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

// 023 (research R9): editorial pages, components, view helpers and the read-layer facades use KI
// Hub's own view models and <RichTextBody>; only the content source's adapters talk to Payload, and
// only the registry picks an adapter. This keeps a module movable to another CMS by configuration.
const CONTENT_SEAM_MESSAGE =
  'Editorial pages/components use KI Hub view models from @/lib/content/types and <RichTextBody> — ' +
  'Payload access lives in src/lib/content/payload/, reached only through src/lib/content/registry.ts (023).';

// eslint-config-next 16 ships native flat configs — spread them directly. (The older
// FlatCompat(`compat.extends('next/core-web-vitals')`) path crashes under ESLint 9.39 +
// @eslint/eslintrc, which JSON.stringifies the config and hits a circular ref in the Next plugin.)
const config = [
  { ignores: ['.next/**', 'node_modules/**', 'src/app/(payload)/**', 'src/payload-types.ts'] },
  ...nextCoreWebVitals,
  {
    files: [
      'src/app/(app)/**/*.{ts,tsx}',
      'src/components/**/*.{ts,tsx}',
      'src/lib/*-view.ts',
      'src/lib/frontpage-select.ts',
      'src/lib/site-content-defaults.ts',
      'src/lib/news.ts',
      'src/lib/events.ts',
      'src/lib/projects.ts',
      'src/lib/learning.ts',
      'src/lib/site-content.ts',
      'src/lib/content/*.ts',
    ],
    ignores: [
      // Payload admin custom components — Payload-specific by definition.
      'src/components/cms/**',
      // The lexical (Payload) branch of <RichTextBody>.
      'src/components/rich-text/LexicalRichText.tsx',
      // The per-module switch itself: the one place that imports a source's adapters.
      'src/lib/content/registry.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: '@/payload-types', message: CONTENT_SEAM_MESSAGE },
            { name: 'payload', message: CONTENT_SEAM_MESSAGE },
            { name: '@payload-config', message: CONTENT_SEAM_MESSAGE },
          ],
          patterns: [
            { group: ['@payloadcms/*'], message: CONTENT_SEAM_MESSAGE },
            {
              group: ['@/lib/content/payload', '@/lib/content/payload/*', '**/content/payload', '**/content/payload/*', './payload', './payload/*'],
              message: CONTENT_SEAM_MESSAGE,
            },
          ],
        },
      ],
    },
  },
];

export default config;
