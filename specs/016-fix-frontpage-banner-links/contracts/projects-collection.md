# Contract: `projects` Payload collection

Mirrors the shape and posture of `apps/web/src/collections/News.ts` (see data-model.md for the
full field table).

## Schema (admin-relevant summary)

```ts
export const Project: CollectionConfig = {
  slug: 'projects',
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'status', 'order'] },
  access: {
    read: ({ req }) => (isEditor(req.user) ? true : { status: { equals: 'published' } }),
    create: ({ req }) => isEditor(req.user),
    update: ({ req }) => isEditor(req.user),
    delete: ({ req }) => isEditor(req.user),
  },
  hooks: {
    beforeValidate: [/* auto-slug from title when blank, same as News */],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'summary', type: 'textarea' },
    { name: 'body', type: 'richText', required: true },
    { name: 'status', type: 'select', required: true, defaultValue: 'draft', options: ['draft', 'published'] },
    { name: 'order', type: 'number', defaultValue: 100 },
  ],
};
```

## Read-layer contract (`apps/web/src/lib/projects.ts`)

- `listPublishedProjects(): Promise<Project[]>` — always filters `status: { equals: 'published' }`;
  sorted by `order` ascending (tie-break: Payload's default `-createdAt` stays stable). Never
  returns drafts, by construction — mirrors `listPublishedNews`.
- `getPublishedProjectBySlug(slug: string): Promise<Project | null>` — `where: { and: [{ slug: {
  equals: slug } }, { status: { equals: 'published' } }] }`; `null` when missing/draft → caller
  renders 404 (FR-009), mirroring `getPublishedNewsBySlug`.

## Registration contract

- `apps/web/src/payload.config.ts` — `Project` added to the `collections` array.
- A new Postgres migration (via `pnpm --filter web migrate:create`) creates the `projects` table
  and any `payload_locked_documents_rels` column Payload's schema diff requires — generated, not
  hand-written, matching every other collection in `apps/web/src/migrations/`.
