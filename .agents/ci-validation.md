# CI Validation — Deep Dive

> Covers every workflow that gates PRs in this repo, what each step actually checks, the most common failure modes, and the exact commands to fix them.

---

## Pre-push checklist (run this before every feature-branch push)

```bash
npm run build           # regenerates README.md, docs/, and marketplace.json
npm run plugin:validate # validates every plugins/<name>/.github/plugin/plugin.json
npm run skill:validate  # validates every skills/<name>/SKILL.md frontmatter
```

`npm start` is an alias for `npm run build`. The CI runs the same three commands — running them locally first avoids round-trips on slow CI.

Never push directly to `staging` or `main`. Open a PR from a feature/fix branch into
`staging` for regular changes. Promote `staging` to `main` through a PR for production
releases.

---

## 1. `validate-readme.yml`

**Triggers:** PRs to `staging` or `main` that touch `agents/`, `instructions/`, `skills/`, `plugins/`, `workflows/`, `docs/`, `README.md`, or any `*.js` file.

### What it does

1. Runs `npm run plugin:validate` (see §1a).
2. Runs `npm run skill:validate` (see §1b).
3. Runs `npm start` (`eng/update-readme.mjs` → `eng/generate-marketplace.mjs`).
4. Runs `git diff --exit-code`. Any unstaged diff = failure.
5. Posts a sticky PR comment with the full diff when it fails (for contributors with push access).

### Generated outputs checked

| File | Generator |
|---|---|
| `README.md` | `eng/update-readme.mjs` — featured-plugins section |
| `docs/README.agents.md` | agent table |
| `docs/README.instructions.md` | instructions table |
| `docs/README.skills.md` | skills table |
| `docs/README.hooks.md` | hooks table |
| `docs/README.workflows.md` | workflows table |
| `docs/README.plugins.md` | plugins table |
| `.github/plugin/marketplace.json` | `eng/generate-marketplace.mjs` |

**Fix:** `npm start && git add -A && git commit -m "chore: regenerate docs"`.

### 1a. Plugin validation (`eng/validate-plugins.mjs`)

Each `plugins/<slug>/` must satisfy all of the following:

| Rule | Detail |
|---|---|
| `.github/plugin/plugin.json` exists | Hard requirement — stops all other checks |
| `README.md` exists | In the plugin root |
| `name` matches folder slug | Lowercase letters, numbers, hyphens only; 1–50 chars |
| `description` present | 1–500 chars |
| `version` present | Any non-empty string |
| `keywords` / `tags` (optional) | Array, max 10 entries, each lowercase alphanumeric-hyphen, max 30 chars |
| `agents[i]` paths | Must start with `./agents/`, end with `.md`; source file `agents/<slug>.agent.md` must exist at repo root |
| `skills[i]` paths | Must start with `./skills/`, end with `/`; source file `skills/<slug>/SKILL.md` must exist at repo root |

**Common failures:**

- Added a new agent to `agents/` but forgot to update `plugin.json` — path check fails.
- Plugin folder name is `My-Plugin` (capital letters) — name validation fails.
- Referenced `./skills/foo/` but `skills/foo/SKILL.md` doesn't exist yet.

### 1b. Skill validation (`eng/validate-skills.mjs`)

Each `skills/<name>/` must satisfy:

| Rule | Detail |
|---|---|
| `SKILL.md` exists | Parsed for YAML frontmatter |
| `name` in frontmatter | Lowercase alphanumeric-hyphens; 1–64 chars; must match folder name |
| `description` in frontmatter | 10–1024 chars |
| Bundled assets accessible | Each listed asset file must exist and be < 5 MB |
| No duplicate `name` values | Across all skills in the repo |

---

## 2. `check-plugin-structure.yml`

**Triggers:** PRs to `staging` or `main` that touch any file under `plugins/`.

### What it does

Scans every `plugins/<name>/` directory for:

- Subdirectories named `agents/`, `commands/`, or `skills/` that contain files.
- Any symlinks anywhere inside a plugin directory.

Plugin directories must contain **only** `.github/plugin/plugin.json` and `README.md`. Materialized content (the actual agent/skill files) must never be committed under `plugins/` — that is the job of `eng/materialize-plugins.mjs`, which runs downstream.

**Failure:** CI posts a `REQUEST_CHANGES` review blocking the merge.

**Fix:**

```bash
# Remove accidentally committed materialized subdirectories
find plugins/ -mindepth 2 -maxdepth 2 -type d \
  \( -name agents -o -name commands -o -name skills \) \
  -exec rm -rf {} +

# Remove any symlinks
find plugins/ -type l -delete

git add -A && git commit -m "fix: remove materialized plugin files"
git push
```

---

## 3. `validate-agentic-workflows-pr.yml`

**Triggers:** PRs to `staging` or `main` that touch any file under `workflows/`.

### Job 1 — `check-forbidden-files`

Blocks the following from appearing in the PR diff:

| Forbidden pattern | Why |
|---|---|
| `workflows/**/*.yml` | Compiled output — could embed untrusted Actions code |
| `workflows/**/*.yaml` | Same |
| `workflows/**/*.lock.yml` | Compiled lock file — generated downstream, not in this repo |
| `.github/*` or `.github/**` | Plugin/workflow contributions must not modify repo config |

**Allowed exceptions** (auto-excluded from the check):

- `.github/aw/actions-lock.json` — needed by the `gh aw` toolchain.
- `.github/workflows/validate-agentic-workflows-pr.yml` itself.

**Fix:** Delete any `.yml`/`.yaml` files from `workflows/` before pushing. Contribute only the `.md` source. Never touch `.github/`.

### Job 2 — `compile-workflows` (runs only if Job 1 passes)

Installs the `gh-aw` CLI (`github/gh-aw@v0.68.3`) and runs:

```bash
gh aw compile --validate <workflow>.md
```

for every `*.md` file directly inside `workflows/`.

**Fix locally:**

```bash
gh extension install github/gh-aw
gh aw compile --validate workflows/<your-file>.md
```

Common compilation errors are malformed YAML frontmatter or missing required fields (`name`, `on`, `description`). See the [gh-aw docs](https://github.github.com/gh-aw).

---

## 4. `check-line-endings.yml`

**Triggers:** Every push to `staging` or `main` **and** every PR to `staging` or `main` (no path filter — all commits).

### What it does

```bash
grep -l $'\r' $(find . -name "*.md")
```

Any `*.md` file containing a carriage return (`\r`, i.e., CRLF) causes the job to fail with the list of offending files.

**Fix:**

```bash
# Convert CRLF → LF in all markdown files
find . -name "*.md" -exec sed -i 's/\r//' {} +
git add -A && git commit -m "fix: normalize line endings to LF"
```

**Prevent recurrence:** Add a `.gitattributes` file:

```gitattributes
* text=auto eol=lf
```

Or configure git locally: `git config core.autocrlf false`.

---

## Workflow dependency map

```
PR opened / updated
 ├── validate-readme.yml       (agents/, instructions/, skills/, plugins/, workflows/, docs/, README.md, *.js)
 │    ├── plugin:validate
 │    ├── skill:validate
 │    └── npm start → git diff
 ├── check-plugin-structure.yml (plugins/**)
 │    └── scan for materialized files / symlinks
 ├── validate-agentic-workflows-pr.yml (workflows/**)
 │    ├── check-forbidden-files
 │    └── compile-workflows (gh aw compile --validate)
 └── check-line-endings.yml    (all files, no filter)
```

All four workflows must pass before a PR can be merged into `staging` or `main`.
