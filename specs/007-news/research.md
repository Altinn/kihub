# Phase 0 Research: News

Resolves the Technical Context decisions for Phase 7. Every choice favors the simplest correct addition
on the existing foundation (Principle VII) that satisfies the native-content charter (Principle II) and
the two-surface split (Principle VIII). No `NEEDS CLARIFICATION` remain.

## §1 — News as a native Payload collection (not an artifact)

**Decision**: Model news as a new `news` Payload collection, owned entirely by Payload, with no relation
to `artifacts`/`catalog-entries` and no Git source. Its only relationship is `author → users`.

**Rationale**: The constitution explicitly carves native content (News/Events) out of the artifact model
(Principles I/II/III). A dedicated collection keeps the Registry boundary clean and lets News evolve its
own fields (slug, body, publish status) without polluting the artifact schema. This is exactly the
"new modules are added as new Payload collections + employee pages + admin authoring" path the
constitution prescribes.

**Alternatives considered**: Reusing/extending `Artifact` — rejected (violates III; artifacts are
Git-derived and read-only in the admin, the opposite of authored native content). A separate service/app —
rejected (news shares the same auth/roles/data layer and two-surface model; a split would duplicate them).

## §2 — Published-only visibility for employees (US3, FR-003/006)

**Decision**: Enforce "only published articles are visible to employees" at two layers:
1. **Read library** (`lib/news.ts`): every employee-facing query includes `status: { equals: 'published' }`
   (mirrors how `lib/catalog.ts` always filters `active: true`). The detail lookup is by slug AND
   `status: published`, so a draft/unknown slug resolves to nothing → the page returns 404.
2. **Collection `read` access rule**: non-editors are constrained to published — `read: ({ req }) =>
   isEditor(req.user) ? true : { status: { equals: 'published' } }` (where `isEditor` = signed-in
   Contributor+). This protects the REST/GraphQL API surface (mounted at `/payload-api` in Phase 6) so a
   Reader hitting the API directly also only ever sees published articles.

**Rationale**: Layer 1 guarantees the employee pages are correct by construction; layer 2 is defense in
depth for the API/admin path and makes the invariant hold regardless of entry point (US3 covers list,
detail, and direct access). Returning a `Where` constraint from `access.read` is Payload's idiomatic way
to scope readability by role.

**Alternatives considered**: Only filtering in the page/query (no access constraint) — rejected as weaker
(the API path would expose drafts to a signed-in Reader). Payload drafts/versions feature — rejected as
heavier than needed; a simple `status` enum (`draft`/`published`) matches the spec and is testable.

## §3 — Authoring/publishing authorization: Contributor+ (FR-002/007)

**Decision**: Gate `create`/`update`/`delete` (and therefore publishing, which is setting `status`) to
**Contributor and above** via a small inline predicate `(role) => role !== 'reader'` — the same posture
as the Phase 6 admin-panel entry gate. News is **not** wired into `@kihub/governance-core`'s permission
matrix or lifecycle FSM.

**Rationale**: The governance-core actions (`edit-metadata`, `record-review`, …) are Registry semantics;
overloading them for news would blur the module boundary (Principles III/VI are Registry-scoped). A
dedicated `role !== 'reader'` check keeps governance-core focused on the Registry and expresses exactly the
clarified rule (Contributor+ author and publish; no separate publisher role). Entry to the back-office is
already Contributor+ (Phase 6), so the collection access rule is the authoritative per-action guard behind
it, enforced server-side by Payload for both the admin UI and the API.

**Alternatives considered**: Add a `manage-news` permission to governance-core — rejected for now (expands
a Registry-scoped package for a native module with no current need; revisit if News grows finer roles). A
separate publisher role (Reviewer+ to publish) — rejected per the clarification (Contributor+ publishes).

## §4 — Slug identity for the detail URL (FR-005/013)

**Decision**: Add a `slug` text field — unique, indexed — derived from the title by a collection
`beforeValidate` hook when empty (slugify: lowercase, spaces/punctuation → hyphens, collapse repeats),
editable by an editor. The employee detail route is `/news/[slug]`. Uniqueness is enforced by the field's
`unique: true` (DB constraint) plus a friendly validation message on collision.

**Rationale**: Human-readable, stable, shareable URLs for an internal portal (the clarified choice).
Deriving from the title on create keeps authoring frictionless; keeping it editable lets editors fix
collisions or rename. `unique` + index gives correctness and fast slug lookups.

**Alternatives considered**: Numeric id in the URL — rejected in clarification (opaque, not shareable).
Deriving the slug at render time — rejected (not stable across title edits; can't guarantee uniqueness).

## §5 — Rich-text body authoring + rendering

**Decision**: The `body` is a Payload `richText` (lexical) field — the config already registers
`lexicalEditor()`. The employee detail page renders it server-side with the `RichText` component from
`@payloadcms/richtext-lexical/react` (already available in the installed package). The short `summary` is
a plain textarea used for list previews.

**Rationale**: Reuses the editor already wired into the platform and its official React renderer — no new
dependency, consistent authoring, safe server-side rendering of the stored lexical JSON. Keeping a separate
plain `summary` avoids rendering full rich text in the list and gives editors control over the preview.

**Alternatives considered**: Markdown body via the existing `Markdown.tsx` (used for artifact READMEs) —
rejected (READMEs are Git-authored markdown; native authoring is better served by the WYSIWYG lexical
editor already present). Storing rendered HTML — rejected (lexical JSON is the portable source of truth).

## §6 — Hero image: optional URL now, managed uploads deferred

**Decision**: Model the hero image as an optional `heroImageUrl` (URL text) field, rendered when present.
Do **not** introduce a Payload `upload`/Media collection or a storage adapter in this phase.

**Rationale**: The repo has no uploads/Media collection or storage (Azure Blob) configured yet; adding one
is meaningful infra beyond the News MVP. An optional URL keeps the spec's hero-image field while adding zero
new infrastructure/dependency (Principle VII). A managed Media collection backed by Azure Blob Storage is a
clean, separable later enhancement (and is where the constitution's Azure Blob target lands).

**Alternatives considered**: Full `upload` collection + Azure Blob adapter now — deferred (speculative infra
for MVP; YAGNI). Dropping hero image entirely — rejected (spec lists it; a URL is a cheap, honest seam).

## §7 — Employee pages, navigation, and data access

**Decision**: Add two server components under the existing protected employee group:
`(app)/news/page.tsx` (list) and `(app)/news/[slug]/page.tsx` (detail), reading through a new `lib/news.ts`
(`listPublishedNews()`, `getPublishedNewsBySlug(slug)`) that uses the Payload local API exactly like
`lib/catalog.ts`. List sorts newest-first by `publishDate` with featured articles surfaced (featured-first
ordering / visual distinction); an empty published set renders a friendly Designsystemet empty state. Add a
"News" link to the app header/shell so employees can reach `/news`.

**Rationale**: Reuses the established server-component + local-API read pattern and the `(app)` group's
`requireSession()` gate (so only employees read news, no new auth code). Designsystemet components keep the
employee surface on-brand (Principle VIII / Design-System mandate).

**Alternatives considered**: Client-side fetching via the REST API — rejected (server components + local API
are the established, simpler pattern and avoid exposing a query surface). A home-page news widget — deferred
per spec.

## §8 — Schema migration & types

**Decision**: Registering the collection makes Payload's dev schema-push create the `news` table
automatically (as with prior collections); generate a migration (`payload migrate:create`) for prod parity
and regenerate `payload-types.ts`. The admin import map is unaffected (News adds no custom admin
components), so no import-map regeneration is required.

**Rationale**: Matches how prior phases evolved the schema; keeps dev frictionless (push) while giving
production an explicit migration. Types stay in sync for the collection's TypeScript usage.

**Alternatives considered**: Relying on push in prod — rejected (explicit migrations are safer for prod).

## Resolved unknowns

All Technical Context items are resolved. Phase 7 adds: one `news` collection (native content, slug +
lexical body + publish status + optional hero URL + featured + tags + author→users), a `lib/news.ts` read
layer (published-only), two Designsystemet employee pages + a card + a nav link, and access/visibility/slug
tests — reusing the Entra auth, five-role model, Phase 6 back-office, lexical editor, and Payload/PostgreSQL
data layer unchanged. No new dependency, datastore, or external service.
