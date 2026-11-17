# Contract: `kihub.yaml` v1 — `artifactDirs` extension

Extends [`specs/026-flexible-artifact-discovery/contracts/discovery-config-v1.md`](../../026-flexible-artifact-discovery/contracts/discovery-config-v1.md).
Everything in 026 not mentioned here is unchanged (location, fallback, strictness, YAML restrictions).

## Valid shapes

Skills in a non-standard folder, nothing else:

```yaml
schemaVersion: 1
discovery:
  artifactDirs:
    skill:
      - agents/_skills
```

Mixed: a root layout under `src` plus agents and skills in custom folders:

```yaml
schemaVersion: 1
discovery:
  artifactRoots:
    - src
  artifactDirs:
    agent:
      - custom/bots
    skill:
      - agents/_skills
      - docs/skills
```

Allowed keys: top level `schemaVersion`, `discovery`; `discovery`: `artifactRoots`, `artifactDirs`.

## Grammar

- `artifactDirs` keys: exactly `skill`, `prompt`, `workflow`, `mcp`, `template`, `policy`, `playbook`,
  `agent`.
- Values: non-empty list of strings.
- Entry grammar: the 026 root grammar **minus `.`** (ASCII letters, digits, `.`, `_`, `-` per segment; no
  leading/trailing `/`, `//`, backslash, `:`; no `.`/`..` segments; no whitespace or control characters).
- Entries unique within a type; ≤ 32 entries across all types. `artifactRoots` keeps 1–32 when present.
- At least one of `artifactRoots`, `artifactDirs` is required; `discovery: {}` fails.
- **Only listed locations are scanned.** No implicit `.` root is added when only `artifactDirs` is given.

## Enumeration

For each `artifactDirs[T]` entry `D`, only this depth is eligible and its expected type is `T`:

```text
<D>/<slug>/artifact.yaml
```

`slug` is one non-empty path segment. Deeper manifests are invisible. Every `D` must exist as a
directory/tree at the ref. Root-layout enumeration is as in 026 and gives each of its eight type
directories its implied type.

## Canonical config digest

Roots-only (and absent-file) behaviour is byte-identical to 026:

```json
{"schemaVersion":1,"discovery":{"artifactRoots":[".","src"]}}
```

When `artifactDirs` is non-empty, it is appended inside `discovery`, with types in the fixed order
`skill, prompt, workflow, mcp, template, policy, playbook, agent` and each list sorted by UTF-8 bytes;
`artifactRoots` is always serialized (`[]` when only dirs are given):

```json
{"schemaVersion":1,"discovery":{"artifactRoots":[],"artifactDirs":{"skill":["agents/_skills"]}}}
```

Stored as `sha256:<hex>`. Entry order in the file never changes the digest.

## Failure contract (whole scan fails, nothing in the catalog changes)

Everything 026 listed, plus: unknown `artifactDirs` type key, non-list or empty list, unsafe or `.`
entry, duplicate entry, over-limit, `discovery` with neither key, same directory under two types,
directory that the root layout reads as another type, missing listed directory, nested artifact
folders. Messages are fixed by [`scan-and-conflicts.md`](./scan-and-conflicts.md).
