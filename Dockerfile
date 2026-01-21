# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

# Better signal handling + TLS certs
RUN apt-get update \
  && apt-get install -y --no-install-recommends dumb-init ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# -----------------------------
# pnpm-base: enable pnpm via corepack (build-only)
# -----------------------------
FROM base AS pnpm-base
ENV PNPM_HOME=/pnpm \
  PNPM_STORE_PATH=/pnpm/store
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
  && corepack prepare pnpm@latest --activate \
  && pnpm config set store-dir "$PNPM_STORE_PATH"

# -----------------------------
# deps: install full dependencies (for build)
# -----------------------------
FROM pnpm-base AS deps
ENV NODE_ENV=development

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm/store \
  pnpm install --no-frozen-lockfile --config.package-import-method=copy

# -----------------------------
# build: compile AdonisJS to ./build
# -----------------------------
FROM pnpm-base AS build
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# -----------------------------
# prod-deps: install production-only deps
# -----------------------------
FROM pnpm-base AS prod-deps
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm/store \
  pnpm install --prod --no-frozen-lockfile --config.package-import-method=copy

# -----------------------------
# runtime: minimal production image
# -----------------------------
FROM base AS runtime

ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3333 \
  LOG_LEVEL=info

EXPOSE 3333

# Copy only what we need to run (and optionally run migrations)
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/build ./build
COPY --chown=node:node --from=build /app/resources ./resources
COPY --chown=node:node --from=build /app/database ./database
COPY --chown=node:node package.json ace.js ./

# Runtime writable dirs (for logs/uploads)
RUN mkdir -p /app/logs /app/tmp/uploads \
  && chown -R node:node /app/logs /app/tmp

USER node
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "build/bin/server.js"]

