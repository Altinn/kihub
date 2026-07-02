# Spec-Kit Handoff — KI Hub

Paste this to the agent after restarting Claude Code.

## What's been done

1. **spec-kit installed** — `specify` CLI v0.9.5 (uv). An upgrade to 0.12.4 is available;
   we deliberately stayed on 0.9.5 since the project is already scaffolded with it.
2. **`specify init . --force --integration claude`** — scaffolded `.specify/`,
   `.claude/skills/` (all speckit skills), and `CLAUDE.md`. Existing git repo + `documentation/` preserved.
3. **`specify self check`** — passed.
4. **`/speckit-constitution`** — written to `.specify/memory/constitution.md` (v1.0.0,
   ratified 2026-07-02). 7 principles derived from §16 of
   `documentation/KI Hub Architecture Proposal.md`:
   I. Git is source of truth · II. Payload owns context not content · III. Everything is an Artifact ·
   IV. Stable artifact identity · V. APM-compatible distribution · VI. Governance is the core value ·
   VII. Start simple, design for growth. Plus tech constraints (Next.js + Payload + PostgreSQL + Azure),
   security/governance (Entra ID, roles), and workflow gates.

## Decisions locked in

- **Stack**: Next.js (App Router) + Payload CMS, PostgreSQL, Azure (Entra ID, Container Apps, Blob).
- **First feature scope**: **Phase 1 — Foundation** only:
  Next.js + Payload + PostgreSQL scaffold · Azure Entra ID login · artifact manifest schema
  (`artifact.yaml`) · first example artifacts. (Not the catalog UI/discovery yet — that's Phase 2.)
- **Repo model**: two repos — `kihub` (this platform, zero real artifacts) and `ai-artifacts` (content).

## Where to continue — run these slash commands in order

The skills are now native slash commands after restart. Run:

1. `/speckit-specify` — Define the **Phase 1 Foundation** feature. Focus on *what/why*, not tech.
   Source material: `documentation/KI Hub Architecture Proposal.md` (esp. §5 manifest, §9 auth,
   §14 Phase 1, §16 principles). A `before_specify` git hook will create a feature branch.
   - Suggested one-liner to give it:
     > "Phase 1 Foundation for KI Hub: authenticated internal users (Azure Entra ID, employees only)
     >  can sign in and see an empty-but-working catalog shell; define the artifact manifest schema
     >  (artifact.yaml) and seed 2–3 example artifacts in a sibling ai-artifacts repo. No discovery
     >  automation or catalog browsing yet — just the foundation and schema."
2. `/speckit-clarify` — Answer its structured questions to de-risk the spec (interactive).
3. `/speckit-plan` — Provide the tech stack: **Next.js App Router + Payload CMS + PostgreSQL +
   Azure Entra ID auth**. It will produce the implementation plan + Constitution Check.
4. `/speckit-tasks` — Generate the ordered task list.
5. `/speckit-analyze` — Cross-artifact consistency check (spec ↔ plan ↔ tasks). Optional but recommended.
6. `/speckit-implement` — Execute the tasks to build Phase 1.

Git hooks (`before_clarify/plan/tasks/implement`) will offer to auto-commit outstanding changes —
accept them to keep clean checkpoints.

## Key files

- Constitution: `.specify/memory/constitution.md`
- Architecture proposal (source of truth for specs): `documentation/KI Hub Architecture Proposal.md`
- Spec-kit config/templates: `.specify/`
- Skills: `.claude/skills/speckit-*`
