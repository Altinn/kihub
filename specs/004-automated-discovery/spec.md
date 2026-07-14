# Feature Specification: Phase 4 — Automated Discovery Triggers

**Feature Branch**: `feat/new-architecture` (Phase 4 work; no dedicated branch)

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Phase 4 — Automated discovery triggers. Replace on-demand CLI indexing with automated discovery: webhook-driven and scheduled scans that detect new/changed AI artifacts across connected sources and feed them into the catalog and governance lifecycle established in Phases 1-3. Continues the same phased Spec Kit flow as Phases 1-3."

## Clarifications

### Session 2026-07-14

- Q: How does automated discovery obtain artifact content from a source (Phase 2 read a local checkout at a fixed path)? → A: Remote fetch from GitHub — discovery fetches repository content directly from the remote using stored credentials; this introduces a GitHub client and credential handling for each source. No local checkout is required for automated runs.
- Q: When a change notification (push) arrives, what should discovery process — the whole source or only changed files? → A: Full re-scan — every trigger re-scans and reconciles the entire source repository, reusing the existing idempotent reconcile. No delta/per-file processing; the full scan is self-correcting. Delta optimization is deferred unless a concrete performance need arises.
- Q: How is an inbound change notification verified as genuinely from the configured GitHub source? → A: Shared-secret signature (HMAC) — each source holds a secret shared with GitHub; GitHub signs every notification and KI Hub verifies the signature, rejecting any notification that fails verification. Replay de-duplication is not needed this phase because reconcile is idempotent.
- Q: What happens to the Phase 2 maintainer CLI now that automated triggers and an in-app Admin trigger exist? → A: Keep as break-glass fallback — automated triggers plus the in-app on-demand trigger are the primary path; the CLI is retained (not deleted) for local dev, seeding, and emergency manual runs when the app or webhooks are unavailable. "Replace" means the CLI is no longer the required mechanism. The CLI may continue to read a local checkout; remote fetch applies to the automated/in-app paths.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Webhook-driven discovery on repository change (Priority: P1)

When an artifact source repository changes (an artifact is added, edited, or removed and the change is pushed), the connected source notifies KI Hub, and KI Hub automatically re-discovers the affected repository and reconciles the catalog — creating new catalog entries, updating changed ones, and deactivating entries whose artifacts have been removed — without any maintainer running a command. Existing governance state (owners, lifecycle, reviews) is preserved; newly discovered artifacts enter the catalog ready to be governed.

**Why this priority**: This is the headline of Phase 4 — it removes the manual CLI step that gated the catalog's freshness in Phase 2. The moment a change lands in the content repository, the catalog reflects it. It is independently verifiable (deliver a change notification and confirm the catalog updated) and delivers the core value of "the catalog is always current" on its own.

**Independent Test**: Configure a source, deliver a valid change notification representing a push (new, updated, and removed artifacts), and confirm the catalog reconciles accordingly — new entries created, changed entries updated, removed entries deactivated — with no duplicates and with any existing governance metadata intact, and confirm the run is recorded.

**Acceptance Scenarios**:

1. **Given** a configured source repository, **When** a valid change notification is received, **Then** KI Hub discovers the repository and reconciles the catalog (create/update/deactivate by stable artifact ID) with no duplicates.
2. **Given** a change notification, **When** it cannot be authenticated as genuinely from the configured source, **Then** it is rejected and no discovery runs.
3. **Given** a newly discovered artifact with a valid manifest, **When** discovery completes, **Then** a catalog entry exists keyed by its stable artifact ID and a governance record is available for it (defaulting lifecycle from the manifest where present), exactly as if it had been indexed manually.
4. **Given** an already-governed artifact, **When** an automated discovery run updates its technical metadata, **Then** its governance state (owners, risk, lifecycle, reviews, audit history) is preserved and not overwritten.
5. **Given** an artifact removed from the repository, **When** the change is discovered, **Then** its catalog entry is deactivated while its governance history is retained.
6. **Given** an artifact whose manifest fails validation, **When** discovery runs, **Then** that artifact is skipped and reported, and valid artifacts in the same run are still reconciled.

---

### User Story 2 - Scheduled catch-up scan (Priority: P2)

On a recurring schedule, KI Hub scans every configured source and reconciles the catalog, so the catalog self-heals even if a change notification was missed, delayed, or never sent (e.g. the source was connected after changes already existed, or a notification was dropped). The scheduled run behaves identically to a webhook-driven run in how it reconciles and preserves governance state.

**Why this priority**: Webhooks are best-effort — deliveries can be missed and sources can be connected mid-stream. A scheduled scan is the safety net that guarantees eventual consistency without manual intervention. It builds directly on the same discovery/reconcile path as US1 and is independently testable (let the schedule fire, or trigger a scheduled run, against a source with drift and confirm it converges).

**Independent Test**: Introduce drift between a source and the catalog (a change made with no notification delivered), let the scheduled scan run, and confirm the catalog converges to the repository's true state with governance preserved and the run recorded.

**Acceptance Scenarios**:

1. **Given** one or more configured sources, **When** the scheduled scan runs, **Then** every source is scanned and the catalog is reconciled to match, with the same create/update/deactivate semantics as a webhook run.
2. **Given** drift caused by a missed notification, **When** the next scheduled scan runs, **Then** the catalog converges to the repository's true state.
3. **Given** a source connected after it already contained artifacts, **When** the scheduled scan runs, **Then** those pre-existing artifacts are discovered and catalogued.
4. **Given** an in-progress or recent discovery run for a source, **When** another run (scheduled or webhook) would start for the same source, **Then** runs do not corrupt each other or produce duplicates (they are serialized or safely idempotent).

---

### User Story 3 - Observe and operate automated discovery (Priority: P3)

An Admin can see the state and history of automated discovery: which sources are connected, when each was last discovered, whether the last run succeeded, and a summary of what each run changed (created / updated / deactivated / skipped-invalid). When a run fails or skips invalid manifests, it is surfaced clearly. An Admin can also trigger an immediate discovery run for a source on demand, without waiting for the schedule or a push.

**Why this priority**: Automation that can't be observed is a liability — operators need to trust that discovery is running and to diagnose it when a source misbehaves. It depends on runs existing (US1/US2) and turns the automated pipeline into something operable. The manual on-demand trigger here is the successor to the Phase 2 CLI (now in-app and role-gated).

**Independent Test**: As an Admin, view the discovery status for configured sources (last run time, outcome, change summary), then trigger an on-demand run and confirm it executes, updates the catalog, and appears in the run history; confirm a non-Admin cannot trigger it.

**Acceptance Scenarios**:

1. **Given** configured sources, **When** an Admin views discovery status, **Then** they see each source's last-run time, outcome (success/failure), and a summary of created/updated/deactivated/skipped-invalid counts.
2. **Given** a discovery run that failed or skipped invalid manifests, **When** an Admin views its result, **Then** the failure reason and the list of skipped/invalid items are shown.
3. **Given** a source, **When** an Admin triggers an on-demand discovery run, **Then** it runs immediately with the same reconcile semantics and is recorded in the run history.
4. **Given** a non-Admin user, **When** they attempt to trigger a discovery run or change source configuration, **Then** the action is refused (role-gated, defense in depth).
5. **Given** any automated or manual discovery run, **When** it completes, **Then** a run record exists capturing trigger type (webhook / scheduled / manual), source, timestamp, outcome, and change summary.

---

### Edge Cases

- **Unauthenticated / forged notification**: A change notification that fails authentication is rejected without running discovery and is not treated as a valid trigger.
- **Duplicate / replayed notification**: Receiving the same change notification more than once does not create duplicates or corrupt state (reconcile is idempotent by stable artifact ID).
- **Overlapping runs**: A scheduled scan and a webhook run (or two webhooks) targeting the same source do not clobber each other or produce duplicate entries.
- **Source temporarily unreachable**: If a source can't be reached during a run, the run is recorded as failed with a reason, existing catalog entries are left intact (not mass-deactivated), and the next scheduled scan retries.
- **Malformed / partial content**: Invalid or unparseable manifests are skipped and reported (per Phase 2 validation); a single bad artifact never aborts the whole run.
- **Removed then re-added artifact**: An artifact removed (deactivated) and later re-added is reactivated under the same stable artifact ID, retaining its governance history.
- **New artifact needs governance**: A freshly discovered artifact has no reviews/approval yet; it surfaces with its default governance state (e.g. lifecycle seeded from manifest or Draft) rather than appearing "approved" by default.
- **Notification storm**: A rapid burst of notifications for the same source does not trigger unbounded concurrent work (runs are coalesced or serialized).
- **Schedule missed / downtime**: If a scheduled run is missed because KI Hub was down, the next scheduled run reconciles all accumulated drift.

## Requirements *(mandatory)*

### Functional Requirements

#### Webhook-driven discovery (User Story 1)

- **FR-001**: The system MUST accept change notifications from a configured artifact source and, on a valid notification, automatically run discovery and reconcile the catalog for that source without manual action.
- **FR-001a**: Discovery MUST fetch artifact content remotely from the source repository on GitHub using per-source stored credentials (no local checkout required for automated runs); credentials MUST be stored securely and never exposed in run records or the UI.
- **FR-002**: The system MUST authenticate incoming change notifications using a per-source shared-secret signature (HMAC): every notification is signed by the source and the system MUST verify the signature and reject any notification that fails verification, running no discovery for rejected notifications. The shared secret MUST be stored securely and never exposed in run records or the UI.
- **FR-003**: Automated discovery MUST use the same reconcile semantics as the existing indexer — create/update by stable artifact ID, soft-deactivate artifacts no longer present, skip-and-report invalid manifests, detect duplicates — and MUST be idempotent (repeated or replayed notifications do not create duplicates or corrupt state).
- **FR-004**: Automated discovery MUST preserve existing governance metadata (owners, risk, lifecycle, reviews, approval, audit history) and MUST NOT overwrite it when updating technical metadata (consistent with Phase 3).
- **FR-005**: A newly discovered artifact MUST become a catalog entry keyed by its stable artifact ID and MUST have a governance record available (default state, lifecycle seeded from manifest where present), identical to the manual-indexing outcome.

#### Scheduled scan (User Story 2)

- **FR-006**: The system MUST run a scheduled discovery scan across all configured sources on a recurring, configurable cadence, using the same reconcile semantics as webhook-driven discovery.
- **FR-007**: The scheduled scan MUST cause the catalog to converge to the true state of each source, including catching changes for which no notification was received and artifacts that pre-existed a source's connection.
- **FR-008**: Concurrent or overlapping discovery runs for the same source (scheduled and/or webhook) MUST NOT corrupt state or produce duplicates; runs MUST be serialized or safely idempotent.
- **FR-009**: If a source is unreachable or a run fails, the system MUST record the failure with a reason, MUST NOT mass-deactivate existing entries as a side effect of the failure, and MUST retry on the next scheduled scan.

#### Observability & operation (User Story 3)

- **FR-010**: The system MUST record a run for every discovery execution capturing at least: trigger type (webhook / scheduled / manual), source, start/end time, outcome (success/failure), and a change summary (created / updated / deactivated / skipped-invalid, with the affected artifact IDs or paths).
- **FR-011**: An Admin MUST be able to view, per source, the connection status, last-run time, last outcome, and change/error summary.
- **FR-012**: An Admin MUST be able to trigger an on-demand discovery run for a source from within the application, with the same reconcile semantics; this is the successor to the Phase 2 maintainer CLI.
- **FR-013**: Triggering discovery runs and changing source configuration MUST be role-gated (Admin) and enforced server-side (defense in depth), refused for insufficient roles.
- **FR-014**: Discovery runs and their outcomes MUST be attributed appropriately (trigger source/actor) so operators can audit what changed the catalog and why.

#### Cross-cutting

- **FR-015**: Any discovery-related user interface MUST be built with the mandated design system (constitution).
- **FR-016**: This phase MUST build on Phases 1–3 (auth/roles, catalog/Artifact record, governance) and MUST NOT include semantic search (Phase 5); it changes how discovery is *triggered and sourced*, not the governance model.

### Key Entities *(include if feature involves data)*

- **Source (artifact repository connection)**: A configured connection to an artifact repository on GitHub that discovery scans. Attributes: identifier/name, repository reference, fetch credentials (stored securely), notification authentication/verification configuration, enabled flag, last-run time and outcome. Replaces the single local-checkout path used in Phase 2.
- **Change notification**: An inbound signal from a source that its contents changed, triggering discovery. Must be authenticable to its source; carries enough to identify which source changed.
- **Discovery run**: A record of one discovery execution. Attributes: trigger type (webhook / scheduled / manual), source, start/end time, outcome (success/failure with reason), and change summary (created / updated / deactivated / skipped-invalid counts and identifiers). Forms the operational history for observability and audit.
- **Catalog entry / Artifact record (existing)**: The Phase 2 technical record and Phase 3 governance record, keyed by stable artifact ID — created/updated/deactivated by discovery, never duplicated. Unchanged in shape; only the trigger and source of discovery change.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a valid change is pushed to a configured source, the catalog reflects the change (new/updated/removed artifacts reconciled) automatically, with no manual command run, within a few minutes and verifiably in 100% of authenticated notifications.
- **SC-002**: 100% of change notifications that fail authentication are rejected and trigger no discovery.
- **SC-003**: Automated discovery preserves existing governance metadata in 100% of runs (zero governance fields lost or overwritten), matching the Phase 3 re-index guarantee.
- **SC-004**: With a source deliberately drifted from the catalog and no notification delivered, the next scheduled scan converges the catalog to the source's true state in 100% of cases.
- **SC-005**: Repeated or overlapping discovery runs for the same source produce zero duplicate catalog entries and no corrupted state.
- **SC-006**: Every discovery run (webhook, scheduled, or manual) produces a run record with trigger type, source, outcome, and change summary in 100% of cases.
- **SC-007**: An Admin can determine each source's last-run time, outcome, and what changed without inspecting logs or a database directly.
- **SC-008**: 100% of attempts to trigger discovery or change source configuration by a non-Admin are refused server-side.
- **SC-009**: A single invalid manifest never aborts a run; the remaining valid artifacts in that run are reconciled in 100% of cases.

## Assumptions

- **Builds on Phases 1–3**: Reuses Phase 1 auth/roles, the Phase 2 `Artifact` technical record and the `scan`/`reconcile` discovery core, and the Phase 3 governance model (records, lifecycle, audit, re-index preservation). Phase 4 changes *how discovery is triggered and where content is fetched from*, not the reconcile logic or governance rules.
- **Remote source fetch**: Discovery fetches artifact content remotely from the connected source repository on GitHub using per-source stored credentials, rather than requiring a local checkout at a fixed filesystem path (see Clarifications). This introduces a GitHub client and credential handling. Phase 2 explicitly deferred "remote fetch + webhooks" to this phase.
- **Webhook granularity**: Following "Start Simple, Design for Growth," a change notification triggers a full re-scan/reconcile of the affected source (leveraging the existing idempotent reconcile) rather than diff-based processing of only the changed files; per-file/delta optimization is deferred unless a concrete performance need arises.
- **Scheduled cadence is configurable** with a sensible default (e.g. daily); the scheduled scan is a safety net, not the primary freshness mechanism.
- **CLI retained as fallback**: The Phase 2 maintainer CLI is retained as a manual/break-glass path (local dev, seeding, emergency runs when the app or webhooks are unavailable); automated triggers plus the in-app on-demand trigger (Admin) become the primary way discovery runs. "Replace on-demand CLI indexing" means the CLI is no longer the *required* mechanism, not that it is deleted (see Clarifications). The CLI may continue to read a local checkout; remote fetch applies to the automated and in-app paths.
- **Notification authenticity**: Change notifications are verified with a per-source shared-secret HMAC signature (see Clarifications) so only genuine source events trigger discovery; the endpoint is safe to expose for inbound calls. Replay de-duplication is unnecessary this phase because reconcile is idempotent.
- **In-app observability, external notifications deferred**: Discovery run status/history is surfaced in-app to Admins. External alerting (email/Slack) on new artifacts or failures is out of scope for this phase.
- **Content boundary preserved**: Per Constitution Principles I & II, discovery continues to store only metadata and governance context — never artifact bodies — regardless of trigger or source.
- **Scope**: No semantic search (Phase 5). Multi-source support is modeled (Source entity) but the initial connected source remains the `ai-artifacts` repository.
