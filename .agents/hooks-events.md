# Hook Events — Deep Dive

> **Repo path:** `hooks/<name>/` (source) → install to `.github/hooks/` in target repo  
> **Spec:** [GitHub Copilot hooks documentation](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/use-hooks)

---

## How Hooks Work

Hooks are shell scripts triggered by lifecycle events during a Copilot coding-agent session.  
They run **synchronously** on the user's machine — the agent waits for each hook to finish.  
A **non-zero exit code blocks** the triggering action (prompt, tool call, etc.).

Hook config files live at `.github/hooks/*.json`. All `*.json` files in that directory are loaded automatically — no registration needed beyond committing to the default branch.

---

## Event Reference

| Event | Fires When | Can Block? | Typical Uses |
|---|---|---|---|
| `sessionStart` | Agent session begins or resumes | No | Init env, log session, validate repo state |
| `sessionEnd` | Session completes or is terminated | No | Clean up temp files, generate reports, send notifications |
| `userPromptSubmitted` | User submits a prompt (before agent sees it) | Yes | Governance scanning, PII detection, audit logging |
| `preToolUse` | Before any tool call (`bash`, `edit`, etc.) | **Yes** | Block dangerous commands, enforce security policies |
| `postToolUse` | After a tool call completes | No | Format code, lint, log tool results |
| `agentStop` | Main agent finishes responding to a prompt | Yes | Run final linters/formatters, validate complete changes |
| `subagentStop` | A subagent finishes before returning results | No | Audit subagent outputs |
| `errorOccurred` | An error occurs during agent execution | No | Error logging, alerting, pattern tracking |

> **`preToolUse` is the gatekeeper.** It receives JSON with tool name and arguments; exit non-zero to deny execution entirely.

---

## hooks.json Schema

```json
{
  "version": 1,
  "hooks": {
    "<eventName>": [
      {
        "type": "command",
        "bash": "./scripts/my-hook.sh",
        "powershell": "./scripts/my-hook.ps1",
        "cwd": ".",
        "timeoutSec": 10,
        "env": {
          "MY_VAR": "value"
        }
      }
    ]
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `type` | Yes | Always `"command"` |
| `bash` | One of bash/powershell | Unix command or script path |
| `powershell` | One of bash/powershell | Windows command or script path |
| `cwd` | No | Working dir relative to repo root; defaults to `.` |
| `timeoutSec` | No | Hook killed on timeout, agent continues; default 30 |
| `env` | No | Merged into the process environment |

Multiple entries per event run **in array order**; a failure in one may skip the rest.

---

## Governance-Audit Hook Walkthrough

**Source:** `hooks/governance-audit/`  
**Events used:** `sessionStart`, `userPromptSubmitted`, `sessionEnd`

### What it does

| Script | Event | Behaviour |
|---|---|---|
| `audit-session-start.sh` | `sessionStart` | Logs `session_start` JSON entry; prints governance level |
| `audit-prompt.sh` | `userPromptSubmitted` | Regex-scans the prompt for 5 threat categories; logs findings; optionally blocks |
| `audit-session-end.sh` | `sessionEnd` | Counts events since last `session_start`; logs `session_end` summary |

### Threat categories scanned by `audit-prompt.sh`

| Category | Example signals | Severity range |
|---|---|---|
| `data_exfiltration` | "send all records to external API", `curl … -d` | 0.7 – 0.95 |
| `privilege_escalation` | `sudo`, `chmod 777`, "add to sudoers" | 0.8 – 0.95 |
| `system_destruction` | `rm -rf /`, `DROP DATABASE`, "wipe all" | 0.9 – 0.95 |
| `prompt_injection` | "ignore previous instructions", role reassignment | 0.6 – 0.9 |
| `credential_exposure` | Hardcoded API keys, `AKIA…` AWS keys | 0.9 – 0.95 |

### Governance levels

| Level | Block behaviour |
|---|---|
| `open` | Log only, never block |
| `standard` | Log; block only if `BLOCK_ON_THREAT=true` |
| `strict` | Log and block all detected threats |
| `locked` | Log and block all detected threats |

### Log format (`logs/copilot/governance/audit.log`, JSON Lines)

```jsonc
{"timestamp":"…","event":"session_start","governance_level":"standard","cwd":"/workspace"}
{"timestamp":"…","event":"prompt_scanned","governance_level":"standard","status":"clean"}
{"timestamp":"…","event":"threat_detected","governance_level":"standard","threat_count":1,
  "max_severity":0.9,"threats":[{"category":"privilege_escalation","severity":0.9,
  "description":"Elevated privileges","evidence":"sudo"}]}
{"timestamp":"…","event":"session_end","total_events":12,"threats_detected":1}
```

> Full prompt text is **never** logged — only matched snippets (base64-decoded at write time) and metadata.

### Runtime dependencies

`jq` (JSON), `grep -E` (regex), `bc` (float compare — gracefully degrades if absent).

---

## Install Steps

```bash
# 1. Copy hook folder into target repo
cp -r hooks/governance-audit .github/hooks/

# 2. Make scripts executable
chmod +x .github/hooks/governance-audit/*.sh

# 3. Keep logs local (never commit them)
mkdir -p logs/copilot/governance
echo "logs/" >> .gitignore

# 4. Commit to the default branch — hooks activate automatically
git add .github/hooks/governance-audit .gitignore
git commit -m "chore: add governance-audit hook"
```

To tighten the policy, edit the `env` block in `hooks.json`:

```json
"env": {
  "GOVERNANCE_LEVEL": "strict",
  "BLOCK_ON_THREAT": "true"
}
```

To disable without removing files: `export SKIP_GOVERNANCE_AUDIT=true` (or set it in the hook's `env`).

---

## Authoring Tips

- **`set -euo pipefail`** — fail fast; ensures non-zero exit propagates.
- **One responsibility per script** — keep `preToolUse` scripts focused so failures are diagnosable.
- **Respect timeouts** — format checks on large repos may need 30–60 s; governance scans should finish in < 10 s.
- **Layer hooks** — add multiple entries to the same event array rather than one monolithic script.
- **Test manually first** — run the script with sample JSON piped to `stdin` before wiring it into `hooks.json`.
