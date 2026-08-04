# Contract: Employee-Surface Governance Display (read-only)

Surface: employee artifact detail page (`/artifacts/<artifactId>`), governance panel + header badge.
Audience: every signed-in employee; rendering is **identical for all five roles** (Reader,
Contributor, Reviewer, Approver, Admin).

## MUST show (display only)

- **Governance state block**: lifecycle state (labelled: Draft / Experimental / In Review / Approved /
  Recommended / Deprecated / Archived), review status (Not submitted / In review), approval state
  (Not approved / Approved / Rejected), business owner, technical owner, risk level (Low / Medium /
  High / not set → "—").
- **Reviews list** (newest first): per review — type, decision (pending if unset), reviewer email,
  expiry date, expired indicator when past expiry, comments when present. Empty state: "No reviews
  recorded yet."
- **Audit history** (newest first): per entry — timestamp, actor email, action. Empty state: "No
  governance actions recorded yet."
- **Header badge** (unchanged `LifecycleBadge`, also on catalog cards): lifecycle state tag, plus
  "Approved" / "Recommended" tags when applicable.

## MUST NOT show

- `internalNotes` and `featured` (editor-back-office-only fields — clarified 2026-07-23).
- Any role-dependent variation: no extra fields, hints, links, or affordances for privileged roles.

## MUST NOT render (action controls — the reconcile's core)

- No governance-metadata form or any editable input.
- No "Submit for review", "Move to <state>", "Approve", or "Reject" control.
- No review-recording form.
- No link/button into the back-office from the governance panel.

## Data sources (read-only, unchanged)

- `getGovernance(artifactId)` → state block + badge. Artifact unknown/inactive → panel absent
  (page 404s first). No `catalog-entries` row → computed default state; viewing never creates one.
- `listReviews(artifactId)` / `listAuditLog(artifactId)` → lists (capped at 100, newest first).

## Failure/edge behavior

- Review rows with missing optional fields (comments, reviewer, expiry) render gracefully ("—"/omit).
- POSTs to the removed server actions (stale forms) are rejected by the framework before any
  application write can occur.
