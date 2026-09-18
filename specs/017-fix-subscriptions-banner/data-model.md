# Phase 1 Data Model: Genuinely interactive subscriptions banner

No new collection, no new global. This feature extends the existing `subscriptions` group on the
`frontpage` global (`apps/web/src/globals/Frontpage.ts`), which is read exclusively through
`lib/site-content.ts` (`getFrontpageContent` → `mergeFrontpage`) per the established single-read-path
convention.

## `SubscriptionsContent` (extended)

| Field | Type | Change | Notes |
|---|---|---|---|
| `eyebrow` | text | unchanged | "Tilgjengelige abonnementer" |
| `heading` | text | unchanged | "Støttede KI-abonnementer i Digdir" |
| `description` | textarea | unchanged | Still references KITT contact, now the "quick" version of R3's fuller `requestAccess.body` |
| `chips` | array of `Chip` | **`href` removed, `description` added** | See `Chip` below |
| `requestAccess` | group `{ label, body }` | **new** | Backs the "Hvordan bestille tilgang?" disclosure |

## `Chip` (extended)

| Field | Type | Required | Change | Notes |
|---|---|---|---|---|
| `name` | text | yes | unchanged | Tool name, e.g. "GitHub Copilot" |
| `href` | text | — | **removed** | Dead per R3 — chips no longer navigate (R1); Payload column dropped |
| `description` | textarea | no | **new** | Short explanation shown when the chip's disclosure is expanded. Optional so an editor-added chip without one still renders as a genuinely interactive (if minimally informative) element — spec Edge Cases |

Validation: no new required-field constraints beyond `name` (already required). An empty
`description` is valid (edge case: disclosure still opens, panel is simply brief/empty) — the spec
does not require blocking that, only that the chip itself never be a no-op click (FR-001).

## `requestAccess` (new group, nested under `subscriptions`)

| Field | Type | Required | Notes |
|---|---|---|---|
| `label` | text | no (has seeded default) | The heavier CTA's own visible text — "Hvordan bestille tilgang?" |
| `body` | textarea | no (has seeded default) | Instructions shown when expanded — who to contact and how. Seeded default reuses/extends the existing KITT-contact messaging already in `subscriptions.description` |

Rendering rule (mirrors the existing per-section fallback convention in `mergeFrontpage`): the
`requestAccess` disclosure renders whenever `subscriptions` itself is present (stored or seeded) —
it is not independently optional, since spec FR-004 requires it to always exist in the banner ("a
new... element"), unlike `chips`, which spec Edge Cases explicitly allows to be empty.

## Updated `FrontpageContent` (TypeScript, `site-content-defaults.ts`)

```ts
export interface Chip {
  name: string;
  description?: string;
}

export interface RequestAccess {
  label: string;
  body: string;
}

export interface SubscriptionsContent {
  eyebrow: string;
  heading: string;
  description: string;
  chips: Chip[];
  requestAccess: RequestAccess;
}
```

`Cta` (used by `hero.primaryCta`/`secondaryCta`) is intentionally NOT reused for `requestAccess`:
`Cta` is `{label, href}` — a real navigation target — whereas `requestAccess` is `{label, body}`, an
inline disclosure with no destination (R1). Reusing `Cta`'s shape here would imply a link that FR-005
explicitly forbids behaving like.

## Postgres schema delta (via migration, see contracts/subscriptions-migration.md)

- `frontpage_subscriptions_chips`: `ADD COLUMN "description" varchar`; `DROP COLUMN "href"`.
- `frontpage`: `ADD COLUMN "subscriptions_request_access_label" varchar DEFAULT 'Hvordan bestille
  tilgang?'`; `ADD COLUMN "subscriptions_request_access_body" varchar DEFAULT '<seeded instructions>'`.

## State / lifecycle

None — this is static editor-managed content, same as the rest of `subscriptions` today. No
draft/publish states, no relationships to other collections, no derived/computed fields.
