# Implementation Plan: Genuinely interactive subscriptions banner

**Branch**: `017-fix-subscriptions-banner` | **Date**: 2026-09-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-fix-subscriptions-banner/spec.md`

## Summary

The frontpage "Støttede KI-abonnementer i Digdir" banner (Altinn/kihub#144) renders "GitHub
Copilot" and "Claude Teams" as bordered `<span>`s styled to look like clickable buttons, but they do
nothing on click, and there is no path from the banner to instructions on requesting a subscription.
This plan makes the two tool chips genuinely interactive — a native `<details>`/`<summary>`
disclosure (the same zero-JS pattern `LearningNav.tsx` already uses) reveals a short, editor-managed
explanation on click — and adds a third, visually heavier disclosure, "Hvordan bestille tilgang?",
that reveals request-access instructions. Both visual weights reuse the existing
`.kihub-btn--secondary`/`.kihub-btn--primary` token-layer classes rather than inventing new styles.
Everything stays inside the existing `frontpage` global's `subscriptions` group — no new collection,
route, or client component — backed by one additive Postgres migration.

## Technical Context

**Language/Version**: TypeScript, Next.js 16 (App Router), React Server Components

**Primary Dependencies**: Payload CMS 3.85 (`@payloadcms/db-postgres`), existing `apps/web` app; no
new dependency

**Storage**: PostgreSQL via Payload's postgres adapter, migration-backed (`apps/web/src/migrations/`)

**Testing**: Vitest (`pnpm --filter web test`), matching existing unit-test patterns for
`site-content-defaults.ts`/`SubscriptionsBanner` and the existing `site-content-access` integration
test

**Target Platform**: Server-rendered web app, deployed on Azure Container Apps

**Project Type**: Web application — single `apps/web` Next.js + Payload app (per Constitution
"Technology & Architecture Constraints")

**Performance Goals**: N/A — static content, no new perf-sensitive path; native `<details>` adds
zero client-side JS cost

**Constraints**: Must not touch the Registry/Artifact model or the frontpage tiles (spec FR-011,
regression guard for Altinn/kihub#135/feature 016); no new client component (research.md R1); no new
navigation destination for the tool chips (spec Assumptions — in-place disclosure only)

**Scale/Scope**: A handful of tool entries (today: 2) plus one fixed request-access block; no
pagination or search needed at this scale

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Principle I (Git is Source of Truth for AI Artifacts)** — N/A. The subscriptions banner is
  frontpage chrome content, not an AI artifact. PASS.
- **Principle II (Payload Owns Enterprise Context and Native Content)** — The new `description`/
  `requestAccess` fields are native, editor-authored frontpage content, fully owned by Payload, same
  as the rest of `subscriptions` today. PASS.
- **Principle III (Every AI Asset is an Artifact)** — N/A. A "GitHub Copilot" chip is a label about a
  tool subscription, not an AI asset being modeled as/alongside a Registry `Artifact`. PASS.
- **Principle IV/V/VI (Registry-specific: identity, APM distribution, governance)** — N/A, this
  feature is entirely outside the Registry module. PASS.
- **Principle VII (Start Simple, Design for Growth)** — Extends an existing group/array on an
  existing global instead of adding a collection, route, or client component (research.md R1/R3);
  drops the now-dead `Chip.href` rather than leaving two contradictory "make it clickable"
  mechanisms in the schema. PASS.
- **Principle VIII (Two Surfaces)** — Employee-facing banner built on the Designsystemet token layer
  (`.kihub-btn--secondary`/`--primary`, `--kihub-*` tokens throughout, research.md R2); authoring
  happens in the existing Payload admin back-office (`/cms`), no back-office change needed beyond the
  new fields Payload renders automatically. PASS.
- **Product Modules enumeration** — No new module. This is a change within the existing frontpage
  chrome, not a new Product Module bullet; no constitution amendment needed.
- **Technology & Architecture Constraints #3 (token layer, no restyled/forked primitives)** — New
  CSS (`fp-subscriptions__*`) styles a native `<summary>` with existing `.kihub-btn--secondary`/
  `--primary` classes and existing `--kihub-*` tokens only; no Designsystemet primitive is restyled
  or forked (none is used here — a `<details>` disclosure is plain semantic HTML, not a
  Designsystemet component). PASS.

No violations requiring the Complexity Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/017-fix-subscriptions-banner/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   ├── subscriptions-field-contract.md   # Payload `frontpage.subscriptions` field/migration contract
│   └── subscriptions-banner-ui.md        # SubscriptionsBanner markup/interaction contract
└── tasks.md              # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

This feature extends the existing single `apps/web` application (Next.js App Router + Payload CMS
in one app) — no new project/app, route, or collection is created.

```text
apps/web/src/
├── lib/
│   └── site-content-defaults.ts   # EDIT — Chip.href → Chip.description; new RequestAccess type;
│                                   #        SubscriptionsContent.requestAccess; seeded defaults
├── lib/site-content.ts            # EDIT — mergeFrontpage: chips map description, map requestAccess
├── globals/
│   └── Frontpage.ts               # EDIT — subscriptions.chips: href field removed, description
│                                   #        added; new subscriptions.requestAccess group
├── components/
│   └── SubscriptionsBanner.tsx    # EDIT — chips + CTA rendered as <details>/<summary>, styled with
│                                   #        kihub-btn--secondary/--primary (contracts/subscriptions-banner-ui.md)
├── styles/
│   └── portal.css                 # EDIT — new `fp-subscriptions__*` disclosure rules (marker
│                                   #        hiding, chevron, panel), reusing existing tokens
├── payload-types.ts               # regenerated (`pnpm --filter web payload generate:types`)
└── migrations/
    └── <timestamp>_subscriptions_request_access.ts (+.json)  # NEW — generated via
                                                                #      `pnpm --filter web migrate:create`

apps/web/tests/unit/
├── frontpage-defaults.test.ts          # UNCHANGED — regression guard (tiles only, spec FR-011)
└── subscriptions-banner-view.test.ts   # NEW — pure-rendering/shape assertions for the new markup
                                          #       contract (e.g. no chip ever lacks a description
                                          #       field, requestAccess always present)

apps/web/tests/integration/
└── site-content-access.test.ts    # EDIT — subscriptions equality assertions already compare
                                     #        against DEFAULT_FRONTPAGE.subscriptions, so they stay
                                     #        correct once that constant is updated; extend chip/
                                     #        requestAccess assertions to cover the new fields
```

**Structure Decision**: No new top-level structure. This is a narrow, additive edit to the existing
`frontpage` global and its one consuming component, following the same "extend an existing native-
content section" pattern used when `hero.primaryCta`/`secondaryCta` were added in 011 — not the
"new module" pattern used by 014 (Learning) or 016 (Projects), because nothing here introduces a new
first-class content type.
