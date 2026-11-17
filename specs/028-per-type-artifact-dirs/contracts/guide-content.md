# Contract: documentation and `/bidra` guide content

Every place that explains discovery must say the same things. This contract fixes the claims and the
test hooks; the Norwegian copy is written during implementation.

## Claims every document must carry

1. Teams do **not** have to move folders. They add one `kihub.yaml` at the repository root and one
   small `artifact.yaml` inside each artifact folder, next to its content (e.g. `SKILL.md`).
2. Two ways to say where artifacts live, usable together:
   - `artifactRoots` — a folder that contains `<type-dir>/<slug>/` (026).
   - `artifactDirs` — a folder per **type** that directly contains `<slug>/` (028).
3. Only what `kihub.yaml` lists is scanned. Without `kihub.yaml`, only the repository root layout is.
   With only `artifactDirs`, the root layout is *not* scanned.
4. One level only: `<dir>/<slug>/artifact.yaml`. No recursive search, no globs.
5. `type` in the manifest must equal the type the folder is listed under; `source.path` is the full
   real folder (e.g. `agents/_skills/tekstforfatter-docs`); `source.repository` matches the registered
   repository.
6. Limits: ≤ 32 roots, ≤ 32 `artifactDirs` entries in total; `.` is not allowed as an `artifactDirs`
   entry; type keys are singular (`skill`, not `skills`).
7. Fail-closed: a bad `kihub.yaml`, a missing listed folder, a folder listed for two types, or nested
   artifact folders stop the whole scan with nothing changed; a single bad `artifact.yaml` only
   skips that artifact.
8. Governance is unchanged: approvals follow version + content of the artifact's own folder.

## Where each document changes

| Document | Change |
|----------|--------|
| `documentation/artifact-discovery.md` | Repository layout section gains `artifactDirs`; fail-safe section lists new failures; operator steps for registering a repository with a custom layout. |
| `packages/artifact-schema/docs/artifact-manifest.md` | "Type directories" and "Artifact roots" sections gain `artifactDirs`; `source.path`/`type` rows mention configured directories. |
| `README.md` | Discovery paragraph and `kihub.yaml` example gain `artifactDirs`. |
| `CLAUDE.md` | Active-feature note for 028 (short), plus the `<!-- SPECKIT -->` plan pointer. |
| `specs/026-…/contracts/discovery-config-v1.md`, `scan-and-digest.md` | One-line "Extended by 028" pointer only; history is not rewritten. |
| `apps/web/src/lib/contribute-guide.ts` | New data: `EXAMPLE_KIHUB_DIRS_CONFIG`, `EXAMPLE_CUSTOM_LAYOUT_TREE`, `EXAMPLE_CUSTOM_LAYOUT_MANIFEST`; updated checklist; new troubleshooting entries; new FAQ entries. |
| `apps/web/src/app/(app)/bidra/page.tsx` | Renders the new example beside the root-layout one; wording about "must be exactly two levels below the root" becomes conditional on the configuration. |

## `/bidra` guide — required elements (Norwegian)

- **Section on custom layouts** answering "Må vi flytte mapper?" with the answer *nei*, followed by the
  example tree, `kihub.yaml` and a matching `artifact.yaml` (with `source.path` = full folder).
- **Checklist** gains: `kihub.yaml` lists the folder for the right type; folder exists on the branch KI
  Hub reads; `source.path` is the full path.
- **Troubleshooting entries** (title → cause → fix), one per message class in `scan-and-conflicts.md`:
  - «Ukjent type i kihub.yaml» (plural key such as `skills`).
  - «Mappen i kihub.yaml finnes ikke».
  - «Samme mappe er oppført for to typer».
  - «Artefaktmapper ligger inni hverandre».
  - The existing «Feil i kihub.yaml» and «type passer ikke med mappen» entries are extended, not duplicated.
- **FAQ**: "Kan vi blande?" (yes, `artifactRoots` + `artifactDirs`; only listed locations are scanned) and
  "Hvorfor finner KI Hub ikke mappen min?" (not listed, or one level too deep).
- Plain Norwegian, no jargon without a gloss; code samples are copy-ready and valid.

## Test hooks (`apps/web/tests/unit/contribute-guide.test.ts`)

1. `EXAMPLE_KIHUB_DIRS_CONFIG` parses with the real `resolveDiscoveryConfig`; its resolved
   `artifactDirs` equals the documented mapping.
2. The paths in `EXAMPLE_CUSTOM_LAYOUT_TREE` run through the real `buildLayout` + `matchArtifactDirs`
   return exactly the artifact folders the tree annotates, and none of the decoy folders it shows.
3. `EXAMPLE_CUSTOM_LAYOUT_MANIFEST` passes the real `validateManifest` and its `source.path` equals the
   matched folder; its `type` equals the configured type.
4. Every fixed failure fragment (`DISCOVERY_FAILURE_MARKERS`, exported by discovery-core) is quoted in the
   `errors` of some troubleshooting entry, and every quoted fragment is a real marker or a known
   per-artifact fragment, so a reworded error without a guide update fails CI.
5. A negative example (plural `skills:` key) is rejected by the real parser with the plural hint.
