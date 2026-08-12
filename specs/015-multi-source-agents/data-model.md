# Data Model: Multi-Source Discovery & Agent Artifacts

**Feature**: 015-multi-source-agents | **Date**: 2026-08-12

Only deltas are listed; unchanged fields are omitted. All changes are additive.

## `artifacts` collection (apps/web/src/collections/Artifact.ts)

| Field | Type | Rules | Purpose |
|---|---|---|---|
| `discoverySource` | relationship → `discovery-sources`, `hasMany: false` | nullable, `index: true`; DB FK `ON DELETE SET NULL` | Which source registered/last saw this artifact. `null` = legacy/unowned (pre-015 rows, break-glass indexer output, or rows whose source was deleted) — excluded from every deactivation, adoptable by any scan (FR-002/003). |
| `type` | select (existing) | options gain `agent`; options become `{ value, label }` pairs fed by `ARTIFACT_TYPE_LABELS` | Eighth type value (FR-008); Norwegian labels in `/cms` too (FR-010). |
| `agentCard` | json (jsonb) | nullable; written only by reconcile (`overrideAccess`), access like all artifact fields (read = signed-in, write = never) | Verbatim validated A2A card for agents; `null` for non-agents, agents without a card, and agents whose card went missing/invalid (FR-011/012, R8). |

**State rules**:
- Every reconcile upsert stamps `discoverySource = scannedSourceId` (adoption when previously
  null, reassignment when previously another source — both reported, R2/R3).
- Deactivation predicate: `active = true AND discoverySource = scannedSourceId AND artifactId ∉ seen`.
- `agentCard` is set to the fetched+validated card, else explicitly `null`, on **every** upsert
  (non-agents always `null`) — stale cards survive neither a re-scan nor a type change away
  from `agent` (spec US3 scenario 4; analyze finding C2).

## `discovery-runs` collection (apps/web/src/collections/DiscoveryRun.ts)

| Field | Type | Rules | Purpose |
|---|---|---|---|
| `summary.adopted` | number | optional | Count of previously-unowned ids stamped to this source (FR-003). |
| `summary.reassigned` | number | optional | Count of ids taken over from another source — move or cross-source duplicate (FR-004/005). |
| `summary.cardIssues` | number | optional | Count of agent directories whose card failed validation (FR-012). |
| `adoptedIds` | text `hasMany` | optional | The adopted artifact ids. |
| `reassignedIds` | text `hasMany` | optional | The reassigned artifact ids. |
| `cardIssues` | array of `{ path: text, errors: text hasMany }` | optional | Per-path card validation errors, same shape as existing `skippedInvalid`. |

Existing `summary.duplicates` (recorded since 004, never rendered) starts being displayed in the
admin run view. Old run documents lack the new fields and render fine (append-only collection,
no backfill).

## `discovery-sources` collection — no field changes

`lastRunSummary` keeps its existing shape (created/updated/deactivated/skippedInvalid); the
run documents are the authoritative detail surface. Deleting/disabling a source requires no new
behavior: the FK's `ON DELETE SET NULL` produces legacy/unowned artifacts (edge case covered).

## `@kihub/discovery-core` type changes (compile-time contracts)

```ts
// scan.ts
interface RawArtifact {
  path: string;
  manifest?: ArtifactManifest;
  readme?: string;
  valid: boolean;
  errors?: string[];
  agentCard?: Record<string, unknown> | null;  // NEW — parsed valid card (agents only)
  agentCardErrors?: string[];                   // NEW — validation errors (agents only)
}

// reconcile.ts
interface ReconcileOptions { sourceId: number | string }   // NEW — required
function reconcile(payload: PayloadLike, scanned: RawArtifact[], opts: ReconcileOptions): Promise<IndexReport>

interface IndexReport {
  created: string[]; updated: string[]; deactivated: string[];
  skippedInvalid: { path: string; errors: string[] }[]; duplicates: string[];
  adopted: string[];                                   // NEW (FR-003)
  reassigned: string[];                                // NEW (FR-004/005)
  cardIssues: { path: string; errors: string[] }[];    // NEW (FR-012)
}

interface ArtifactDoc {
  id: string | number; artifactId: string;
  discoverySource?: number | string | null;            // NEW — read at depth 0 (scalar id)
}
// PayloadLike.find gains optional depth?: number (reconcile passes depth: 0)
// and its `where` usage grows the and:[...] compound used by the scoped deactivation query.
```

## Agent Card (stored value shape — see contracts/agent-card.md for the validation contract)

Verbatim parsed JSON of the repo's `agent-card.json` after passing `validateAgentCard`. Fields
the UI renders (all optional except `name`):

- `name` (string, required), `description`, `version`
- `provider` — `{ name? | organization?, url? }`
- `supportedInterfaces[]` — `{ url, protocol, version? }`
- `capabilities` — `{ streaming?, pushNotifications?, extendedAgentCard? }`
- `defaultInputModes[]`, `defaultOutputModes[]` (media-type strings)
- `skills[]` — `{ id?, name, description?, tags?[], examples?[] }`
- `securitySchemes` (object — rendered by scheme name/type only), `security[]`
- Unknown extra fields: preserved in storage, not rendered.

## Migration (one file: `20260812_*_agents_multisource`)

1. `ALTER TYPE "public"."enum_artifacts_type" ADD VALUE 'agent';` (added, never used, in-txn —
   safe on PG ≥ 12; verify on scratch DB, R5)
2. `artifacts`: add `discovery_source_id` integer null, FK → `discovery_sources(id)`
   `ON DELETE SET NULL`, plus index `artifacts_discovery_source_idx`.
3. `artifacts`: add `agent_card` jsonb null.
4. `discovery_runs`: add `summary_adopted`, `summary_reassigned`, `summary_card_issues`
   (numeric null); `discovery_runs_texts` handles the new `hasMany` text ids automatically
   (existing pattern); new `discovery_runs_card_issues` child table mirroring
   `discovery_runs_skipped_invalid`.
5. Registered in `apps/web/src/migrations/index.ts`; `down` hand-patched with `IF EXISTS` on
   constraint/index drops (the recorded 014 pattern).

Exact DDL comes from `pnpm --filter web migrate:create agents_multisource`; the list above is
the review checklist for the generated file, not hand-written SQL.

## Invariants (test targets)

- I1: A scan of source S never changes `active` on a row where `discoverySource ≠ S` (including null).
- I2: After any scan that found artifact X, `X.discoverySource` = that scan's source.
- I3: `agentCard` is non-null only where `type = 'agent'` and the last scan of its owner found a valid card.
- I4: The upgrade migration alone changes zero rows in `artifacts` (columns added, all null).
- I5: Governance rows (`catalog-entries`, `reviews`, `audit-log`) are never written by any 015 code path.
