# Contract: `frontpage.subscriptions` field changes

Extends the existing `subscriptions` group on the `frontpage` global
(`apps/web/src/globals/Frontpage.ts`). No new global, no new collection.

## Field changes (admin-relevant summary)

```ts
{
  name: 'subscriptions',
  type: 'group',
  fields: [
    { name: 'eyebrow', type: 'text', defaultValue: DEFAULT_FRONTPAGE.subscriptions.eyebrow },
    { name: 'heading', type: 'text', defaultValue: DEFAULT_FRONTPAGE.subscriptions.heading },
    { name: 'description', type: 'textarea', defaultValue: DEFAULT_FRONTPAGE.subscriptions.description },
    {
      name: 'chips',
      type: 'array',
      labels: { singular: 'Subscription', plural: 'Subscriptions' },
      maxRows: 12,
      defaultValue: DEFAULT_FRONTPAGE.subscriptions.chips,
      fields: [
        { name: 'name', type: 'text', required: true },
        // 'href' REMOVED — chips no longer navigate (research.md R1/R3).
        {
          name: 'description', // NEW
          type: 'textarea',
          admin: { description: 'Short explanation shown when this tool is clicked.' },
        },
      ],
    },
    {
      name: 'requestAccess', // NEW
      type: 'group',
      admin: { description: 'The heavier "how do I get access" call-to-action.' },
      fields: [
        { name: 'label', type: 'text', defaultValue: DEFAULT_FRONTPAGE.subscriptions.requestAccess.label },
        { name: 'body', type: 'textarea', defaultValue: DEFAULT_FRONTPAGE.subscriptions.requestAccess.body },
      ],
    },
  ],
}
```

## `site-content-defaults.ts` contract

- `Chip` type: `href?: string` removed, `description?: string` added.
- New `RequestAccess` type: `{ label: string; body: string }`.
- `SubscriptionsContent` type gains `requestAccess: RequestAccess`.
- `DEFAULT_FRONTPAGE.subscriptions.chips` seeds a `description` for each of "GitHub Copilot" and
  "Claude Teams".
- `DEFAULT_FRONTPAGE.subscriptions.requestAccess` seeds `{ label: 'Hvordan bestille tilgang?', body:
  '<who-to-contact instructions, extends the existing "Ta kontakt med KITT for tilgang" messaging> ' }`.

## Read-layer contract (`lib/site-content.ts`)

- `mergeFrontpage`'s `subscriptions` branch maps each stored chip to `{ name, description }` (drops
  any stray stored `href` silently — the Payload field no longer exists post-migration, so this is
  purely a defensive shape match) and maps stored `requestAccess` to `{ label, body }`, falling back
  per-field to `DEFAULT_FRONTPAGE.subscriptions.requestAccess` values when a stored value is falsy —
  same per-field fallback style already used for `hero.primaryCta`/`secondaryCta`.
- The existing whole-section fallback rule is unchanged: if the stored `subscriptions` group has no
  `heading` and no `chips`, the entire section (including `requestAccess`) falls back to
  `DEFAULT_FRONTPAGE.subscriptions`.

## Migration contract

- Generated via `pnpm --filter web migrate:create subscriptions_request_access`, verified on a
  scratch DB per research.md R4, hand-checked (not assumed) for the `IF EXISTS` generator quirk.
- `up`: `ALTER TABLE "frontpage_subscriptions_chips" ADD COLUMN "description" varchar; ALTER TABLE
  "frontpage_subscriptions_chips" DROP COLUMN "href"; ALTER TABLE "frontpage" ADD COLUMN
  "subscriptions_request_access_label" varchar DEFAULT 'Hvordan bestille tilgang?'; ALTER TABLE
  "frontpage" ADD COLUMN "subscriptions_request_access_body" varchar DEFAULT '<seeded body>';`
- `down`: adds back `frontpage_subscriptions_chips.href` (varchar, nullable — no data to restore)
  and drops the two new `frontpage` columns; drops `frontpage_subscriptions_chips.description`.
- No new table, so the known CASCADE/named-drop conflict (research.md R4) is not expected in `down`
  — verified rather than assumed, exactly as prior migrations were.
