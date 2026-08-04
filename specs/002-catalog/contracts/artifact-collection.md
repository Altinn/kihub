# Contract: `Artifact` Payload collection + catalog UI

## Collection: `artifacts`

Indexed technical-metadata collection (see [data-model.md](../data-model.md) for fields). Contract
points that other code depends on:

- **slug**: `artifacts`
- **key**: `artifactId` (unique, indexed) — all lookups/reconciliation use it (Principle IV).
- **access**: `read` = authenticated employees (Phase 1 gate); `create/update/delete` = server-side
  only (indexer via `overrideAccess`). No public/HTTP write path this phase.
- **listing invariant**: catalog UI queries only `active = true`.
- **content boundary**: fields hold metadata + README snapshot only — never an artifact body
  (Principle I). No field stores skill/prompt/workflow/MCP executable content.

## Catalog listing — `(app)/page.tsx`

Server component. Reads URL query params and queries `artifacts` via the Payload Local API.

| Param | Effect |
|-------|--------|
| `type` | Filter to that artifact type (also the type-derived category facet). |
| `tag` | Filter to artifacts containing the tag (repeatable → all required). |
| `category` | Type-derived grouping; equivalent to `type` this phase. |
| (none) | All `active` artifacts. |

- Always applies `active = true`.
- Combined params AND together (FR-013).
- Each row/card shows at least name, type, description (+ key tags), linking to the detail page.
- Zero results (empty catalog or no match) → intentional Designsystemet empty state (FR-014), not an
  error.
- Unauthenticated → redirected to sign-in (Phase 1 guard, FR-015).

## Artifact detail — `(app)/artifacts/[artifactId]/page.tsx`

Server component. Fetches one `artifacts` record by `artifactId`.

- Shows identity, type, name, description, owner, tags, visibility, lifecycle status (FR-016).
- Renders `readme` via the Designsystemet-styled markdown renderer (FR-017); absent README → a
  graceful "no README" note.
- Shows current `version` and the `installCommand` with a copy control (FR-018); absent install
  command → a "no install command" affordance.
- Unknown/`inactive` `artifactId` → `notFound()` (FR-019).

## UI mandate

All of the above is built exclusively from Designsystemet components/tokens; the only non-DS UI
dependency is `react-markdown` (a renderer) for README content, styled with DS typography.
