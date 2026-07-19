# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY control-plane/package.json control-plane/package.json
COPY dashboard/package.json dashboard/package.json
RUN pnpm install --frozen-lockfile --filter dashboard...

ARG NEXT_PUBLIC_CONTROL_PLANE_URL=/api
ENV NEXT_PUBLIC_CONTROL_PLANE_URL=$NEXT_PUBLIC_CONTROL_PLANE_URL

COPY dashboard dashboard
RUN pnpm --filter dashboard run build
RUN pnpm --filter dashboard --prod deploy --legacy /prod/dashboard

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@11.15.0
COPY --from=build /prod/dashboard .
EXPOSE 3000
CMD ["pnpm", "start"]