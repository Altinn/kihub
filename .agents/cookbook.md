# Cookbook — Deep Dive

> **Source tree:** `cookbook/copilot-sdk/<lang>/recipe/`  
> **Manifest:** `cookbook/cookbook.yml` (drives the KI Hub website Samples page)

---

## What the Cookbook Is

A set of copy-paste-ready SDK recipes implemented identically in four languages so you can
drop whichever flavour fits your stack. Every recipe lives in a `recipe/` subfolder alongside
language-specific setup docs (`README.md`, `error-handling.md`, etc.).

---

## Recipe Index

| Recipe file (stem) | What it demonstrates |
|---|---|
| `persisting-sessions` | Name a session with a stable ID → `destroy()` → `resume_session()` on the next run |
| `multiple-sessions` | Spawn three independent sessions, send to each concurrently, clean up all |
| `ralph-loop` | Autonomous plan/build loop — see anatomy below |
| `pr-visualization` | Fetch open PRs via GitHub MCP Server, generate a bar-chart PNG, interactive follow-up REPL |
| `error-handling` | `try/catch/finally` skeleton; ensures `client.stop()` always fires |
| `managing-local-files` | Event-driven file organiser; shows `session.on()` + `session.idle` gate |
| `accessibility-report` | *(bonus)* Playwright MCP + streaming `ASSISTANT_MESSAGE_DELTA`; generates WCAG report and optional test file |

---

## Language Comparison

| Concern | Python | Node.js / TypeScript | Go | .NET (C#) |
|---|---|---|---|---|
| **Package** | `github-copilot-sdk` (PyPI) | `@github/copilot-sdk` (npm) | `github.com/github/copilot-sdk/go` | `GitHub.Copilot.SDK` (NuGet, inline `#:package`) |
| **Client start** | `await client.start()` | `await client.start()` | `client.Start(ctx)` | `await client.StartAsync()` |
| **Session create** | `create_session(SessionConfig(...))` | `createSession({...})` | `client.CreateSession(ctx, &SessionConfig{...})` | `client.CreateSessionAsync(new SessionConfig{...})` |
| **Send + wait** | `send_and_wait(MessageOptions(...))` | `sendAndWait({prompt}, timeoutMs)` | `session.SendAndWait(ctx, MessageOptions{...})` | `session.SendAsync(...)` + manual `TaskCompletionSource` |
| **Event listener** | `session.on(fn)` — typed `SessionEventType` enum | `session.on(fn)` — string discriminant `event.type` | `session.On(func(Event))` — type-assert to concrete struct | `session.On(evt => ...)` — pattern-match `is` |
| **Teardown** | `session.destroy()` / `client.stop()` | `session.destroy()` / `client.stop()` | `session.Destroy()` / `defer client.Stop()` | `session.DisposeAsync()` / `client.StopAsync()` |
| **Permission grant** | `lambda _req, _ctx: {"kind": "approved", "rules": []}` | `async () => ({ allow: true })` | `func(...) PermissionRequestResult { return ... }` | `PermissionHandler.ApproveAll` |
| **Run command** | `python ralph_loop.py [plan] [N]` | `npx tsx ralph-loop.ts [plan] [N]` | `go run ralph-loop.go [plan] [N]` | `dotnet run [plan] [N]` |

---

## RALPH Loop Anatomy

RALPH (**R**eview–**A**ct–**L**earn–**P**lan–**H**andle) is an autonomous agentic control loop.
The key insight: **one fresh session per iteration** keeps the agent inside its "smart zone"
(low context pressure) while durable state accumulates on disk between runs.

```
┌──────────────────────────────────────────────────┐
│  ralph_loop(mode, max_iterations)                 │
│                                                   │
│  1. Read prompt from disk                         │
│     plan  →  PROMPT_plan.md                       │
│     build →  PROMPT_build.md                      │
│                                                   │
│  for i in 1..max_iterations:                      │
│  ┌────────────────────────────────────────────┐   │
│  │  2. CreateSession(model, cwd, approveAll)  │   │
│  │  3. session.on → log tool.execution_start  │   │
│  │  4. SendAndWait(prompt, timeout=600s)      │   │
│  │  5. session.destroy()   ← mandatory!      │   │
│  └────────────────────────────────────────────┘   │
│                                                   │
│  State shared across iterations:                  │
│    IMPLEMENTATION_PLAN.md  (plan mode output)     │
│    AGENTS.md               (persistent context)   │
│    specs/*                 (task definitions)     │
└──────────────────────────────────────────────────┘
```

**Mode selection** (all four languages parse CLI args identically):

```
<runner>              # build mode, 50 iterations
<runner> plan         # planning mode
<runner> 20           # build mode, 20 iterations
<runner> plan 5       # planning mode, 5 iterations
```

**Why destroy-per-iteration matters:** The SDK accumulates conversation history in a session.
Long sessions degrade response quality. Destroying and re-creating keeps each agent call fast
and focused on the current task description.

---

## Key SDK Patterns Used Across Recipes

**Event-driven completion gate** (Python `managing-local-files`, `pr-visualization`):
```python
done = asyncio.Event()
def handle(event):
    if event.type.value == "session.idle":
        done.set()
session.on(handle)
await session.send(...)
await done.wait()
```

**Streaming output** (`accessibility-report`):
```python
if event.type == SessionEventType.ASSISTANT_MESSAGE_DELTA:
    print(event.data.delta_content or "", end="", flush=True)
```

**MCP server attachment** (`accessibility-report`, `pr-visualization`):
```python
SessionConfig(
    mcp_servers={"playwright": {"type": "local", "command": "npx",
                                "args": ["@playwright/mcp@latest"], "tools": ["*"]}}
)
```

---

## Adding a New Recipe

1. Create `cookbook/copilot-sdk/<lang>/recipe/<name>.<ext>` in all four languages.
2. Add a markdown explainer at `cookbook/copilot-sdk/<lang>/<name>.md`.
3. Link it in each `cookbook/copilot-sdk/<lang>/README.md`.
4. Register it in `cookbook/cookbook.yml` under `recipes:` with `id`, `name`, `description`, and `tags`.
5. Run `npm run build` — the generated `docs/` and `README.md` will pick it up automatically.

---

## Related Detail Files

| File | What it adds |
|---|---|
| [`AGENTS.md`](../AGENTS.md) | Top-level directory map and CI requirements |
| [`.agents/mcp-setup.md`](mcp-setup.md) | How to configure MCP servers (Playwright, GitHub) per session |
| [`.agents/ci-validation.md`](ci-validation.md) | Why `npm run build` must be committed before pushing |
