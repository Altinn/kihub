# Phase 1 Data Model

Two data shapes matter this phase: the **Artifact Manifest** (a Git-side content contract, not a
Payload collection) and the Payload **User** (the only populated collection). No `Artifacts` or
`CatalogEntry` collections exist yet (Principle I & VII) — they arrive in Phase 2.

## Artifact Manifest (`artifact.yaml`)

The versioned contract that describes one artifact. Lives in `ai-artifacts` (Git), authored by
content authors, validated on demand against `packages/artifact-schema`. Machine-readable schema:
[contracts/artifact.schema.json](./contracts/artifact.schema.json).

| Field | Required | Type / allowed values | Rules |
|-------|----------|-----------------------|-------|
| `id` | ✅ | string | Reverse-DNS `org.slug`: `^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$` (lowercase). Globally unique. Stable — independent of repo/path (Principle IV). |
| `type` | ✅ | enum | One of: `skill`, `prompt`, `workflow`, `mcp`, `template`, `policy`, `playbook`. Single generic artifact differentiated by this field (Principle III). |
| `name` | ✅ | string | Human-readable display name. Non-empty. |
| `version` | ✅ | string | Semantic version `MAJOR.MINOR.PATCH`. |
| `description` | ✅ | string | One-line summary. Non-empty. |
| `owner` | ✅ | object | See below. |
| `owner.team` | ✅ | string | Owning team name. |
| `owner.contact` | ✅ | string | Contact email. |
| `source` | ✅ | object | Where the artifact content lives. |
| `source.provider` | ✅ | enum | `github` (only value this phase). |
| `source.repository` | ✅ | string | e.g. `digdir/ai-artifacts`. |
| `source.path` | ✅ | string | Path within the repo, e.g. `skills/security-review`. |
| `install` | ⬜ | object | Installation reference (Principle V). |
| `install.apm.package` | ⬜ | string | APM package id, e.g. `digdir/security-review`. |
| `tags` | ⬜ | string[] | Lowercase keywords. |
| `visibility` | ✅ | enum | `internal` (only value this phase; `public`/`restricted` reserved). |
| `lifecycle` | ✅ | object | |
| `lifecycle.status` | ✅ | enum | One of: `draft`, `experimental`, `in-review`, `approved`, `recommended`, `deprecated`, `archived`. |
| `schemaVersion` | ⬜ | string | Manifest schema version this file targets; defaults to `1.0.0`. |

**Validation outcomes** (from `validate()`): `{ valid: true }` or `{ valid: false, errors: [...] }`
where errors identify missing required fields, malformed `id`, unknown `type`/enum values, or bad
`version` format. Duplicate `id` across two manifests is an identity conflict (detected when a set
of manifests is validated together).

**Identity note**: Governance state in later phases keys off `id` only. Moving an artifact to a new
`source.repository`/`source.path` MUST NOT change `id`.

## Payload `Users` collection (auth mapping)

The only populated Payload collection this phase. Stores the mapping between an Entra identity and
a KI Hub user. No artifact/content data. Built-in local (email/password) strategy is **disabled**;
a custom strategy (see [contracts/auth-gating.md](./contracts/auth-gating.md)) establishes the user.

| Field | Type | Rules |
|-------|------|-------|
| `id` | auto | Payload document id. |
| `entraOid` | string | Entra Object ID (`oid` claim) — stable per-user key. Unique. Indexed. |
| `email` | string | From verified token claim. Unique. |
| `name` | string | Display name from token. |
| `tenantId` | string | Home tenant id (`tid`) — must equal the configured org tenant. |
| `role` | enum | Baseline `reader` this phase (only value used). The full set `reader\|contributor\|reviewer\|approver\|admin` is reserved for Phase 3; not assigned/enforced now (FR-006). |
| `lastLoginAt` | date | Updated on each successful sign-in. |

**Lifecycle**: A `Users` document is created (upsert by `entraOid`) on first successful, gated
sign-in; updated on subsequent logins. Deletion is out of scope this phase.

## Authenticated User (conceptual)

The signed-in employee. Established by Entra ID (via Auth.js) → gated by the employee check →
mapped to a `Users` document → exposed to the app as the current user. In Phase 1 every such user
has baseline read access; no privileged capabilities exist to gate yet.
