# Quickstart: validating per-type artifact directories (028)

Run from the repository root (`/Users/adi/kihub-028` while this is a worktree). Contracts:
[`discovery-config-v1-artifactdirs.md`](./contracts/discovery-config-v1-artifactdirs.md),
[`scan-and-conflicts.md`](./contracts/scan-and-conflicts.md),
[`guide-content.md`](./contracts/guide-content.md).

## Prerequisites

```bash
pnpm install --frozen-lockfile
set -a; source apps/web/.env; set +a        # integration tests need env exported
```

Web integration tests need Postgres (`docker compose up -d`, port 55432). When the local `kihub`
database holds another branch's schema, use a per-branch clone instead of the shared one (push-mode
prompts hang every test): create `kihub_028` and point `DATABASE_URI` at it.

## 1. Package tests — config, layout, readers (no database)

```bash
pnpm --filter @kihub/discovery-core test
pnpm --filter @kihub/github-client test
```

Expect: `config` tests for `artifactDirs` grammar and failures; `layout` tests for derivation and
conflicts; `scan`/`scanrepo` tests for typed directories, parity between the local and GitHub readers on
a shared fixture table, nested-artifact failure, missing-directory failure, unchanged 026 behaviour and
digest for roots-only configs.

## 2. The worked Altinn Studio example

Altinn Studio keeps skills at `agents/_skills/<slug>/SKILL.md`. Nothing moves. The team adds:

`kihub.yaml` (repository root):

```yaml
schemaVersion: 1
discovery:
  artifactDirs:
    skill:
      - agents/_skills
```

`agents/_skills/tekstforfatter-docs/artifact.yaml` (next to the existing `SKILL.md`):

```yaml
id: digdir.tekstforfatter-docs
type: skill
name: Tekstforfatter (docs)
version: 1.0.0
description: Norsk tekstforfatter og redaktør for Digdir: klarspråk, AI-markører, anglisismer og mikrotekst.
owner:
  team: Altinn Studio
  contact: altinn-studio@digdir.no      # use the team's real contact address
source:
  provider: github
  repository: Altinn/altinn-studio
  path: agents/_skills/tekstforfatter-docs
visibility: internal
lifecycle:
  status: experimental
```

Local dry run on a checkout of that repository (reads only; changes nothing in KI Hub):

```bash
pnpm --filter @kihub/artifact-schema validate path/to/artifact.yaml

# Local scan of a checkout (pure read; the same code path as the break-glass indexer, no database)
SCAN_ROOT=/abs/path/to/altinn-studio pnpm --filter web exec tsx -e \
  "import { scan } from '@kihub/discovery-core'; \
   console.log(JSON.stringify(scan(process.env.SCAN_ROOT!, { expectedRepository: 'Altinn/altinn-studio' })\
     .map(a => ({ path: a.path, valid: a.valid, errors: a.errors })), null, 2));"
```

Expected: the manifest validates; a scan lists `agents/_skills/tekstforfatter-docs` as a valid
`skill`; sibling folders without `artifact.yaml` (`app-development`, `changelog`, …) are ignored until
the team adds a manifest to each.

## 3. Admin steps to bring a repository in (production)

1. In `/cms` → Discovery Sources → create: `repo` = `Altinn/altinn-studio`, `ref` = `main`,
   `tokenEnvVar` = a name such as `GITHUB_TOKEN_STUDIO`.
2. Create a read-only fine-grained PAT (Contents + Metadata, lifetime ≤ 366 days per Altinn org
   policy) and set it as a secret env var of that name on `kihub-web` (new revision).
3. Click "Run now" (or call the existing scan trigger). Open the run: it shows the resolved roots,
   `artifactDirs`, config path and digest, and counts for created / updated / skipped-invalid.
4. Review → approve in the back-office as usual. Edits to a skill folder stale its approval (026).

## 4. Failure drills (must change nothing in the catalog)

Against a source that already owns an artifact, scan fixtures with each fault and confirm a failed run
and an unchanged catalog: `skills:` plural key; `artifactDirs: {skill: [no/such/dir]}`; the same dir
under `skill` and `agent`; `artifactRoots: [.]` plus `artifactDirs: {agent: [skills]}`; an
`artifact.yaml` inside another artifact folder; `discovery: {}`.

## 5. Web guide

```bash
pnpm --filter web test -- contribute-guide
pnpm --filter web dev
```

Open `/bidra` (sign in with the mock user). Check: the custom-layout section answers "Må vi flytte
mapper?", its example matches the tree, the checklist and troubleshooting list show the new items, the
FAQ explains mixing roots and dirs. No console errors; no layout overflow at 375 px.

## 6. Full gate

```bash
pnpm --filter @kihub/discovery-core test && pnpm --filter @kihub/github-client test
pnpm --filter web lint && pnpm --filter web exec tsc --noEmit
pnpm --filter web test
```

Migration: generate with `MEDIA_STORAGE_MODE=azure`, then on a scratch database run migrate up → down →
up and confirm the column appears, disappears and reappears.
