# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-alpine

WORKDIR /app
RUN corepack enable

# Manifests first, so the dependency layer is cached until a package.json or the lockfile changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/nepal-utils/package.json packages/nepal-utils/
RUN pnpm install --frozen-lockfile --prod --filter @ward-sewa/api...

COPY packages/nepal-utils/src packages/nepal-utils/src
COPY apps/api/src apps/api/src

ENV NODE_ENV=production
# The uploads volume inherits this ownership, so the non-root user can write to it.
RUN mkdir -p /data/uploads && chown node:node /data/uploads
USER node
EXPOSE 3000
CMD ["node", "apps/api/src/server.ts"]
