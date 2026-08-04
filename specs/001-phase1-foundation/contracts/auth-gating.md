# Contract: Authentication, Session → User mapping, and Employee Gating

This is the interface contract for how an Entra ID identity becomes an authorized KI Hub user, and
how non-employees are rejected. Behavior is fixed here; implementation lives in `apps/web/src/auth`.

## Actors & flow

```text
Browser → /api/auth/signin (Auth.js) → Microsoft Entra ID (OIDC, single-tenant)
       → Auth.js callback validates tokens, creates session
       → employee-gate(claims): allow | deny
       → Payload custom auth strategy: upsert Users doc by entraOid, attach as current user
       → protected route renders (catalog shell) OR redirect to sign-in / 403
```

## Entra ID app registration (config contract)

- **Tenant model**: single-tenant (the organization's own tenant only).
- **Env vars** (`.env`): `AUTH_MICROSOFT_ENTRA_ID_ID` (client id), `AUTH_MICROSOFT_ENTRA_ID_SECRET`,
  `AUTH_MICROSOFT_ENTRA_ID_ISSUER` (tenant-scoped issuer URL), `AUTH_SECRET`, `DATABASE_URI`.
- **Scopes**: `openid profile email`.

## Employee gate

`employeeGate(claims) -> { allowed: boolean, reason?: string }`

**Allow** only when ALL hold:
1. The token's home tenant (`tid`) equals the configured organization tenant id.
2. The identity is a home-tenant **member**, not a guest/external (B2B) account
   (guest indicated by `idtyp`/`userType`/account-type claim; the specific claim requested is
   finalized in implementation, the rule is fixed).

**Deny** (→ no session/user established; user sees an access-denied state, not a broken page) when:
- Home tenant does not match (other-tenant identity), or
- Account is a guest/external identity, or
- Required identifying claims (`oid`, verified `email`) are missing.

This function is pure over its claims input and MUST be unit-tested with representative claim sets:
member (allow), guest (deny), foreign-tenant (deny), missing-claims (deny).

## Session → Payload user mapping

Payload `Users` collection has the local (email/password) strategy **disabled** and a custom
strategy registered:

```txt
authenticate({ headers, payload }) -> { user } | { user: null }
```

- Resolve the Auth.js session from the request.
- If no valid session → `{ user: null }` (Payload treats request as unauthenticated).
- If session present → run `employeeGate` on its claims; if denied → `{ user: null }`.
- If allowed → upsert a `Users` doc keyed by `entraOid` (= `oid` claim) with `email`, `name`,
  `tenantId`, `role: 'reader'`, `lastLoginAt = now`; return `{ user: { ...doc, collection: 'users' } }`.

## Route protection (observable behavior — maps to FR-001..FR-005)

| Condition | Expected result |
|-----------|-----------------|
| Unauthenticated request to any app page | Redirect to Entra sign-in; no app content served. |
| Valid employee session | Catalog shell renders; signed-in identity displayed; sign-out available. |
| Sign-out invoked | Session cleared; next request requires sign-in again. |
| Guest / foreign-tenant identity | Access denied; no app content; not a broken page. |
| Employee session, zero artifacts | Shell renders an intentional empty state (no error). |

## Non-goals this phase

No role assignment beyond baseline `reader`; no Entra-group→role mapping; no artifact/catalog data.
