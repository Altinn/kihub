# Feature Specification: Phase 5 — Semantic Search

**Feature Branch**: `feat/new-architecture` (Phase 5 work; no dedicated branch)

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Phase 5 — Semantic search for KI Hub: authenticated employees can find catalog artifacts by meaning (natural-language / conceptual queries), not just exact keyword/attribute filters, via semantic (vector) search over the artifact metadata that is already indexed — manifest fields (name, description, tags, type) plus the README snapshot from Phase 2 — never the artifact's executable body (Constitution Principle I). Uses embeddings + a vector store (Qdrant) as the 'semantic search / Qdrant later' seam explicitly deferred by Constitution Principle VII, with PostgreSQL full-text as the already-shipped baseline. Semantic search is integrated into the existing Phase 2 catalog browse/search UI (built with Digdir Designsystemet) and combines with the existing type/tag/category filters. Embeddings are generated/refreshed as part of the Phase 4 discovery/reconcile flow (so a re-scan keeps the vector index in sync, and the catalog stays rebuildable from Git). Search results MUST respect the Phase 3 governance model — visibility and lifecycle/active state — so nothing surfaces that a user shouldn't see. Builds on Phases 1-4 (auth/roles, Artifact technical record + reconcile core, governance, automated discovery). Follows 'Start Simple, Design for Growth': ship the simplest thing that satisfies semantic discovery this phase; defer speculative complexity (re-ranking, hybrid fusion tuning, multi-model, etc.) unless a concrete near-term need justifies it. Continues the same phased Spec Kit flow as Phases 1-4."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find artifacts by meaning (Priority: P1)

An authenticated employee who doesn't know an artifact's exact name or tags types a natural-language or conceptual query into the catalog (e.g. "check code for security problems before shipping" or "help me write a GDPR data-processing record") and gets back a list of relevant artifacts ranked by how well they match the *meaning* of the query — including artifacts whose name and tags never contain those exact words but whose description or README describes exactly that capability. Only artifacts the employee is allowed to see are returned.

**Why this priority**: This is the headline of Phase 5 and the reason the phase exists. Until now the catalog can only be narrowed by exact `type`/`tag`/`category` filters (Phase 2); an employee who doesn't already know the right vocabulary can't find the artifact that would help them. Meaning-based search turns the catalog from a filterable list into something you can actually *ask*. It is independently verifiable (issue a conceptual query with no keyword overlap and confirm the right artifact ranks near the top) and delivers the core discovery value on its own, before filter-combination or index-sync polish.

**Independent Test**: With artifacts indexed and made searchable, issue several natural-language queries that share no literal keywords with the target artifact's name/tags, and confirm the intended artifact appears among the top results, ranked by relevance; confirm an unrelated query does not return it; confirm results contain only artifacts the querying employee is permitted to see.

**Acceptance Scenarios**:

1. **Given** a catalog of searchable artifacts, **When** an employee enters a natural-language query describing a need, **Then** the system returns a list of artifacts ordered by semantic relevance to that need.
2. **Given** an artifact whose capability matches the query's meaning but whose name/tags contain none of the query's words, **When** the employee searches for that need, **Then** that artifact still appears in the results (meaning, not just keyword, is matched).
3. **Given** a query unrelated to any catalogued artifact, **When** the employee searches, **Then** an intentional "no relevant results" state is shown rather than a long list of poor matches or an error.
4. **Given** an employee with a given visibility level, **When** they search, **Then** results include only artifacts that employee is permitted to see (governance visibility respected) and never a deactivated / removed artifact.
5. **Given** any search result, **When** an employee opens it, **Then** it links to the existing artifact detail page (search is a way *in*, it does not duplicate artifact data).
6. **Given** an unauthenticated visitor, **When** they attempt to search, **Then** they are redirected to sign-in (Phase 1 access rules still apply).

---

### User Story 2 - The searchable index stays current with the catalog (Priority: P2)

Because discovery (Phase 4) keeps the catalog synchronized with the source repository, semantic search must reflect the *same* current state without a separate manual step: when discovery creates or updates an artifact, that artifact becomes searchable (or its searchable representation is refreshed) as part of the same run; when an artifact is deactivated or removed, it stops appearing in search results. The searchable index is fully rebuildable from Git by re-running discovery, so it never becomes the canonical store of anything.

**Why this priority**: Search that silently goes stale is worse than no search — an employee would trust a result that no longer exists, or fail to find a just-added artifact. Tying the searchable representation to the existing discovery/reconcile flow (rather than a bespoke sync job) is what makes freshness automatic and keeps the "rebuildable from Git" guarantee (Principles I & VII) intact. It builds directly on the P1 search path and the Phase 4 discovery pipeline, and is independently testable by driving a discovery run and observing search reflect the change.

**Independent Test**: Run discovery so a new artifact is catalogued and confirm it becomes findable by a meaning-based query; edit that artifact's description in the source and re-run discovery and confirm search reflects the new meaning; remove/deactivate it and re-run discovery and confirm it no longer appears in search results; drop and rebuild the searchable index from a discovery run and confirm search returns to the correct state with no manual intervention.

**Acceptance Scenarios**:

1. **Given** a discovery run that creates a new artifact, **When** the run completes, **Then** that artifact is searchable by meaning without any separate manual indexing step.
2. **Given** a discovery run that updates an artifact's indexed metadata (e.g. its description or README changed), **When** the run completes, **Then** search reflects the updated meaning.
3. **Given** an artifact that is deactivated or removed by a discovery run, **When** the run completes, **Then** it no longer appears in any search results (consistent with it no longer being an active catalog entry).
4. **Given** the searchable index is empty or lost, **When** discovery is re-run, **Then** the index is rebuilt from the current catalog/Git state with no manual reconstruction, and search works again.
5. **Given** a discovery run that fails partway or skips an invalid manifest, **When** the run completes, **Then** the searchable index is not left inconsistent (invalid artifacts are simply absent; a failed run does not wipe existing searchable entries), mirroring the Phase 4 reconcile guarantees.

---

### User Story 3 - Combine meaning-based search with existing filters (Priority: P3)

An employee refines a meaning-based search using the catalog's existing facets: they search by need *and* restrict to a `type` (e.g. only skills), one or more `tags`, or a `category`, and the results are both relevant to the query and within the selected facets. When they clear the query, the familiar Phase 2 browse/filter experience is unchanged; when they clear the filters, they get pure meaning-based results. If semantic search is temporarily unavailable, the catalog remains usable — browsing and attribute filters still work and the employee is told search is degraded rather than seeing a broken page.

**Why this priority**: Combining meaning with structured filters is how an employee zeroes in ("a *skill* about accessibility review", not just anything about accessibility). It depends on both the P1 search path and the Phase 2 filter UI, and it makes the two work as one surface rather than two competing search boxes. It is the right third slice: P1 already delivers findability, and this refines precision and guarantees graceful degradation.

**Independent Test**: Issue a meaning-based query combined with a `type` filter and confirm results are both semantically relevant and limited to that type; add a `tag` filter and confirm results narrow further; clear the query and confirm the Phase 2 browse/filter behaviour is unchanged; simulate semantic search being unavailable and confirm browse/filter still works and the UI communicates the degraded state.

**Acceptance Scenarios**:

1. **Given** a meaning-based query, **When** the employee also applies a `type` filter, **Then** results are limited to that type and remain ordered by relevance to the query.
2. **Given** a meaning-based query, **When** the employee applies one or more `tag` filters (and/or a category), **Then** results satisfy all active filters *and* the query.
3. **Given** an active query and filters, **When** the employee clears the query, **Then** the listing reverts to the Phase 2 filtered browse (no relevance ranking, all matching artifacts), unchanged.
4. **Given** semantic search is unavailable, **When** the employee uses the catalog, **Then** browsing and attribute filters still function and the UI clearly indicates that meaning-based search is temporarily unavailable (no error page, no empty catalog).
5. **Given** all search and filter UI, **When** it renders, **Then** it is built with the mandated design system, consistent with the rest of the catalog.

---

### Edge Cases

- **Empty or whitespace-only query**: Submitting no query (or only whitespace) is treated as "browse", not a failed search — the Phase 2 listing (optionally filtered) is shown.
- **No relevant results**: A query with no sufficiently relevant matches shows an intentional empty state ("nothing relevant found"), not an error and not a dump of weak matches.
- **Query in another language / different phrasing**: A query phrased differently from the artifact's wording (synonyms, related concepts, or another language the embedding model supports) can still surface the artifact; exact-match is not required. Cross-lingual quality is best-effort, bounded by the embedding model.
- **Artifact with no README / sparse metadata**: An artifact with only a name and description (no README) is still searchable from the metadata it does have; missing README does not exclude it.
- **Newly discovered artifact not yet searchable**: In the brief window between an artifact being catalogued and its searchable representation being ready, it may not yet appear in meaning-based results; it still appears in normal browse/filter. It becomes searchable once the discovery run's indexing step completes.
- **Deactivated / removed artifact**: A deactivated or removed artifact never appears in search results, even if a stale searchable entry momentarily lingers (governance/active state is authoritative at query time).
- **Governance visibility**: An artifact the querying employee is not permitted to see never appears in results, regardless of how well it matches the query.
- **Semantic search backend unavailable**: If the vector store or embedding step is unreachable, search degrades gracefully (see US3) rather than breaking the catalog.
- **Very long / very short query**: An extremely long query or a single-word query both return sensible results without error (long input is handled within model limits; a single concept word still ranks by meaning).
- **Duplicate-looking results**: Each artifact appears at most once in results (search returns catalog entries by stable artifact ID, never duplicated).

## Requirements *(mandatory)*

### Functional Requirements

#### Meaning-based search (User Story 1)

- **FR-001**: The system MUST let an authenticated employee search the catalog with a free-text, natural-language query and return artifacts ranked by semantic relevance to that query's meaning (not only exact keyword/attribute matches).
- **FR-002**: Semantic relevance MUST be derived only from artifact metadata already indexed by the catalog — manifest fields (name, description, tags, type) and the README snapshot — and MUST NOT require or use the artifact's executable body (Principle I).
- **FR-003**: The system MUST return an artifact whose *meaning* matches the query even when the artifact's name and tags share no literal keywords with the query.
- **FR-004**: The system MUST show an intentional "no relevant results" state (not an error, not a list of weak matches) when no artifact is sufficiently relevant to the query.
- **FR-005**: Each result MUST identify the artifact and link to its existing detail page; search MUST NOT duplicate or become an alternative store of artifact data.
- **FR-006**: Search MUST return each matching artifact at most once, keyed by its stable artifact ID (no duplicates).
- **FR-007**: All search access MUST remain restricted to authenticated employees per the Phase 1 access rules.

#### Governance-safe results (cross-cutting, applies to all stories)

- **FR-008**: Search results MUST respect the Phase 3 governance model: only artifacts the querying employee is permitted to see (per visibility rules) MAY appear, and deactivated/removed artifacts MUST NEVER appear — regardless of relevance score.
- **FR-009**: Governance/active state MUST be authoritative at query time, so an artifact that is no longer active or visible does not surface even if a stale searchable representation exists.
- **FR-010**: Semantic search MUST NOT expose any governance or technical metadata that the equivalent Phase 2/3 catalog views would not already show to that employee.

#### Index freshness & rebuildability (User Story 2)

- **FR-011**: When discovery (webhook / scheduled / manual / CLI, per Phase 4) creates or updates an artifact, the system MUST create or refresh that artifact's searchable representation as part of the same flow, with no separate manual indexing step required.
- **FR-012**: When discovery deactivates or removes an artifact, the system MUST ensure that artifact stops appearing in search results.
- **FR-013**: The searchable index MUST be fully rebuildable from the current catalog / Git state by re-running discovery, and MUST NOT be the canonical store of any artifact data (Principles I & VII) — losing it MUST be recoverable by re-running discovery.
- **FR-014**: A failed or partial discovery run MUST NOT leave the searchable index inconsistent (e.g. it MUST NOT wipe existing searchable entries on failure), consistent with the Phase 4 reconcile guarantees; invalid/skipped manifests are simply absent from search.
- **FR-015**: Keeping the searchable representation in sync MUST reuse the existing discovery/reconcile path rather than introducing a competing indexing mechanism.

#### Filter combination & graceful degradation (User Story 3)

- **FR-016**: The system MUST let an employee combine a meaning-based query with the existing catalog filters (type, one or more tags, category), returning results that satisfy all active filters *and* are ranked by relevance to the query.
- **FR-017**: Clearing the query MUST return the catalog to the unchanged Phase 2 browse/filter behaviour (filtered listing, no relevance ranking); clearing filters MUST return pure meaning-based results.
- **FR-018**: If semantic search is temporarily unavailable, the catalog MUST remain usable — browse and attribute filters MUST still work and the UI MUST clearly communicate that meaning-based search is degraded (no broken page, no empty catalog).
- **FR-019**: All search and result UI MUST be built with the mandated design system (constitution) and integrated into the existing catalog surface rather than a separate parallel one.

#### Cross-cutting

- **FR-020**: This phase MUST build on Phases 1-4 (auth/roles, the Artifact technical record + reconcile core, governance, automated discovery) and MUST NOT change the governance model or the artifact/data-ownership boundary; it adds a discovery mechanism (search by meaning), not a new source of truth.
- **FR-021**: The searchable representation MUST store only derived representations of already-indexed metadata (never artifact bodies), preserving the constitution's content boundary.

### Key Entities *(include if feature involves data)*

- **Searchable representation (embedding + reference)**: For each active artifact, a derived vector representation of its already-indexed metadata (name, description, tags, type, README snapshot) plus the minimal reference needed to resolve back to the catalog artifact by stable artifact ID and to apply governance/visibility filters at query time. Derived data only — rebuildable from Git via discovery, never the canonical store of artifact content.
- **Search query**: A user-supplied natural-language string, optionally accompanied by the existing catalog facets (type / tags / category), evaluated against the searchable representations to produce a ranked result set.
- **Search result**: A reference to one catalog artifact (by stable artifact ID) with a relevance ordering, resolved to the artifact's existing catalog/detail data for display — filtered so only artifacts the querying employee may see are returned.
- **Catalog artifact / governance record (existing)**: The Phase 2 technical record and Phase 3 governance record, unchanged in shape. Search reads from and links to these; it neither modifies them nor stores a second copy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For a set of benchmark needs, an employee issuing a natural-language query that shares no literal keywords with the target artifact finds that artifact in the top results in at least 90% of cases.
- **SC-002**: For queries unrelated to any catalogued artifact, the system shows a "no relevant results" state (rather than weak matches or an error) in 100% of cases.
- **SC-003**: 100% of search results respect governance visibility and active state — zero deactivated, removed, or not-permitted artifacts ever appear in any user's results.
- **SC-004**: After a discovery run that adds, changes, or removes artifacts, search reflects the change with no separate manual step in 100% of runs (added artifacts become findable, changed meaning is reflected, removed artifacts disappear).
- **SC-005**: The searchable index can be fully rebuilt from Git by re-running discovery, converging to the same search behaviour, in 100% of rebuild attempts, with no artifact content stored outside its metadata representation.
- **SC-006**: An employee can combine a meaning-based query with a type and a tag filter and reach a relevant artifact's detail page in under 30 seconds.
- **SC-007**: When the semantic search backend is unavailable, the catalog stays usable (browse + filters) and communicates the degraded state in 100% of such cases — zero broken pages or empty catalogs.
- **SC-008**: A typical meaning-based query returns ranked results fast enough to feel interactive (results shown within about 2 seconds for the expected internal catalog size).
- **SC-009**: Inspecting the searchable representation reveals zero artifact executable bodies — only derived representations of already-indexed metadata (verifiable by inspection).

## Assumptions

- **Builds on Phases 1-4**: Reuses Phase 1 auth/employee-gate, the Phase 2 `Artifact` technical record and `scan`/`reconcile` discovery core, the Phase 3 governance model (visibility, lifecycle, active state), and the Phase 4 automated discovery pipeline (webhook / scheduled / manual / CLI). Phase 5 adds *how artifacts are found*, not new governance or a new source of truth.
- **First text search in the catalog**: Today the catalog supports only attribute filtering (type / tags / category) — free-text and semantic search were explicitly deferred by Phase 2 to this phase. Phase 5 introduces free-text, meaning-based search for the first time; there is no pre-existing free-text search UI to preserve, only the Phase 2 filter UI, into which search is integrated. (The constitution's "PostgreSQL full-text search first" intent is realised here as the meaning-based search seam of Principle VII; whether a plain keyword/full-text path is also offered as the degraded fallback is a design detail for planning/clarification, not a scope expansion.)
- **Content boundary preserved (Principles I & II)**: Search operates only over metadata KI Hub already indexes (manifest fields + README snapshot). The searchable representation is a *derived* mathematical representation of that metadata, rebuildable from Git — it is not the artifact body and does not make KI Hub the canonical store of artifact content.
- **Embeddings via a vector store**: Meaning-based ranking is provided by embeddings held in a vector store (the "Qdrant later" seam named in Principle VII). The specific embedding model, vector store deployment, and how they are hosted are planning decisions; the spec only requires meaning-based ranking, governance-safe results, and freshness tied to discovery.
- **Freshness via discovery**: Searchable representations are created/refreshed within the existing Phase 4 discovery/reconcile flow (create/update refreshes; deactivate/remove drops from results), so no bespoke sync job is introduced and the "rebuildable from Git" guarantee holds. A brief lag between cataloguing and searchability is acceptable (browse/filter covers the gap).
- **Governance is authoritative at query time**: Visibility and active/lifecycle state are enforced when results are returned, so a stale searchable entry can never surface something a user shouldn't see; this reuses the Phase 2/3 rules rather than duplicating them.
- **Single connected source**: As in Phase 4, the initial content source remains the `ai-artifacts` repository; multi-source search is supported by construction (results keyed by stable artifact ID) but not a focus this phase.
- **Scope kept simple (Principle VII)**: Ship the simplest thing that delivers meaning-based discovery. Explicitly out of scope this phase: learned re-ranking, tuned hybrid keyword+vector fusion, multi-model or per-language embedding selection, semantic search over artifact bodies, personalization/recommendation, and analytics on search behaviour. These are deferred unless a concrete near-term need justifies them.
