# Quickstart: Flexible Artifact Discovery & Revision-Bound Governance

Run from repository root on `codex/026-flexible-artifact-discovery`.

## 1. Package contract tests

```bash
pnpm --filter @kihub/discovery-core test
pnpm --filter @kihub/github-client test
```

Verify:

- no-config root discovery remains green;
- nested explicit roots are exact, not arbitrary recursive;
- invalid/unsafe config and missing roots throw;
- local/GitHub directory digests match fixture Git blobs;
- `source.path` and expected repository mismatches are invalid artifacts;
- truncated Git trees throw;
- empty-source guard writes nothing;
- override allows intentional deactivation;
- revision changes are reported but null backfills are not.

## 2. Generate types and migration

Use a branch-local install. Force disk media mode so Payload config does not require Azure secrets.

```bash
pnpm install --frozen-lockfile
MEDIA_STORAGE_MODE=disk pnpm --filter web payload generate:types
MEDIA_STORAGE_MODE=disk pnpm --filter web migrate:create artifact_revision_governance
```

Inspect the migration: additive columns only. Register it in `apps/web/src/migrations/index.ts`.

## 3. Unit and integration tests

With the normal local test database/environment available:

```bash
pnpm --filter web test -- tests/unit/governance-revision.test.ts
pnpm --filter web test -- tests/integration/discovery-run.test.ts
pnpm --filter web test -- tests/integration/reindex-preserves.test.ts
pnpm --filter web test -- tests/integration/review-approval-flow.test.ts
```

Critical journey:

1. Scan a skill containing `artifact.yaml` + `SKILL.md` at a configured nested root.
2. Record review and approval; note stored version/digest.
3. Change only `SKILL.md` and rescan.
4. Confirm `revisionChangedIds`, preserved history, stale approval, suppressed green/recommended UI,
   and blocked promotion.
5. As an Approver/Admin, use the one-shot **reapprove current revision** control and confirm
   currency returns without changing through an artificial rejected/not-approved state.

## 4. Empty-source protection

1. Scan a source with one artifact.
2. Make its valid scan set empty (valid root, no manifests).
3. Run discovery: expect failure and the artifact still active.
4. In Payload admin, arm `allowDestructiveReconcile` for that source.
5. Run discovery: expect success, one soft-deactivation, and the checkbox reset false.

Invalid config/missing-root tests do not consume the override because reconcile is never reached.

## 5. Full quality gates

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit
```

Run the production build against a migrated scratch database and non-mock production auth, following
the existing repository build procedure.

## 6. Migration verification

On a scratch PostgreSQL database cloned through all prior migrations:

1. Apply the new migration.
2. Confirm existing approval/review rows remain and new fields are null.
3. Run discovery and confirm artifact digests populate.
4. Roll the migration down and back up.
5. Confirm no existing tables or governance rows are dropped by the migration itself.

## 7. Manual UI check

- Current approval: green Approved/Recommended indicators appear as before.
- After source-content change: cards/detail show re-review warning, no green approval/recommendation.
- Governance panel shows recorded and current versions and labels old reviews.
- Re-approval restores the current state.

## 8. Real repository canary

Before merge, point a non-production source at a branch containing:

```yaml
schemaVersion: 1
discovery:
  artifactRoots:
    - src
```

Place an artifact at `src/skills/<slug>/artifact.yaml`, ensure `source.path` is
`src/skills/<slug>`, and run manually. Confirm the run records root/config digest and agentctl/APM's
source path remains usable. Do not enable arbitrary branch scans or change production source refs.
