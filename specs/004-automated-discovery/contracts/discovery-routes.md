# Contract: Discovery routes + in-app trigger

Three entry points, one shared `runDiscovery` code path.

## `POST /api/discovery/webhook/[sourceId]`  (GitHub webhook — machine caller, no session)

- **Source selection from a trusted URL**: the target source is identified by the `[sourceId]` path
  segment, **not** by the request body. This means the HMAC secret is chosen from a trusted source
  (the URL configured on the GitHub webhook) before any untrusted payload is interpreted — avoiding
  the chicken-and-egg of parsing an unverified body to pick which secret to verify against. Each
  source gets its own webhook URL when registered in GitHub.
- **Auth**: verify `X-Hub-Signature-256` = `sha256=` + HMAC-SHA256(rawBody, source.webhookSecret),
  compared with `crypto.timingSafeEqual`, where `source` = the doc for `[sourceId]`. Missing/invalid
  signature → `401`, **no discovery** (FR-002, SC-002). Unknown/disabled `[sourceId]` → `404`.
- **Body**: read the **raw** request body for signature correctness before JSON parsing; the parsed
  body is used only for event-type routing after the signature passes.
- **Events**: `ping` → `204`. `push` → `runDiscovery(source, 'webhook')` (full re-scan per
  Clarifications). Other events → `204` (ignored).
- **Response**: `202 Accepted` once the run is started/queued; the run outcome is recorded in
  `discovery-runs` (not awaited by GitHub beyond ack).
- **Disabled source** (`enabled:false`) or unknown `[sourceId]` → `404`, no run.

## `POST /api/discovery/scan`  (scheduled scan — external scheduler, research §1)

- **Auth**: shared-secret header (e.g. `X-Discovery-Scan-Key`) compared to an env secret; mismatch
  → `401`. Distinct from webhook HMAC.
- **Action**: `runDiscovery(source, 'scheduled')` for every `enabled` source; converges the catalog
  to true repo state (FR-006/FR-007). Cadence is set at the scheduler (default daily).
- **Response**: `200` with a per-source outcome summary.

## In-app trigger — `triggerDiscovery(sourceId)` Server Action (Admin, `lib/discovery.ts`)

- **Auth**: Admin only, server-side (Phase 3 role gate on the live `users.role`); non-Admin →
  refused (FR-013, SC-008). Successor to the Phase 2 CLI.
- **Action**: `runDiscovery(source, 'manual', actor)` immediately; `triggeredBy` = acting Admin.
- **UI**: `(app)/admin/discovery/page.tsx` — source cards (name, last run, outcome) + run-history
  list; a "Run now" button per source calls the action and reflects the new run. Designsystemet
  components only.

## Cross-cutting

- All three call the identical `runDiscovery`; reconcile semantics + run recording defined once.
- Secrets never echoed in any response or run record.
- A rapid burst of webhooks for one source is coalesced by per-source serialization (research §4).
