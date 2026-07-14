# Contract: `reviews` and `audit-log` Payload collections + role administration

## Collection: `reviews`

See [data-model.md](../data-model.md) for fields.

- **slug**: `reviews`
- **key**: relationship to `artifacts` (many per artifact) + `type` (a given reviewer may record
  more than one review of the same type over time — e.g. after `changes-requested`, a renewed
  review after the artifact is updated; the review history keeps every one, ordered by
  `reviewDate`).
- **access**: `read` = any authenticated employee; `create`/`update` = Reviewer+
  (`hasPermission(role, 'record-review')`); `delete` = `false` (immutable history, FR-019).
- **hooks**: `beforeChange` stamps `reviewer` (from `req.user`) and `reviewDate` on create;
  `afterChange` writes an `audit-log` entry (`action = 'review-recorded'`).

## `lib/governance.ts` — reviews surface

| Function | Behavior |
|----------|----------|
| `recordReview(artifactId, input, actor)` | Creates a `reviews` doc. Requires `record-review`. |
| `decideApproval(artifactId, decision, actor)` | Sets `catalog-entries.approvalState`; on `approved`, permits (but does not force) the Approved/Recommended lifecycle transition to be called next. Requires `decide-approval` (Approver+). Advisory re: review completeness (clarified) — does not block on missing/rejected typed reviews. |

## Collection: `audit-log`

Append-only; see [data-model.md](../data-model.md) for fields.

- **slug**: `audit-log`
- **access**: `read` = any authenticated employee; `create` = server-side only, written
  exclusively from `afterChange` hooks on `catalog-entries`/`reviews`/`users`
  (`overrideAccess: true` from hook code — no client `create` path); `update`/`delete` = `false`.
- **Rendering**: the artifact detail page's audit section queries `audit-log` filtered by
  `artifact = <this artifact>`, newest first.

## Role administration (FR-004)

- **Route**: `(app)/admin/roles/page.tsx` — Admin-only (redirect/`notFound()` for non-Admins,
  checked server-side via `hasPermission(role, 'manage-roles')`, not just hidden nav).
- **Behavior**: lists users (email, name, current role) with a role selector; changing a role
  updates `users.role` (subject to the `Users` access change in data-model.md) and writes an
  `audit-log` entry (`action = 'role-change'`, `targetUser` set, `artifact` absent).
- **Effect**: because `authStrategy` re-reads `users` on every request (research.md §2), the new
  role governs the target user's very next governance action — no re-login required.
