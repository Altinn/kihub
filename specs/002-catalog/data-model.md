# Phase 2 Data Model

One new Payload collection — `Artifact` (indexed **technical** metadata). Governance metadata
(a future `CatalogEntry`) is deferred to Phase 3. `Users` is unchanged from Phase 1. No artifact
bodies are stored (Principle I); the README snapshot is metadata about the artifact.

## `Artifact` collection (technical metadata)

Keyed by the stable `artifactId`. Populated and reconciled by the indexer; never authored by hand
in this phase. Derived from `@kihub/artifact-schema` manifests + README.

| Field | Type | Rules / source |
|-------|------|----------------|
| `artifactId` | text | Unique, indexed. From manifest `id` (reverse-DNS `org.slug`). The reconcile key. |
| `type` | select | Enum = the schema's artifact types. From manifest `type`. Drives the (type-derived) category facet. |
| `name` | text | From manifest `name`. |
| `description` | text | From manifest `description`. |
| `version` | text | Current version from manifest `version` (treated as latest). |
| `source` | group | `{ provider, repository, path }` from manifest `source`. |
| `installCommand` | text | Derived: `apm install <install.apm.package>` when present; otherwise empty/none. |
| `readme` | textarea | Raw README.md snapshot (markdown text). Empty if the artifact has no README. |
| `tags` | array(text) | From manifest `tags`. Used for the tag filter. |
| `visibility` | select | From manifest `visibility` (`internal` this phase). |
| `lifecycleStatus` | select | From manifest `lifecycle.status`. Displayed on detail; not yet workflow-driven. |
| `active` | checkbox | `true` when present in the last index run; `false` when the artifact was removed from the repo. Listing shows only `active = true`. Default `true`. |
| `lastIndexedAt` | date | Stamp of the most recent index run that saw this artifact. |

**Access (Phase 2)**: read = authenticated employees (reuse Phase 1 access); create/update/delete =
server-side/local API only (the indexer with `overrideAccess`). No public write.

**Category (derived, not stored)**: the category facet is computed from `type`; there is no separate
category field or collection this phase.

**Rebuildability**: dropping and re-running the indexer reproduces the collection from Git
(Principle I / FR-021).

## Derived value: install command

`installCommand = "apm install " + manifest.install.apm.package` when `install.apm.package` exists;
otherwise the record has no install command and the detail page shows a "no install command"
affordance. No other installation mechanism is synthesized (Principle V).

## Indexing run (transient, not persisted)

A single reconcile produces an in-memory report (surfaced by the CLI), not a stored entity:

```text
IndexReport {
  created:        artifactId[]      // new records
  updated:        artifactId[]      // existing records updated in place
  deactivated:    artifactId[]      // previously active, now absent from repo
  skippedInvalid: { path, errors }[]// manifests failing schema validation
  duplicates:     artifactId[]      // same id seen more than once in one run (first wins)
}
```
