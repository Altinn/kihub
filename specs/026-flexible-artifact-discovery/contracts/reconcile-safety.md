# Contract: Reconcile Safety & Revision Reporting

## Signature

```ts
interface ReconcileOptions {
  sourceId: number | string | null;
  allowEmptySource?: boolean;
}
```

`sourceId` remains required. `allowEmptySource` defaults false and has no effect in local break-glass
mode (`sourceId: null`).

## Mandatory pre-write gate

Before create/update/deactivate operations:

1. Build the set of valid unique manifest IDs (same first-path-wins semantics as reconcile).
2. If `sourceId !== null`, fetch active rows owned by that source.
3. If owned active count > 0, valid unique seen count == 0, and `allowEmptySource !== true`, throw
   `UnsafeEmptyScanError`.

The error must occur before even an invalid artifact report causes a database mutation. Callers may
record an external failure run; `reconcile` itself writes nothing.

## One-shot Payload behavior

- `DiscoverySource.allowDestructiveReconcile` is false by default and Admin-only through existing
  collection access.
- `runDiscovery` passes it as `allowEmptySource`.
- After a successful run for which it was true, the source update resets it to false.
- Failed/skipped runs do not consume it, so an administrator can diagnose and retry.

## Revision reporting

For an existing artifact upsert:

- previous digest non-null AND different from new digest → add stable ID once to
  `report.revisionChanged`
- previous digest null → backfill only, do not report changed
- equal digest → do not report changed
- newly created artifact → do not report changed

Automated discovery persists `summary.revisionChanged` and `revisionChangedIds` on the run.

## Existing invariants retained

- Stable ID remains the upsert key.
- Source ownership is stamped after reading the previous owner.
- Deactivation remains source-scoped and soft.
- Invalid artifacts are skipped/reported.
- Duplicate IDs use deterministic first-path-wins and are reported.
- A transport/config/tree failure never invokes reconcile.
