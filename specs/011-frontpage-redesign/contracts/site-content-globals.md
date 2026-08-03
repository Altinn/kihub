# Contract: `site-chrome` & `frontpage` globals

Payload globals backing the CMS-managed chrome and frontpage content. Field shapes per
[data-model.md](../data-model.md). This contract is what the employee app, the admin UI, and the
access tests agree on; changing a field shape requires updating this file and the read lib
together (constitution: contract-first).

## Access rules (server-side, enforced in the global configs)

| Operation | Rule | Same posture as |
|---|---|---|
| `read` | `() => true` (employee app is session-gated upstream by `requireSession()`; the REST/GraphQL API surface is Payload-auth gated as with all collections) | News/Events read |
| `update` | `isEditor(req.user)` — role !== 'reader' (Contributor+) | News/Events create/update |

No `create`/`delete` for globals (Payload semantics: singletons).

## Seeded defaults (FR-012)

- Source of truth: `apps/web/src/lib/site-content-defaults.ts` (typed constants).
- Read path: `getSiteChrome()` / `getFrontpageContent()` fall back **per-section** to defaults
  when the stored global lacks that section (unset global, empty `nav`, empty `tiles`, etc.).
- Admin path: the same constants are wired as Payload `defaultValue`s so the first admin edit
  starts from the seeded content rather than blank fields.
- Default content (Norwegian): nav = Hjem `/`, Verktøy `/registry`, Nyheter `/news`,
  Arrangementer `/events`; tiles = "Katalog / Verktøy" → `/registry` (tinted) and "Oversikt /
  KI Prosjekter i BOD" → `/registry?type=` destination decided at implementation (accent);
  subscriptions = GitHub Copilot + Claude Teams chips; footer contact = "Kontakt oss:" +
  `kitt@digdir.no`, links = Om KITT, Verktøy, Prosjekter, Nyheter.

## Consumption

- Employee app reads ONLY through `lib/site-content.ts` (never `payload.findGlobal` in
  components/pages) so the default-merge is applied everywhere consistently.
- `SiteHeader`/`SiteFooter` consume `SiteChrome`; the frontpage consumes `FrontpageContent`.
- Rendering is server-side per request (no ISR/caching layer in this feature) — an editor save is
  visible on next reload (SC-002).

## Test obligations (constitution testing gate)

`tests/integration/site-content-access.test.ts` MUST cover:
1. Reader (role `reader`) cannot update either global via Payload local API (access error).
2. Contributor+ can update; the stored value is returned by the read lib on next read.
3. With no stored globals, `getSiteChrome()`/`getFrontpageContent()` return the complete seeded
   defaults (every section non-empty).
4. Per-section merge: storing only `nav` leaves footer defaults intact (and vice versa).
