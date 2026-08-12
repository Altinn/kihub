# Research: Multi-Source Discovery & Agent Artifacts

**Feature**: 015-multi-source-agents | **Date**: 2026-08-12

Each decision below records what was chosen, why, and what was rejected. File/line references
are to the current `main` (post-014).

## R1 — Source scoping: a nullable `discoverySource` relationship on `artifacts`

**Decision**: Add `discoverySource` (relationship → `discovery-sources`, `hasMany: false`,
nullable, indexed, DB `ON DELETE SET NULL`) to the `artifacts` collection
(`apps/web/src/collections/Artifact.ts`). `reconcile()` gains a required third argument
`{ sourceId }` and (a) stamps `discoverySource: sourceId` on every create/update, (b) scopes the
deactivation query to `and: [{ active: { equals: true } }, { discoverySource: { equals:
sourceId } }]`.

**Rationale**: The cross-source damage lives in exactly one query
(`packages/discovery-core/src/reconcile.ts:93-111` — `where: { active: { equals: true } }`,
repo-agnostic). A relationship to the source record survives repo renames/ref changes (the
`discovery-sources` row is the identity, not the `owner/repo` string), and `ON DELETE SET NULL`
gives the spec's "deleting a source leaves its artifacts untouched" for free: they become
legacy/unowned rows, adoptable by any later scan (R3). The nullable column means the upgrade
migration touches no existing row (FR-007).

**Alternatives considered**:
- *Store the `owner/repo` string on the artifact* — breaks when a source is re-registered or the
  repo is renamed; string identity is exactly what Principle IV tells us not to key off.
- *A join table / per-source artifact registry* — overkill for a 1:N ownership fact; violates
  Start Simple.
- *Scope by manifest `source.repository`* — the manifest's `source` group is author-declared
  display metadata, not operational truth; discovery never verifies it (research note in
  004).

**Naming**: the record already has a `source` group (manifest's provider/repository/path,
`packages/discovery-core/src/record.ts:4-17`), so the new field MUST NOT be called `source`.
`discoverySource` chosen to match the `discovery-sources` collection.

## R2 — Move vs. duplicate: ownership-by-last-sighting, reassignments flagged

**Decision**: When a scan finds a manifest whose `artifactId` exists with a *different*
`discoverySource`, the artifact is updated and re-stamped to the scanning source, and its id is
reported in a new `reassigned` list. When the existing row's `discoverySource` is null, the id
is reported in a new `adopted` list. Deactivation is only ever performed by the recorded
owner's own scan (R1), so an id present in several repos at once is never deactivated while at
least one repo contains it.

**Rationale**: A single scan cannot distinguish "moved from repo A to repo B" from "present in
both A and B" without also scanning A — and scanning other sources mid-run reintroduces
cross-source coupling. Ownership-by-last-sighting implements the constitution's stable-identity
principle (artifacts MUST be able to move between repositories) with zero extra I/O, and the
`reassigned` flag on each affected run report satisfies FR-005: a genuine simultaneous duplicate
shows up as the same id being reassigned on every alternating scan — visible and diagnosable in
the run history, with governance history never at risk (only the pointer moves).

**Alternatives considered**:
- *Verify against the other repo before reassigning* — cross-source I/O inside one source's run;
  couples runs, slows scans, and still races with pushes. Rejected.
- *Refuse to reassign (first source wins forever)* — breaks legitimate moves, contradicting
  Principle IV. Rejected.

## R3 — Legacy rows: no backfill; adoption on first sighting

**Decision**: The migration adds the nullable column and backfills nothing. Legacy artifacts
(null `discoverySource`) are excluded from every deactivation query and get stamped with an
owner the first time any scan finds their id (reported as `adopted`).

**Rationale**: FR-007 requires the upgrade itself to change nothing. Backfilling "the single
existing source" would guess — the source might be disabled, renamed, or about to be replaced
by the multi-repo plan this feature exists for. Adoption converges to the truth after one
normal scan per source, with an audit trail in the run reports.

**Alternatives considered**: backfill-to-only-source (guessing; wrong the moment a second source
exists); requiring an admin to assign owners manually (busywork the scanner can do correctly).

## R4 — `agent` type: additive enum + `agents/` dir + manifest schema 1.1.0

**Decision**: Append `'agent'` to `ARTIFACT_TYPES`
(`packages/artifact-schema/src/schema.ts:4-12`) and `'agents'` to `TYPE_DIRS`
(`packages/discovery-core/src/scan.ts:6-14`). Bump the manifest schema version 1.0.0 → 1.1.0:
`schemaVersion` default, the generated JSON schema `$id`
(`packages/artifact-schema/scripts/generate-json-schema.ts`, regenerate the committed
`schema/artifact.schema.json`), and `docs/artifact-manifest.md` (version line, `type` row, plus
a new section documenting the optional `agent-card.json` sibling). Existing manifests declaring
`schemaVersion: 1.0.0` remain valid — validation only pattern-checks the field, and 1.1.0 is a
strict superset.

**Rationale**: Constitution Principle III mandates new AI asset types as new `type` values —
`agent definition` is already in its enumeration, so no constitution amendment is needed. The
Technology Constraints section makes the manifest a versioned contract → MINOR bump for an
additive enum value + new optional sibling-file convention. The GitHub reader needs no change:
its tree filter is driven by `TYPE_DIR_SET = new Set(TYPE_DIRS)`
(`packages/github-client/src/client.ts:36-37`).

**Alternatives considered**: a separate agents collection (prohibited by Principle III);
reusing `skill`/`workflow` for agents (loses filtering, labels, and the card convention — and
the taxonomy already names agents).

## R5 — Enum migration: `ALTER TYPE … ADD VALUE`, verified on a scratch DB

**Decision**: One new migration (single file for the whole feature) that (a) adds `'agent'` to
`enum_artifacts_type`, (b) adds `discovery_source_id` (FK → `discovery_sources`, `ON DELETE SET
NULL`, indexed) and (c) adds `agent_card` (jsonb, nullable) to `artifacts`. Generated with
`pnpm --filter web migrate:create agents_multisource` against the local DB, then hand-checked;
the `down` gets the same `IF EXISTS` hand-patch as the two 014 migrations (the generated `down`
drops FKs by name after a CASCADE already removed them, aborting the transaction — see
`apps/web/src/migrations/20260810_093128_media_uploads.ts`).

**Rationale/verification**: Payload wraps migrations in a transaction. PostgreSQL 12+ permits
`ALTER TYPE … ADD VALUE` inside a transaction *as long as the new value is not used in the same
transaction* — this migration only adds the value, never uses it. Local dev and Azure run PG 16.
Still, the migration chain MUST be verified on a scratch DB (`kihub_migtest`): the local dev DB
is push-mode and `payload migrate` against it prompts "data loss will occur" (recorded gotcha,
`specs/014-learning-pages/tasks.md` T009), and `next build` needs the migrated scratch DB +
non-mock `AUTH_MODE` to complete (T047 gotcha).

**Alternatives considered**: enum→text conversion (loses DB-level integrity for no benefit);
two migrations (no independent rollback value — the three DDL statements ship together or not at
all).

## R6 — Agent card validation lives in `@kihub/artifact-schema`, tolerant by design

**Decision**: New module `packages/artifact-schema/src/agent-card.ts` exporting
`agentCardSchema` + `validateAgentCard(source: string | unknown)` (mirroring
`validateManifest`'s error format). The schema targets the A2A v1.0 Agent Card but is
deliberately **non-strict** (unknown keys pass through and are stored): required is only `name`
(non-empty string); all other known fields are type-checked when present — `description`,
`version`, `provider { name?/organization?, url? }`, `supportedInterfaces[] { url required,
protocol required, version? }`, `capabilities { streaming?, pushNotifications?,
extendedAgentCard? }` (booleans), `defaultInputModes`/`defaultOutputModes` (string arrays),
`skills[] { id?, name required, description?, tags?: string[], examples?: string[] }`,
`securitySchemes` (object), `security` (array). A pre-parse size cap of **256 KB** treats
oversized files as a validation failure, not a run error.

**Rationale**: The card is render-only enrichment (FR-011..013): we validate what we render and
tolerate what we don't. Public A2A material is not perfectly consistent field-by-field (e.g.
skill sub-fields differ between the spec text and popular examples), and A2A will keep evolving
— a `.strict()` schema would generate false failures on valid real-world cards, and FR-012's
"invalid card must not block the artifact" makes leniency cheap. Placing the schema in
`artifact-schema` keeps both repo-facing contracts (manifest + card) in the one package artifact
repos can consume in their own CI, and its validate CLI can grow a card mode later.

**Alternatives considered**: strict A2A schema (false failures, constant chasing of the
upstream spec); validating in `discovery-core` (splits the contract surface across packages);
no validation, store-as-is (renders garbage; FR-012 requires actionable per-field errors).

## R7 — Card fetch: one extra `readFile` per *agent*, in `scanRepo` only

**Decision**: In `scanRepo` (`packages/discovery-core/src/scan.ts:104-114`), after manifest
validation, if and only if the manifest is valid and `type === 'agent'`, fetch
`${relPath}/agent-card.json` via the existing `RepoReader.readFile` (GitHub reader returns
`undefined` on 404 — `packages/github-client/src/client.ts:81-91`). `RawArtifact` gains
`agentCard?: Record<string, unknown> | null` and `agentCardErrors?: string[]`. The local
`scan()` walker gets the same treatment for parity.

**Rationale**: FR-014 (ignore cards next to non-agents) is implemented by never fetching them —
zero requests wasted on the 7 existing types, one extra HTTP request per agent directory. No
`RepoReader` interface change; no `github-client` change at all.

**Alternatives considered**: enumerate `agent-card.json` in the tree listing (needs a second
regex + reader interface change for no request savings); fetch for all types then discard
(wasted requests, violates FR-014's spirit).

## R8 — Card storage: verbatim jsonb on the artifact; not searchable (deferred)

**Decision**: New `agentCard` field on `artifacts`, Payload `type: 'json'` (precedent:
`AuditLog.details`, `apps/web/src/collections/AuditLog.ts:30`). `reconcile` sets `agentCard:
s.agentCard ?? null` on every agent upsert — a removed or invalid card therefore clears the
stored one (no stale renders, FR-012/scenario 4). Full-text search is **not** extended: the
tsvector at `apps/web/src/lib/search.ts:55-62` stays `name + description + readme`.

**Rationale**: The card is indexed technical metadata like the readme snapshot (FR-015) —
refreshed every scan, never edited in KI Hub. Verbatim storage preserves unknown fields for
future rendering. Search over card contents is speculative (no requirement asks for it) and
jsonb-in-tsvector would index JSON punctuation; if wanted later, the clean seam is a flattened
text column built at reconcile time — deferred per Start Simple.

**Alternatives considered**: normalized card sub-tables (massive over-modeling for render-only
data); storing raw text (loses the "validated shape" guarantee the renderer relies on).

## R9 — Run reporting: `adopted` / `reassigned` / `cardIssues` on `IndexReport` and `discovery-runs`

**Decision**: `IndexReport` (`packages/discovery-core/src/reconcile.ts:4-10`) gains
`adopted: string[]`, `reassigned: string[]`, `cardIssues: { path: string; errors: string[] }[]`.
`discovery-runs` (`apps/web/src/collections/DiscoveryRun.ts`) gains matching summary counts
(`adopted`, `reassigned`, `cardIssues` in the `summary` group), `adoptedIds`/`reassignedIds`
(text `hasMany`), and a `cardIssues` array field shaped like the existing `skippedInvalid`.
The admin run view (`apps/web/src/components/DiscoveryRunSummary.tsx`) surfaces reassignments
and card issues — and starts showing the existing `duplicates` count, which is recorded today
but never rendered.

**Rationale**: FR-005/FR-006/FR-012 all route through the run report as the editor-facing
surface. Reusing the `skippedInvalid` array shape keeps the admin UI code uniform. These are new
optional fields on an append-only collection — old run documents render fine without them, so no
migration backfill is needed (the columns/tables are added by the same feature migration).

**Alternatives considered**: folding card issues into `skippedInvalid` (lies — the artifact was
*not* skipped; editors must see "registered, but card broken"); a separate notifications
mechanism (nothing else in the registry pushes notifications; YAGNI).

## R10 — Norwegian type labels: new pure `lib/registry-view.ts`, the 012/014 view-module pattern

**Decision**: Create `apps/web/src/lib/registry-view.ts` exporting
`ARTIFACT_TYPE_LABELS: Record<ArtifactType, string>` for **all eight** types — there is no label
map today anywhere (the UI renders raw enum values; verified exhaustively). Proposed labels:
`skill` → «Ferdighet», `prompt` → «Prompt», `workflow` → «Arbeidsflyt», `mcp` → «MCP-server»,
`template` → «Mal», `policy` → «Retningslinje», `playbook` → «Dreiebok», `agent` → «Agent».
Consumed by `CatalogFilters.tsx:49`, `ArtifactCard.tsx:30`,
`artifacts/[artifactId]/page.tsx:43`, and `collections/Artifact.ts:24` (options become
`{ value, label }` pairs), mirroring how `lib/events-view.ts` feeds both the Payload admin
select and the public UI. Unit-tested like `events-view.test.ts` (exhaustiveness: every
`ARTIFACT_TYPES` member has a label).

**Rationale**: FR-010 cannot be satisfied for one type in isolation — a Norwegian «Agent» next
to a raw `playbook` chip would be broken UI. The events-view module is the repo's established
single-source-of-labels pattern. Label wording is a shipped default; editors can challenge
individual words in review without structural change.

**Alternatives considered**: labels inline in each component (three copies to drift); putting
the map in `@kihub/artifact-schema` (Norwegian UI text does not belong in the shared repo-facing
contract package).

## R11 — Detail page: a server-rendered `AgentCardPanel`, zero client components

**Decision**: New presentational server component `apps/web/src/components/AgentCardPanel.tsx`
rendering the stored card between the Install card and the README section on
`artifacts/[artifactId]/page.tsx`, styled purely with `--kihub-*`/`--ds-*` tokens. Norwegian
headings: «Agentkort», «Ferdigheter», «Egenskaper», «Grensesnitt», «Inn-/utdataformater»,
«Autentisering», provider/version metadata line. Card *content* (names, descriptions, examples)
renders verbatim as authored. Section omitted entirely when `agentCard` is null. Capability
flags render as labeled tags; skills as a definition list; interfaces as protocol+URL rows;
security schemes by name/type only (no secrets exist in cards, but scheme internals are noise).

**Rationale**: Everything needed is static data on an already-server-rendered page — the feature
adds zero client components (same bar 014 met). Designsystemet primitives (`Tag`, `Card`,
`Details` if collapsing is wanted) cover the interactive needs; custom layout goes on the token
layer per the constitution's design-system constraint.

**Alternatives considered**: rendering raw JSON in a `<pre>` (fails FR-013's "in KI Hub's visual
style"); a client-side tabbed viewer (client JS for no interaction requirement).

## R12 — Breaking-change handling inside the monorepo

**Decision**: `reconcile`'s new required third parameter is an intentional compile-breaking
change; workspace consumers (`apps/web/src/lib/discovery.ts:117-118` — the single call site —
and `apps/web/scripts/index-artifacts.ts` break-glass path, plus package tests) are updated in
the same change set. The discovery-core fake payload
(`packages/discovery-core/tests/reconcile.test.ts:24-47`) must learn the `and:` where-shape used
by the scoped deactivation query, and `PayloadLike.find` gains an optional `depth` so reconcile
can read the existing row's `discoverySource` as a scalar id (`depth: 0`) instead of a populated
object. The break-glass local indexer (`pnpm --filter web index`) passes no real source — it
gets an explicit "unowned" mode stamping `discoverySource: null`… **no**: it must pass a real
source id or be restricted; decision: `scripts/index-artifacts.ts` keeps working by upserting
with `discoverySource: null` (legacy semantics — its output is adoptable by the next real scan,
and it never deactivates anything it doesn't own, i.e. nothing).

**Rationale**: workspace packages version as `workspace:*`; no semver dance needed, the
compiler finds every caller. Making the source id required (not optional) prevents the
regression class this feature exists to fix — an optional parameter would silently restore
global deactivation wherever it was forgotten.

**Verification gates** (all recorded as prior gotchas): full suite via `set -a; source
apps/web/.env; set +a` first; `pnpm --filter web lint`; `next build` against a migrated scratch
DB with non-mock `AUTH_MODE` — `next build` is the only gate that has caught implicit-`any`
type errors before.
