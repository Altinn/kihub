# Phase 0 Research: Phase 1 Foundation

All Technical Context unknowns are resolved below. Each decision records what was chosen, why,
and the alternatives considered.

## 1. Digdir Designsystemet integration (Next.js App Router)

**Decision**: Use `@digdir/designsystemet-react` for components and `@digdir/designsystemet-css`
(+ its theme CSS) for styling, `@digdir/designsystemet-types` for types, and the
`@digdir/designsystemet` CLI to generate/build the theme tokens. Import the CSS once in the root
`layout.tsx`; set `data-color-scheme` and `data-size` attributes on the `<html>` element. No
React context provider is required and components are SSR-safe, so they work in App Router server
components.

**Rationale**: This is the vendor-documented setup. It is constitutionally mandatory that all UI
uses Designsystemet; using the official React + CSS packages (rather than hand-rolling from raw
tokens) maximizes compliance and minimizes custom UI. SSR-safety means the catalog shell can be a
server component with no hydration workarounds.

**Setup specifics**:
- Install: `@digdir/designsystemet-react @digdir/designsystemet-css`, dev: `@digdir/designsystemet` (CLI), `@digdir/designsystemet-types`.
- Root layout imports: `import '@digdir/designsystemet-css'` and the theme CSS, before app styles.
- `<html data-color-scheme="light" data-size="md" data-color="…">`; body background/color applied automatically.
- Theme generated via `npx @digdir/designsystemet tokens create` / `tokens build` (a Digdir-branded default theme is sufficient for Phase 1).

**Alternatives considered**:
- Raw tokens + custom components — rejected: violates the "no forking/restyling primitives" rule and multiplies custom UI.
- A different component library (MUI, etc.) — rejected: violates the mandatory design-system constraint.

## 2. Payload CMS embedding + PostgreSQL

**Decision**: Payload CMS 3.x embedded directly in the `apps/web` Next.js app (shared server,
routes, build). Use `@payloadcms/db-postgres`'s `postgresAdapter` configured from
`process.env.DATABASE_URI`. Local Postgres via Docker Compose.

**Rationale**: Payload v3 is designed to run inside a Next.js app, which matches the constitution's
"single `apps/web` application" constraint exactly — one process, one deploy unit later. The
Postgres adapter is first-party and aligns with the mandated storage.

**Phase 1 scope**: Only the `Users` collection is active/populated (for auth mapping). No
`Artifacts`/`CatalogEntry` collections are created yet — creating empty content collections now
would add speculative complexity (Principle VII) and risks implying content lives in Payload
(Principle I). They arrive in Phase 2.

**Alternatives considered**:
- Separate standalone Payload service — rejected: contradicts the single-app constraint and adds ops overhead.
- Mongo adapter — rejected: PostgreSQL is mandated.

## 3. Azure Entra ID authentication + employees-only gating

**Decision**: Use Auth.js v5 (`next-auth`) with its Microsoft Entra ID provider to perform the
OIDC sign-in flow, then bridge the resulting session into Payload via a Payload **custom auth
strategy** that reads the verified session and upserts/maps it to a Payload `Users` document.
Register the app as **single-tenant** (organization's own tenant only). Enforce employees-only by
rejecting guest/external accounts in an `employee-gate` check.

**Rationale**: Auth.js has a maintained, first-class Entra ID provider that handles OIDC,
token validation, and session cookies — far less risk than hand-rolling OIDC inside a Payload
strategy. Payload's custom-strategy hook (an `authenticate({ headers, payload }) => { user }`
function bound to the `Users` collection with the local strategy disabled) is the documented way
to accept an externally-established identity. Single-tenant registration structurally blocks other
tenants; the explicit guest check covers B2B guests invited into the home tenant.

**Employee-gating mechanism**: A single-tenant app registration limits sign-in to the org tenant.
Guests (external identities invited into the tenant) are excluded by validating the ID token:
reject when the account is not a home-tenant member (e.g., `idtyp`/`userType` indicates guest, or
the token's home-tenant claim does not match the configured tenant). The exact optional claim to
request (`xms_*` / `idtyp`) is finalized during implementation; the rule — "home-tenant members
only, guests denied" — is fixed. This check lives in `auth/employee-gate.ts` and is unit-tested
with mocked claim sets.

**Dev mock auth seam**: To develop and validate locally without a real Entra tenant, the Auth.js
config selects its provider by an `AUTH_MODE` env var:
- `AUTH_MODE=mock` (default for local dev): a dev-only provider that signs in as a chosen persona
  (`member`, `guest`, `foreign-tenant`) and emits the **same claim shape** Entra would (`oid`,
  `email`, `name`, `tid`, `idtyp`). No external calls, no credentials required.
- `AUTH_MODE=entra`: the real Microsoft Entra ID provider (single-tenant).
Crucially, `employeeGate` and the Payload custom strategy consume the claim shape identically in
both modes, so the gating and `Users`-upsert logic are genuinely exercised by the mock. The mock
provider MUST be inert outside development (guarded so it cannot be enabled in a production build).
This does not weaken Principle "Entra ID from day one": the real provider is implemented now; the
mock is a local-dev convenience and the seam for automating Scenario A.

**Alternatives considered**:
- Payload built-in email/password auth — rejected: Entra ID is mandatory from day one.
- Custom OIDC strategy directly in Payload (no Auth.js) — rejected for Phase 1: more code, more
  security surface to get right; Auth.js is the lower-risk, well-trodden path. Revisit only if the
  Auth.js↔Payload bridge proves awkward.
- Multi-tenant registration + allow-list — rejected: unnecessary surface; single-tenant is simpler
  and safer for an employees-only internal tool.
- Requiring a real Entra tenant for all local dev — rejected: blocks development and test automation
  on external credentials; the env-switched mock seam removes that dependency while preserving the
  real path.

## 4. Manifest schema authoring + validation

**Decision**: Author the `artifact.yaml` contract as a Zod schema in `packages/artifact-schema`,
and export a generated JSON Schema (`schema/artifact.schema.json`) as the published,
language-agnostic contract. Provide a `validate()` function (parse YAML → validate) and an
on-demand CLI script (`scripts/validate-file.ts`) to validate one or more manifest files. Ship
human-readable field docs in `docs/artifact-manifest.md`.

**Rationale**: Satisfies the clarified requirement for a machine-readable schema plus docs
(FR-007). Zod gives ergonomic authoring and runtime validation inside the TS codebase; the JSON
Schema export gives a portable contract that `ai-artifacts` (and future non-TS tooling / editor
integration) can consume. On-demand validation (no CI wiring) matches the deferred-automation
assumption. Reverse-DNS `org.slug` ID is enforced via a regex constraint.

**Schema version**: Start at manifest schema version `1.0.0`; the schema is a versioned contract
(constitution) — future field changes bump it.

**Alternatives considered**:
- JSON Schema hand-authored as source of truth — rejected: less ergonomic to author/validate in TS;
  generating it from Zod keeps one source of truth.
- Documentation-only (no machine-readable schema) — rejected by clarification Q1.

## 5. Repository & workspace layout

**Decision**: `kihub` is a pnpm-workspace monorepo (`apps/web`, `packages/artifact-schema`).
`ai-artifacts` is a separate repository seeded with 2–3 examples of ≥2 types (e.g. a skill and a
prompt pack, optionally an MCP server). `kihub` contains zero real artifact content.

**Rationale**: Matches the constitution's two-repo model and package layout, and structurally
enforces Principle I / FR-017. pnpm workspaces let the seed examples (and later the discovery
service) import the shared schema package.

**Alternatives considered**:
- Single repo containing both platform and artifacts — rejected: violates platform≠content separation.
- npm/yarn workspaces — acceptable, but pnpm is the assumed default; not a load-bearing choice.

## 6. Testing approach

**Decision**: Vitest for unit and integration tests. Unit: `employee-gate` (guest vs member claim
sets), session→user mapping, and the manifest schema (valid fixtures + invalid: bad ID format,
unknown type, missing required fields). Integration: protected route returns unauthenticated/denied
for missing or non-employee identities (mocked). The live Entra ID sign-in flow is verified via the
manual quickstart scenario, not automated, this phase.

**Rationale**: Meets the constitution testing gate (schema validation + gating logic automated)
while acknowledging that automating a real Entra OIDC round-trip is disproportionate for a local
foundation phase (Principle VII).

**Alternatives considered**:
- Full Playwright e2e of the Entra sign-in — deferred: high setup cost, needs real/test tenant creds;
  revisit when deployed (later phase).
