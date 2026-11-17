# Contract: Repository `kihub.yaml` v1

## Location and fallback

- Exact filename: `/kihub.yaml` at repository root.
- Read from the discovery source's configured Git ref.
- No `.yml`, JSON, nested, or alternate config is consulted.
- A 404/absent file resolves to the backward-compatible default root `.`.
- A present invalid file fails the complete source scan.

## Valid shape

```yaml
schemaVersion: 1
discovery:
  artifactRoots:
    - .
    - src
    - services/forms
```

The mapping is strict. Allowed keys are exactly:

- top level: `schemaVersion`, `discovery`
- `discovery`: `artifactRoots`

## Root grammar

- list length: 1–32
- `.` means repository root
- otherwise: slash-separated non-empty POSIX segments
- allowed segment characters: ASCII letters, digits, `.`, `_`, `-`
- segments `.` and `..` are forbidden inside a non-root path
- leading/trailing slash, `//`, backslash, colon/URL form, whitespace-only values, control/NUL
  characters, and normalized duplicates are forbidden

Root order is normalized to deterministic lexicographic order before scanning and config hashing.

## Enumeration

For every root and existing `TYPE_DIRS` value, only this exact depth is eligible:

```text
<root>/<type>/<slug>/artifact.yaml
```

`slug` is one non-empty path segment. Arbitrarily deeper manifests are invisible. Every configured
root must exist as a directory/tree at the ref, even when it contains no artifacts.

## Canonical config digest

For a present valid file, serialize this normalized JSON without whitespace and SHA-256 it:

```json
{"schemaVersion":1,"discovery":{"artifactRoots":[".","services/forms","src"]}}
```

Store as `sha256:<hex>`. The absent fallback has a null config digest so operators can distinguish
implicit compatibility behavior from repository-owned configuration.

## Failure contract

YAML syntax errors/warnings, aliases, custom tags, multiple documents, non-mapping roots, unknown
keys, invalid versions, invalid root values, missing configured roots, and truncated repository trees
throw a typed discovery/config error. Automated discovery records a failure run and does not call
reconcile.
