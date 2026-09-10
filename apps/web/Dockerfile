# KI Hub web — production image (deployment-plan.md Phase B).
# Build from the REPO ROOT (pnpm workspace context):
#   docker build -f apps/web/Dockerfile -t kihub-web .
#
# Migrations: the image carries no Payload CLI. Committed migrations are bundled via
# `prodMigrations` in payload.config.ts and run automatically while the server boots
# (src/instrumentation.ts initializes Payload before traffic). A failed migration
# fails the boot.

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

# --- Install workspace dependencies (layer cached on manifests) ---
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/artifact-schema/package.json packages/artifact-schema/
COPY packages/discovery-core/package.json packages/discovery-core/
COPY packages/github-client/package.json packages/github-client/
COPY packages/governance-core/package.json packages/governance-core/
RUN pnpm install --frozen-lockfile

# --- Build (Next.js standalone output) ---
FROM deps AS builder
WORKDIR /repo
COPY . .
# next build imports payload.config.ts and the auth config; these dummies satisfy their
# module-scope checks — no DB is contacted (every page/route is dynamic, auth-gated) and
# nothing is baked in (the server re-reads process.env at boot; no NEXT_PUBLIC_* vars).
# AUTH_MODE=entra because the auth config refuses mock under NODE_ENV=production.
ENV PAYLOAD_SECRET=dummy-build-secret \
    DATABASE_URI=postgres://build:build@localhost:5432/build \
    AUTH_MODE=entra \
    AUTH_SECRET=dummy-build-auth-secret
RUN pnpm --filter web build

# --- Runtime ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# Standalone output is rooted at the workspace root (outputFileTracingRoot).
COPY --from=builder --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
