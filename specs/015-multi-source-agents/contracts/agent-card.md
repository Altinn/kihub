# Contract: Agent Card ingestion (`agent-card.json`, A2A v1.0)

**Status**: proposed by feature 015

## Location & applicability

- Optional file `agents/<slug>/agent-card.json`, sibling of the agent's `artifact.yaml`.
- Fetched only for **valid manifests of `type: agent`** (never fetched for other types — FR-014).
- Absent file (404) is normal: the agent registers with no card and the detail page shows no
  card section.

## Validation (`validateAgentCard` in `@kihub/artifact-schema`)

Tolerant by design (R6): **unknown fields pass through and are stored**; known fields are
type-checked when present. Failure modes below make the card invalid — the **artifact still
registers**; the card is not stored (and any previously stored card is cleared), and the errors
are reported per path in the discovery run (`cardIssues`).

| Rule | Detail |
|---|---|
| Size | raw file ≤ 256 KB (checked before parsing) |
| Syntax | must parse as a JSON object |
| `name` | **required**, non-empty string — the only required field |
| `description`, `version` | string when present |
| `provider` | object; `name`/`organization`/`url` strings when present |
| `supportedInterfaces` | array of objects; each item requires `url` (string) and `protocol` (string); `version` string when present |
| `capabilities` | object; `streaming`/`pushNotifications`/`extendedAgentCard` booleans when present |
| `defaultInputModes`, `defaultOutputModes` | arrays of strings when present |
| `skills` | array of objects; each item requires `name` (non-empty string); `id`/`description` strings, `tags`/`examples` string arrays when present |
| `securitySchemes` | object when present |
| `security` | array when present |

Error format mirrors `validateManifest`: `"<json.path>: <message>"`, `(root)` for top-level
issues.

## Storage semantics

- Stored verbatim (parsed JSON) in `artifacts.agentCard` (jsonb) — including unknown fields.
- Refreshed on **every** scan of the owning source: valid card → replace; missing or invalid
  card → `null` (no stale cards, ever).
- Indexed technical metadata (constitution Principle I/II): never editable in KI Hub, owned by
  the source repository. Not included in full-text search (deferred; seam documented in R8).

## Rendering contract (detail page, `AgentCardPanel`)

Rendered only when `agentCard` is non-null, between the install card and the README. KI Hub
labels are Norwegian; **card content renders verbatim as authored**. Field groups shown:

| Group (Norwegian heading) | Source fields |
|---|---|
| «Agentkort» header line | `name`, `version`, `provider.name`/`organization` (+ `url` as link), `description` |
| «Ferdigheter» | `skills[]`: name, description, tags as chips, examples as list |
| «Egenskaper» | `capabilities` flags as labeled tags (Strømming, Push-varsler, Utvidet agentkort) |
| «Grensesnitt» | `supportedInterfaces[]`: protocol + URL (+ version) |
| «Inn-/utdataformater» | `defaultInputModes`, `defaultOutputModes` |
| «Autentisering» | `securitySchemes` — scheme names/types only |

Groups with no data are omitted; an object with only `name` renders just the header line.

## Example (valid)

```json
{
  "name": "Support Agent",
  "description": "Answers internal support questions and escalates unresolved issues.",
  "version": "1.0.0",
  "provider": { "organization": "Digdir", "url": "https://www.digdir.no" },
  "supportedInterfaces": [
    { "url": "https://agents.digdir.no/support", "protocol": "json-rpc", "version": "1.0" }
  ],
  "capabilities": { "streaming": true, "pushNotifications": false },
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain", "application/json"],
  "skills": [
    {
      "id": "resolve-support-request",
      "name": "Resolve support request",
      "description": "Classify, resolve or escalate a support request.",
      "tags": ["support", "triage"],
      "examples": ["Jeg får ikke logget inn i KI Hub"]
    }
  ],
  "securitySchemes": { "oauth": { "type": "oauth2" } }
}
```
