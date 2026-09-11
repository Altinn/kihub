# Research: Distinct destinations for frontpage banner links

## Decision: Model "Projects" as a new flat collection, not a Registry artifact type or a filtered `/registry` view

**Rationale**: `specs/011-frontpage-redesign/contracts/site-content-globals.md` originally left the
"KI Prosjekter i BOD" destination as `/registry?type=<TBD>`, to be decided at implementation. That
TBD was never resolved and the artifact `type` enum (`packages/artifact-schema/src/schema.ts`:
skill/prompt/workflow/mcp/template/policy/playbook/agent) has no value meaning "AI project" — every
one of those types is a Registry *artifact* (Constitution Principle III), and "AI Prosjekter i
BOD" is conceptually a set of initiatives/projects, not reusable tools. Forcing it into the
artifact model would violate Principle III's "MUST NOT be forced into the artifact model" carve-out
already granted to News/Events/Learning.

**Alternatives considered**:
- *Filtered `/registry?type=project`*: rejected — would require adding a fake artifact `type` that
  isn't really a governable AI asset, muddying Registry governance (lifecycle/reviews/approvals)
  with content that doesn't need any of that.
- *Single static/global page* (like `Frontpage`/`SiteChrome`, one rich-text blob): rejected per the
  user's explicit choice — "KI Prosjekter i BOD" is plural and KITT wants to catalog multiple
  projects over time, so a list of individually editable entries is the right shape, not one page.

## Decision: Model the new collection on News, not Learning

**Rationale**: Learning's categories → subcategories → pages hierarchy exists because learning
content needs topic structure. Projects need none of that per the spec (Key Entities: just title,
summary, full description, status) — a flat list is sufficient (Constitution Principle VII, Start
Simple). News is the closest existing precedent for "flat, editor-authored, published/draft,
title+summary+richText body" content, including its read-layer conventions
(`payload.find({ where: { status: { equals: 'published' } } })`) and its "no draft leaks" access
rule pattern (`access.read` restricts non-editors to `status: published`).

**Alternatives considered**:
- *Generic reusable `Page`/`[slug]` collection*: none exists in the codebase today (confirmed by
  repo search); building one purely for this feature would be speculative complexity beyond what's
  needed (Principle VII / YAGNI) when a News-shaped collection already satisfies every requirement.

## Decision: No pagination on `/prosjekter`

**Rationale**: Spec's Scale/Scope assumption is a handful to a few dozen entries; `/news` added
pagination (013) specifically because its archive grows unbounded over years. Projects has no such
growth driver in scope. Add pagination later (mirroring `lib/news-view.ts`'s `buildPagination`) if
the list actually grows large — consistent with Start Simple, Design for Growth.

**Alternatives considered**: Copying `/news`'s `?page=` pagination now — rejected as premature for
the stated scale; the read layer (`listPublishedProjects`) is still structured as a single function
returning all published projects, so adding pagination later is a contained change, not a rewrite.

## Decision: Route path `/prosjekter`

**Rationale**: User-confirmed choice; consistent with the Norwegian, short-noun-phrase convention
already used by `/registry`'s siblings `/laering`, `/news`, `/events`.

**Alternatives considered**: `/ki-prosjekter` — more explicit but inconsistent with existing route
naming; not chosen.

## Decision: `order` field for manual sort, not `publishDate`

**Rationale**: Unlike News (inherently time-ordered articles), "AI projects in BOD" don't have a
natural publish-date ordering that matters to a reader — editors are more likely to want to curate
display order (e.g. most strategically important first), matching the `order` field pattern already
used by `LearningCategory`/`LearningSubcategory`/`LearningPage`.

**Alternatives considered**: `publishDate` + newest-first sort (News pattern) — rejected, no
requirement or user need for chronological ordering surfaced in the spec.
