# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

# cache-friendly: only manifests first
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY control-plane/package.json control-plane/package.json
COPY dashboard/package.json dashboard/package.json
RUN pnpm install --frozen-lockfile --filter control-plane...

COPY control-plane control-plane
RUN pnpm --filter control-plane run build
RUN pnpm --filter control-plane --prod deploy --legacy /prod/control-plane

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@11.15.0
COPY --from=build /prod/control-plane .
EXPOSE 3001
CMD ["pnpm", "start"]