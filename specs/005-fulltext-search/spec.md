# Feature Specification: Phase 5 — Full-Text Search

**Feature Branch**: `feat/new-architecture` (Phase 5 work; no dedicated branch)

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Phase 5 — Search for KI Hub: authenticated employees can find catalog artifacts with a free-text keyword/phrase query, not just exact `type`/`tag`/`category` filters, via PostgreSQL full-text search over the artifact metadata already indexed in Phase 2 — the free-text fields (name, description, README snapshot); never the artifact's executable body (Constitution Principle I). This realises Constitution Principle VII's 'PostgreSQL full-text search first' step; embeddings / semantic (vector) search / Qdrant are explicitly deferred to a later phase ('semantic search / Qdrant later'). Search is integrated into the existing Phase 2 catalog browse/search UI (Digdir Designsystemet) and combines with the existing type/tag/category filters. Because search reads the live indexed catalog rows, it reflects the current catalog automatically (kept fresh by the Phase 4 discovery flow) with no separate index to maintain. Results MUST respect the Phase 3 governance model — visibility and lifecycle/active state. Builds on Phases 1-4. Follows 'Start Simple, Design for Growth': the simplest thing that satisfies keyword discovery, on the PostgreSQL the platform already runs — no new datastore or external service."

## Clarifications

### Session 2026-07-14

- Q: What search approach for this phase — semantic (embeddings/vector/Qdrant) or PostgreSQL full-text? → A: **PostgreSQL full-text first**, per Constitution Principle VII ("full-text search first"). Embeddings / semantic / vector search / Qdrant are explicitly deferred to a later phase. This phase adds no new datastore or external service — it uses the PostgreSQL the platform already runs. (This supersedes an earlier draft that had scoped Phase 5 as semantic/vector search.)
- Q: What scope of governance visibility does search enforce this phase? → A: Reuse the existing rules as-is — active-state plus the existing `visibility` field (currently all `internal`, so every authenticated employee sees every active artifact). No new per-user/per-group visibility tiers; future `visibility` values are respected automatically because search reuses the same filter.
- Q: Which artifact fields does full-text search cover? → A: The free-text fields already indexed in Phase 2 — `name`, `description`, and the `README` snapshot. `type`, `tags`, and `category` remain the existing structured filters that combine with the query (a tag word is matched by the tag filter, not by the free-text query).
- Q: Which language(s) for search — the application UI is Norwegian, but the catalogued tools/artifacts are all in English? → A: The **searched content is English** (artifact `name`/`description`/`README`); the Norwegian UI chrome is not searchable content. Use PostgreSQL's **`english`** text-search configuration (stemming + stopwords) for both document and query, for better English recall (morphological variants match). A Norwegian-phrased query will not find English content *by meaning* — that cross-lingual capability is inherent to semantic search and is deferred to the later semantic phase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find artifacts by keyword (Priority: P1)

An authenticated employee who doesn't know an artifact's exact name or tags types a keyword or phrase
describing what they want (e.g. "security review", "gdpr data processing", "accessibility") into the
catalog and gets back a list of artifacts whose name, description, or README contains those terms,
ordered by how well they match. This works even when the matching word appears only in an artifact's
description or README rather than its title.

**Why this priority**: This is the headline of Phase 5 and the reason the phase exists. Until now the
catalog can only be narrowed by exact `type`/`tag`/`category` filters (Phase 2); an employee who
doesn't already know the right tag can't search by the words they have in mind. Keyword search over
the indexed text turns the catalog from a filterable list into something you can query. It is
independently verifiable (issue a query for a term that appears only in an artifact's README and
confirm that artifact is returned and ranked) and delivers the core discovery value on its own.

**Independent Test**: With artifacts indexed, issue keyword queries that match terms in a target
artifact's name, description, and README (individually), and confirm the artifact is returned and
ranked sensibly; issue a query with no matches and confirm a "no results" state; confirm results
contain only artifacts the querying employee is permitted to see.

**Acceptance Scenarios**:

1. **Given** a catalog of indexed artifacts, **When** an employee enters a keyword/phrase query, **Then** the system returns artifacts whose indexed text (name, description, or README snapshot) matches, ordered by full-text relevance.
2. **Given** an artifact whose matching term appears only in its description or README (not its name), **When** the employee searches for that term, **Then** that artifact is still returned.
3. **Given** a query that matches no indexed artifact, **When** the employee searches, **Then** an intentional "no results" state is shown (not an error).
4. **Given** an employee with a given visibility level, **When** they search, **Then** results include only artifacts that employee is permitted to see (governance visibility respected) and never a deactivated / removed artifact.
5. **Given** any search result, **When** an employee opens it, **Then** it links to the existing artifact detail page (search is a way *in*; it does not duplicate artifact data).
6. **Given** an unauthenticated visitor, **When** they attempt to search, **Then** they are redirected to sign-in (Phase 1 access rules still apply).

---

### User Story 2 - Combine search with existing filters (Priority: P2)

An employee refines a keyword search using the catalog's existing facets: they search by keyword *and*
restrict to a `type` (e.g. only skills), one or more `tags`, or a `category`, and the results both
match the query and fall within the selected facets. When they clear the query, the familiar Phase 2
browse/filter experience is unchanged; when they clear the filters, they get pure keyword results. The
search box lives in the existing catalog surface, built with the mandated design system.

**Why this priority**: Combining keywords with structured filters is how an employee zeroes in ("a
*skill* about accessibility", not anything mentioning accessibility). It depends on the P1 search path
and the Phase 2 filter UI, and makes the two work as one surface rather than two competing controls.
P1 already delivers findability; this refines precision and integrates the experience.

**Independent Test**: Issue a keyword query combined with a `type` filter and confirm results both
match the query and are limited to that type; add a `tag` filter and confirm results narrow further;
clear the query and confirm the Phase 2 browse/filter behaviour is unchanged.

**Acceptance Scenarios**:

1. **Given** a keyword query, **When** the employee also applies a `type` filter, **Then** results are limited to that type and still ordered by query relevance.
2. **Given** a keyword query, **When** the employee applies one or more `tag` filters (and/or a category), **Then** results satisfy all active filters *and* the query.
3. **Given** an active query and filters, **When** the employee clears the query, **Then** the listing reverts to the Phase 2 filtered browse (no relevance ranking, all matching artifacts), unchanged.
4. **Given** an artifact changed by a discovery run (name/description/README edited), **When** the employee searches afterward, **Then** results reflect the current text with no separate search-index step (search reads the live catalog rows).
5. **Given** all search and result UI, **When** it renders, **Then** it is built with the mandated design system, consistent with the rest of the catalog.

---

### Edge Cases

- **Empty or whitespace-only query**: Submitting no query (or only whitespace) is treated as "browse", not a failed search — the Phase 2 listing (optionally filtered) is shown.
- **No matches**: A query matching nothing shows an intentional "no results" empty state, not an error.
- **Different word forms**: English stemming means common morphological variants of a query term match the content (e.g. singular/plural, verb forms — "reviews"/"reviewing" match "review"). Matching is over the stemmed English terms present.
- **Query language**: The catalogued content is English, so English queries match best. A Norwegian-phrased query does **not** find English content by meaning — cross-lingual/semantic matching is deferred to the later semantic phase.
- **Artifact with no README / sparse metadata**: An artifact with only a name and description is still searchable over the fields it has; a missing README does not exclude it.
- **Deactivated / removed artifact**: A deactivated or removed artifact never appears in search results (governance/active state applied at query time).
- **Governance visibility**: An artifact the querying employee is not permitted to see never appears in results, however well it matches.
- **Special characters / very long query**: Punctuation and operators in the query are handled safely (no query error, no injection); an extremely long query returns sensible results without error.
- **Duplicate-looking results**: Each artifact appears at most once (results are catalog entries keyed by stable artifact ID, never duplicated).

## Requirements *(mandatory)*

### Functional Requirements

#### Keyword search (User Story 1)

- **FR-001**: The system MUST let an authenticated employee search the catalog with a free-text keyword/phrase query and return artifacts whose indexed free-text (name, description, README snapshot) matches, ordered by full-text relevance.
- **FR-002**: Search MUST operate only over metadata already indexed by the catalog — the free-text fields `name`, `description`, and the `README` snapshot — and MUST NOT require or use the artifact's executable body (Principle I).
- **FR-003**: The system MUST return an artifact when the matching term appears in any covered field, including when it appears only in the description or README and not the name.
- **FR-004**: The system MUST show an intentional "no results" state (not an error) when no artifact matches the query.
- **FR-005**: Each result MUST identify the artifact and link to its existing detail page; search MUST NOT duplicate or become an alternative store of artifact data.
- **FR-006**: Search MUST return each matching artifact at most once, keyed by its stable artifact ID (no duplicates).
- **FR-007**: All search access MUST remain restricted to authenticated employees per the Phase 1 access rules.
- **FR-008**: The query MUST be handled safely regardless of punctuation/operators/length — no query syntax error surfaced to the user and no injection risk.

#### Governance-safe results (cross-cutting, applies to all stories)

- **FR-009**: Search results MUST respect the existing governance rules exactly as the Phase 2/3 catalog already applies them — active-state plus the existing `visibility` field (currently all `internal`, so every authenticated employee sees every active artifact) — reusing those rules rather than introducing a parallel access model or new per-user/per-group tiers this phase. Deactivated/removed artifacts MUST NEVER appear, and any future `visibility` values MUST be honored automatically.
- **FR-010**: Governance/active state MUST be authoritative at query time, so an artifact that is no longer active or not visible does not surface even if it would otherwise match.
- **FR-011**: Search MUST NOT expose any governance or technical metadata that the equivalent Phase 2/3 catalog views would not already show to that employee.

#### Filters, freshness & UI (User Story 2)

- **FR-012**: The system MUST let an employee combine a keyword query with the existing catalog filters (type, one or more tags, category), returning results that satisfy all active filters *and* match the query.
- **FR-013**: Clearing the query MUST return the catalog to the unchanged Phase 2 browse/filter behaviour; clearing filters MUST return pure keyword results.
- **FR-014**: Search MUST reflect the current catalog automatically — it reads the live indexed rows, so an artifact created/updated/deactivated by a Phase 4 discovery run is searchable/updated/absent accordingly with no separate search-index step to build or sync.
- **FR-015**: All search and result UI MUST be built with the mandated design system (constitution) and integrated into the existing catalog surface rather than a separate parallel one.

#### Cross-cutting

- **FR-016**: This phase MUST build on Phases 1-4 (auth/roles, the Artifact technical record + reconcile core, governance, automated discovery) and MUST NOT change the governance model or the artifact/data-ownership boundary.
- **FR-017**: This phase MUST NOT introduce a new datastore or external service — full-text search MUST run on the PostgreSQL the platform already uses. Embeddings / semantic (vector) search / Qdrant are explicitly deferred to a later phase (Principle VII).
- **FR-018**: Full-text matching MUST use a text-search configuration suited to the searched content, which is English (the catalogued tools/artifacts are authored in English; the Norwegian application UI is chrome, not searchable content). English stemming SHOULD improve recall so a query term matches its morphological variants in the content. Cross-lingual matching (a Norwegian-phrased query finding English content by meaning) is out of scope — an inherent semantic capability deferred to the later semantic phase.

### Key Entities *(include if feature involves data)*

- **Catalog artifact / governance record (existing)**: The Phase 2 technical record (which already holds `name`, `description`, `readme`, `tags`, `type`, `visibility`, `active`) and the Phase 3 governance record, unchanged in shape. Full-text search reads these live rows; it neither modifies them nor stores a second copy, and adds no new field.
- **Search query**: A user-supplied free-text string, optionally accompanied by the existing catalog facets (type / tags / category), evaluated against the artifacts' indexed free-text to produce a ranked result set. Transient (from URL params); not persisted.
- **Search result**: A reference to one catalog artifact (by stable artifact ID) with a relevance ordering, resolved to the artifact's existing catalog/detail data for display — filtered so only artifacts the querying employee may see are returned. Transient; not persisted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a set of benchmark artifacts, an employee searching a distinctive term that appears in the artifact's name, description, or README finds that artifact in the results in at least 95% of cases.
- **SC-002**: For queries that match nothing, the system shows a "no results" state (not an error) in 100% of cases.
- **SC-003**: 100% of search results respect governance visibility and active state — zero deactivated, removed, or not-permitted artifacts ever appear in any user's results.
- **SC-004**: After a discovery run that adds, changes, or removes artifacts, search reflects the change with no separate manual or index-build step in 100% of runs (added artifacts become findable, changed text is reflected, removed artifacts disappear).
- **SC-005**: An employee can combine a keyword query with a type and a tag filter and reach a matching artifact's detail page in under 30 seconds.
- **SC-006**: A typical keyword query returns ranked results within about 1 second for the expected internal catalog size.
- **SC-007**: Inspecting what search reads and returns reveals zero artifact executable bodies — only already-indexed metadata (verifiable by inspection).
- **SC-008**: The feature runs entirely on the existing PostgreSQL with no new external service or datastore deployed (verifiable by inspection of infrastructure).

## Assumptions

- **Builds on Phases 1-4**: Reuses Phase 1 auth/employee-gate, the Phase 2 `Artifact` technical record (which already stores the searchable free-text fields), the Phase 3 governance model (visibility, active state), and the Phase 4 automated discovery pipeline that keeps those rows current. Phase 5 adds *how artifacts are found*, not new governance, a new record, or a new source of truth.
- **First text search in the catalog**: Today the catalog supports only attribute filtering (type / tags / category) — free-text search was deferred by Phase 2 to this phase. Phase 5 introduces free-text keyword search for the first time; there is no pre-existing free-text search UI to preserve, only the Phase 2 filter UI, into which search is integrated. This directly implements Constitution Principle VII's "PostgreSQL full-text search first".
- **Semantic search deferred**: Embeddings, semantic/vector search, and Qdrant (Principle VII's "later") are explicitly out of scope this phase and become a separate later phase. Nothing in this phase precludes adding them: results are keyed by stable artifact ID and the search box is the natural insertion point.
- **Content boundary preserved (Principles I & II)**: Search reads only metadata KI Hub already indexes (name, description, README snapshot). No artifact bodies are read or stored, and no new field or collection is added.
- **Freshness by construction**: Because search queries the live `artifacts` rows, it is automatically consistent with the catalog as maintained by discovery; there is no separate search index to build, sync, or rebuild.
- **Language**: The searched content — artifact `name`/`description`/`README` — is English (all catalogued tools are authored in English); the application's Norwegian UI text is chrome, not searchable content. The PostgreSQL `english` text-search configuration is used for both document and query so English stemming/stopwords improve recall. Cross-lingual/semantic matching (Norwegian query ↔ English content by meaning) is not achievable with full-text search and is deferred with the semantic phase.
- **Fields searched**: Full-text covers the free-text fields (`name`, `description`, `readme`). `tags`/`type`/`category` remain the existing structured filters that combine with the query; folding tags into the free-text query is a possible later refinement, not required this phase.
- **Scale**: Small internal catalog (tens of artifacts), single connected source (`ai-artifacts`); no throughput or index-tuning targets — query performance is comfortable on PostgreSQL at this size without added indexing, which can be introduced later if the catalog grows.
