# syntax=docker/dockerfile:1.7
# Multi-stage build for Rally (backend + frontend served as static)

# ---- deps stage ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --workspaces --include-workspace-root

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace packages/backend
RUN npm run build --workspace packages/frontend

# ---- runtime stage ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Backend production deps only
COPY package.json package-lock.json* ./
COPY packages/backend/package.json packages/backend/package.json
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --workspace packages/backend --include-workspace-root

COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/frontend/dist ./packages/backend/public

ENV PORT=3000
ENV PUBLIC_DIR=/app/packages/backend/public
EXPOSE 3000

CMD ["node", "packages/backend/dist/index.js"]
