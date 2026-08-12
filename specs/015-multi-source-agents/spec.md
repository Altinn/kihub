# Feature Specification: Multi-Source Discovery & Agent Artifacts

**Feature Branch**: `015-multi-source-agents`

**Created**: 2026-08-12

**Status**: Draft

**Input**: User description: "Multi-repo discovery and agent artifacts. Two related capabilities: (1) Multi-source discovery — the registry must support many discovery sources (git repos) safely: each artifact remembers which discovery source it came from, and reconciliation only deactivates missing artifacts belonging to the source that was just scanned, never artifacts from other sources. Existing artifacts (pre-feature, with no source recorded) must be handled safely during migration/adoption. (2) Agent artifact type — add \"agent\" as a new artifact type in the registry taxonomy: agents live under an agents/ directory in source repos with the standard artifact.yaml manifest, and may ship a sibling agent-card.json file following the A2A (Agent2Agent) v1.0 Agent Card specification (name, description, provider, version, supported interfaces, capabilities, input/output modes, skills with id/name/description/tags/examples, security schemes). Discovery fetches and validates the agent card, stores it with the artifact, and the artifact detail page renders the card's contents (skills, capabilities, interfaces, auth schemes) in the kihub style, in Norwegian UI. An invalid or missing agent card must not block registration of an otherwise valid agent artifact — the card is enrichment, with validation problems surfaced to editors. Agents get the full existing registry treatment: catalog, search, lifecycle governance, reviews, approvals, audit. Constitution taxonomy will need a version bump to include the agent type."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Scan many repositories without cross-damage (Priority: P1)

A registry administrator registers a second (and later a third, fourth, …) artifact repository
as a discovery source. Each source is scanned on its own schedule or trigger. A scan of one
repository registers, updates, and deactivates only the artifacts that belong to that repository.
Artifacts that came from other repositories — and artifacts that predate this feature and have no
recorded origin — are never touched by another source's scan.

**Why this priority**: Today a scan of one repository silently deactivates every artifact that
came from any other repository, which makes a second source destructive. Nothing else in this
feature (including agent discovery from a new repo) can be used safely until this is fixed. It is
also the organisation's stated direction: many artifact repositories in production.

**Independent Test**: Register two sources with disjoint artifact sets. Scan source A, then
source B, then A again, in any order and any number of times. After every scan, all artifacts
from both sources remain active, and removing an artifact from one repository deactivates exactly
that artifact on that source's next scan — nothing else.

**Acceptance Scenarios**:

1. **Given** source A with artifacts a1, a2 and source B with artifact b1, all registered and
   active, **When** source A is scanned, **Then** a1 and a2 are refreshed, b1 remains active and
   untouched, and the run summary reports zero deactivations.
2. **Given** a1 is deleted from repository A, **When** source A is scanned, **Then** a1 is
   deactivated (not deleted), a2 remains active, and b1 remains active.
3. **Given** artifacts registered before this feature exist with no recorded origin, **When** any
   source is scanned, **Then** those artifacts are never deactivated; if the scan finds an
   artifact with the same stable ID, that artifact adopts the scanned source as its origin from
   then on.
4. **Given** an artifact moves from repository A to repository B (same stable ID, removed from A,
   added to B), **When** B is scanned and then A is scanned, **Then** the artifact remains active
   with its governance history intact and its recorded origin is now source B.
5. **Given** the same stable ID is present in two repositories at once, **When** both are
   scanned, **Then** the artifact stays active (never deactivated by either source while at least
   one contains it) and each affected run summary flags the cross-source duplicate so editors can
   resolve it.

---

### User Story 2 - Agents are first-class registry artifacts (Priority: P2)

An artifact author adds an agent to an artifact repository: a directory under `agents/` with the
standard manifest declaring the new `agent` type. On the next scan the agent appears in the
registry exactly like every other artifact type — in the catalog with a recognisable "Agent"
type label (Norwegian UI), in full-text search, on its own detail page, and with the complete
governance treatment: lifecycle states, typed reviews, approvals, owners, risk, and audit log.

**Why this priority**: The organisation needs to govern AI agents, and the registry's whole value
is governance. The constitution already names "agent definition" as an AI asset type; this story
makes it real. It is independently valuable even without agent cards: an agent with only a
manifest is still discovered, catalogued, and governable.

**Independent Test**: Add `agents/<slug>/artifact.yaml` with `type: agent` to a registered
repository and scan. The agent appears in catalog and search, filterable by type, and an editor
can run it through a full governance cycle (submit for review, record a typed review, approve,
set lifecycle) identically to a skill.

**Acceptance Scenarios**:

1. **Given** a repository containing `agents/support-agent/artifact.yaml` with a valid manifest of
   type `agent`, **When** the source is scanned, **Then** the agent is registered, active, and
   visible in the catalog with the agent type label, and appears in search results for terms from
   its name/description.
2. **Given** a registered agent artifact, **When** an editor performs governance actions
   (lifecycle transition, typed review, approval), **Then** every action available for existing
   types is available for agents with identical rules, role gating, and audit logging.
3. **Given** a manifest of type `agent` placed outside the `agents/` directory (or any other type
   placed inside `agents/`), **When** the source is scanned, **Then** the mismatch is reported as
   an invalid manifest for that path and no artifact is registered from it.

---

### User Story 3 - Agent card enrichment on the detail page (Priority: P3)

An artifact author ships an `agent-card.json` (A2A Agent Card, v1.0) next to the agent's
manifest. Discovery fetches, validates, and stores the card with the artifact. An employee
opening the agent's detail page sees, in KI Hub's visual style and in Norwegian, what the agent
can do: its skills (name, description, tags, examples), capabilities (e.g. streaming, push
notifications), supported interfaces/endpoints, input/output modes, provider, card version, and
required authentication schemes.

**Why this priority**: The card is what makes an agent's entry useful to a reader deciding
whether to use it — but it is enrichment on top of Story 2, and an agent without a card is still
a fully governed artifact.

**Independent Test**: Add a valid `agent-card.json` next to an existing agent's manifest and
scan. The detail page now renders the card's skills, capabilities, interfaces, and auth schemes.
Replace the card with malformed JSON and scan again: the agent remains registered and active, the
stale card is no longer shown, and the run report lists the card's validation problems.

**Acceptance Scenarios**:

1. **Given** an agent directory containing a valid manifest and a valid `agent-card.json`,
   **When** the source is scanned, **Then** the card is stored with the artifact and the detail
   page renders its skills, capabilities, interfaces, input/output modes, provider, version, and
   security schemes, styled like the rest of KI Hub with Norwegian labels.
2. **Given** an agent whose `agent-card.json` is missing, **When** the source is scanned,
   **Then** the agent is registered/updated normally and the detail page simply shows no card
   section.
3. **Given** an agent whose `agent-card.json` is malformed or fails card validation, **When** the
   source is scanned, **Then** the agent itself is still registered/updated, no (or no stale)
   card is shown on the detail page, and the run report lists the card problems per path so
   editors can follow up.
4. **Given** an agent whose card was previously stored, **When** a scan finds the card file
   removed, **Then** the stored card is removed and the detail page no longer shows a card
   section.
5. **Given** an `agent-card.json` next to a non-agent artifact's manifest, **When** the source is
   scanned, **Then** the file is ignored (the artifact registers normally and no card is stored).

---

### Edge Cases

- A scan of one source fails mid-run: artifacts of that source and of all other sources remain
  exactly as they were (existing behaviour — failed runs never mass-deactivate; must remain true
  with source scoping).
- Two sources are scanned concurrently: per-source locking already prevents overlapping runs of
  the same source; runs of different sources may overlap and must not interfere, since each only
  writes artifacts belonging to (or adopted by) its own source.
- A discovery source is deleted or disabled while its artifacts are registered: the artifacts
  remain in the registry in their current state (no automatic deactivation); they can be adopted
  by another source that contains the same stable IDs.
- A legacy artifact's stable ID is never found by any scan: it simply remains as-is, never
  deactivated by the new rule — visible to admins as lacking an origin.
- Agent card is syntactically valid JSON but semantically incomplete (e.g. skills entry missing a
  name): validation reports precise per-field problems; the artifact registers; no partial card
  is rendered.
- Agent card is unreasonably large: the system enforces a sane size limit and treats an oversized
  card as a validation failure (registered artifact, reported problem) rather than an error that
  aborts the run.
- Card contains content in languages other than Norwegian: card *content* (names, descriptions,
  examples) is rendered verbatim as authored; only KI Hub's own labels and headings are
  Norwegian.

## Requirements *(mandatory)*

### Functional Requirements

**Multi-source discovery**

- **FR-001**: Every artifact registered by discovery MUST record which discovery source it came
  from, and the recorded origin MUST be kept current on every scan that finds the artifact.
- **FR-002**: Reconciliation after a scan MUST deactivate only artifacts that (a) belong to the
  scanned source and (b) were not found in that scan. Artifacts belonging to other sources, and
  artifacts with no recorded source, MUST never be deactivated by that scan.
- **FR-003**: Artifacts that exist before this feature (no recorded origin) MUST be adopted by
  the first subsequent scan that finds their stable artifact ID: the artifact's origin becomes
  the scanned source, and its governance history, identity, and state are unchanged.
- **FR-004**: An artifact whose stable ID appears in a scan of a source other than its recorded
  one MUST be treated as moved: it is updated and its origin reassigned to the scanning source,
  preserving all governance history (stable-identity principle). It MUST NOT be deactivated by
  its former source's later scans (which will simply no longer find it).
- **FR-005**: When the same stable ID is simultaneously present in more than one source, the
  artifact MUST remain active while at least one source contains it, and each scan that detects
  the situation MUST flag the cross-source duplicate in its run report.
- **FR-006**: Run reports MUST continue to record created/updated/deactivated/skipped outcomes,
  now scoped per source, so an administrator can see exactly what a given source's scan did.
- **FR-007**: The existing single-source deployment MUST upgrade without data loss and without
  any artifact changing its active state as a result of the upgrade itself.

**Agent artifact type**

- **FR-008**: The registry MUST accept `agent` as an artifact type in the manifest schema, with
  agents located under an `agents/` directory in source repositories, following the existing
  type-directory convention. The manifest schema is a versioned contract; this addition MUST
  carry a schema version bump.
- **FR-009**: Agent artifacts MUST receive the complete existing registry treatment with no
  agent-specific exceptions: catalog listing and type filtering, full-text search, detail page,
  lifecycle governance, typed reviews, approvals, owners, risk, visibility, and audit logging.
- **FR-010**: The agent type MUST be presented in the employee-facing UI with a Norwegian label
  and integrate into every place artifact types are displayed or filtered.

**Agent card enrichment**

- **FR-011**: Discovery MUST look for an optional `agent-card.json` file next to an agent's
  manifest, validate it against the A2A Agent Card structure (v1.0: name, description, provider,
  version, supported interfaces, capabilities, default input/output modes, skills with
  id/name/description/tags/examples, security schemes), and store a valid card with the
  artifact, replacing any previously stored card.
- **FR-012**: A missing or invalid agent card MUST NOT block or fail registration of an otherwise
  valid agent artifact. Validation problems MUST be reported per path in the run report so
  editors can follow up, and an invalid card MUST result in no card (and no stale card) being
  stored.
- **FR-013**: The agent detail page MUST render a stored card's contents — skills, capabilities,
  supported interfaces, input/output modes, provider, card version, and security schemes — in
  KI Hub's visual style with Norwegian labels, and MUST omit the card section entirely when no
  card is stored.
- **FR-014**: Card files found next to non-agent artifacts MUST be ignored.
- **FR-015**: The stored card MUST be treated as indexed technical metadata (like the readme
  snapshot): refreshed on every scan, never edited in KI Hub, and clearly owned by the source
  repository.

### Key Entities

- **Discovery Source**: An already-existing registration of a scannable repository. Gains the
  role of "origin" for artifacts; deleting or disabling one leaves its artifacts untouched.
- **Artifact**: The registry's generic AI-asset record. Gains (a) a recorded origin (which
  discovery source registered it; may be empty for legacy records until adopted) and (b) the new
  `agent` type value.
- **Agent Card**: A structured capability description (A2A v1.0) stored on an agent artifact:
  identity (name, description, provider, version), interfaces/endpoints, capability flags,
  input/output modes, a list of skills (id, name, description, tags, examples), and security
  schemes. Pure indexed metadata; source repository is its owner.
- **Discovery Run**: The existing append-only scan report. Now additionally conveys per-source
  scope, cross-source duplicate flags, and agent-card validation problems.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With two or more sources registered, 100 consecutive scans in arbitrary order
  produce zero deactivations of artifacts that are still present in their own repository (zero
  false deactivations, measured across the whole registry).
- **SC-002**: Removing one artifact from one repository results in exactly one deactivation, on
  that source's next scan, with all other artifacts across all sources unchanged.
- **SC-003**: Upgrading an existing single-source deployment changes the active/inactive state of
  zero artifacts, and every legacy artifact found by the next scan has an origin recorded
  afterwards.
- **SC-004**: An agent added to a registered repository is visible in catalog and search after
  one scan, and an editor can complete a full governance cycle (review → approval → lifecycle
  transition) on it without encountering any agent-specific gap.
- **SC-005**: For an agent with a valid card, every card field group named in FR-013 is visible
  on the detail page; for an agent with an invalid or missing card, the artifact is still
  registered and the run report explains the card problem in terms an editor can act on.
- **SC-006**: All existing automated checks (test suite, lint, production build) remain green,
  and existing artifacts' governance histories are bit-for-bit unaffected by the upgrade.

## Assumptions

- **No constitution amendment is required.** Constitution v3.1.0 Principle III already
  enumerates "agent definition" among AI asset types and mandates modeling it as a `type` value
  of the single Artifact concept — exactly what this feature does. The manifest schema change
  does require its own schema version bump (Technology & Architecture Constraints: the manifest
  is a versioned contract). The original feature request assumed a constitution bump; reading
  the constitution shows the taxonomy already sanctions agents.
- **Ownership-by-last-sighting resolves moves and duplicates.** Per the stable-identity
  principle, an artifact may move between repositories; the recorded origin follows the most
  recent scan that found the ID, deactivation is only ever performed by the recorded origin's
  own scan, and simultaneous presence in two sources is surfaced as a warning rather than
  guessed at.
- **The agent card is enrichment, not identity.** The `artifact.yaml` manifest remains the sole
  registration contract (id, type, owner, lifecycle); the card never creates, renames, or
  governs an artifact. Registration must therefore succeed with no card at all.
- **Card content is rendered as authored.** Skills, descriptions and examples inside a card are
  shown verbatim (whatever language the author wrote); only KI Hub's own UI labels are
  Norwegian, consistent with how manifests/readmes are treated today.
- **A2A v1.0 is the card contract.** Cards claiming other/unknown card versions are treated as
  validation failures (reported, artifact still registers) rather than best-effort parsed.
- **Existing operational model is unchanged.** Scan triggers (manual, scheduled, webhook),
  per-source credentials, and per-source locking stay as they are; this feature only makes
  concurrent multi-source operation safe and adds the agent type and card enrichment.
- **Soft deactivation semantics are unchanged.** Nothing is ever hard-deleted by discovery;
  "deactivated" artifacts return automatically when their manifest reappears.
