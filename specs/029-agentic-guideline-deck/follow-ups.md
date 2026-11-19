# Follow-ups found while planning 029 (not filed, not fixed here)

## 1. Production image appears to be missing `public/` (draft issue)

**Title**: Production image does not contain `apps/web/public/` — `/brand/*` assets fall through to sign-in

**Evidence** (not yet checked in a signed-in session):
- `apps/web/Dockerfile` copies only `.next/standalone` and `.next/static` into the runtime stage. Next's
  standalone output does not include `public/` (docs: copy it yourself).
- `curl -sI https://kihub.digdir.no/brand/kitt-logo.svg` without a session returns **307** (redirect to
  sign-in, i.e. the request fell through to the app's catch-all page), while the local dev server returns
  **200 image/svg+xml** for the same path.

**Suspected impact**: the Digdir logo and the 024 hero design element (`/brand/hero-design-element.svg`)
would be missing for signed-in users in production.

**To verify first**: open `kihub.digdir.no` signed in and check whether the frontpage hero graphic and the
header logo load (network tab: `/brand/*`).

**Likely fix**: add `COPY --from=builder --chown=node:node /repo/apps/web/public ./apps/web/public` to the
runner stage of `apps/web/Dockerfile`. Note the opposite consequence to keep in mind: files in `public/`
are served to anyone, so nothing INTERN may ever be placed there (see 029 research R1).

## 2. The issue #183 zip attachment is publicly downloadable

The zip is attached to a public GitHub issue and downloaded without authentication. The deck is classified
INTERN. Ask the owner to remove the attachment (edit the issue body) and share future bundles through an
internal channel. KI Hub cannot undo the existing exposure.

## 3. Hardening idea (optional)

Replace the account-key connection string used to read the deck with a managed identity
(`DefaultAzureCredential`, `Storage Blob Data Reader` on the `kihub-protected` container only).
