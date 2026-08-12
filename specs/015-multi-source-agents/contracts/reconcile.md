# Contract: Source-scoped reconciliation

**Status**: proposed by feature 015 (breaking signature change inside the workspace, R12)

## Signature

```ts
reconcile(payload: PayloadLike, scanned: RawArtifact[], opts: { sourceId: number | string }): Promise<IndexReport>
```

`sourceId` is **required** — there is no unscoped mode. (The break-glass local indexer
`apps/web/scripts/index-artifacts.ts` does not call `reconcile`'s deactivation semantics on
behalf of a source; it upserts unowned rows — `discoverySource: null` — and deactivates nothing.)

## Rules (normative)

Let S = the scanned source, `seen` = valid manifest ids found in this scan.

| # | Rule | Spec |
|---|---|---|
| 1 | Invalid manifests → `skippedInvalid`; within-scan duplicate ids → first wins, rest → `duplicates`. (Unchanged.) | FR-006 |
| 2 | Every upsert stamps `discoverySource = S` and sets `agentCard = validCard ?? null` — on **every** upsert, not only agents, so a type change away from `agent` clears any stale card. | FR-001, FR-011 |
| 3 | Upsert of a row whose `discoverySource` was **null** → id appended to `adopted`. | FR-003 |
| 4 | Upsert of a row whose `discoverySource` was **another source** → id appended to `reassigned` (move and simultaneous-duplicate are indistinguishable in one scan; both are flagged, duplicates surface as repeated reassignments across run history). | FR-004, FR-005 |
| 5 | Deactivation: only rows with `active = true AND discoverySource = S AND artifactId ∉ seen`. Rows owned by other sources or unowned are **never** deactivated. | FR-002 |
| 6 | Agent-card validation failures → `cardIssues: [{ path, errors }]`; the artifact itself still upserts (with `agentCard: null`). | FR-012 |
| 7 | No hard deletes; failed runs record `failure` and leave all artifacts untouched. (Unchanged.) | edge cases |

## IndexReport

```ts
{
  created: string[], updated: string[], deactivated: string[],
  skippedInvalid: { path: string; errors: string[] }[], duplicates: string[],
  adopted: string[], reassigned: string[],                       // NEW
  cardIssues: { path: string; errors: string[] }[],              // NEW
}
```

## Run recording (`apps/web/src/lib/discovery.ts` → `discovery-runs`)

- `summary` gains `adopted`, `reassigned`, `cardIssues` counts.
- `adoptedIds`, `reassignedIds` (text hasMany), `cardIssues` array persisted like
  `skippedInvalid`.
- Admin run view additionally renders: duplicates (existing but hidden until now), reassigned,
  and card issues.

## Worked example (acceptance scenarios US1)

Sources A (a1, a2), B (b1); legacy row L (no source).

| Action | Result |
|---|---|
| Scan A (first post-upgrade) | a1, a2 upserted + stamped A (`adopted` if pre-existing); b1 untouched; L untouched (never in A's deactivation scope) |
| Scan B | b1 stamped B; a1, a2, L untouched |
| Delete a1 from repo A, scan A | `deactivated: [a1]` only |
| Move a2 to repo B; scan B then A | scan B: a2 updated, `reassigned: [a2]`, owner → B; scan A: a2 not in A's scope → untouched, governance intact |
| a3 present in A and B; alternate scans | each scan reports `reassigned: [a3]`; a3 never deactivated while either repo has it |
