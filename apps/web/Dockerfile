# Build from the repo root: docker build -f apps/web/Dockerfile .

# Stage 1: build the static site. Nothing from this stage ships except dist/.
FROM node:24-alpine AS build

WORKDIR /app
RUN corepack enable

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/nepal-utils/package.json packages/nepal-utils/
RUN pnpm install --frozen-lockfile --filter @ward-sewa/web...

COPY packages/config packages/config
COPY packages/nepal-utils/src packages/nepal-utils/src
COPY apps/web apps/web
RUN pnpm --filter @ward-sewa/web build

# Stage 2: nginx serves the files and forwards /api to the API container.
FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
