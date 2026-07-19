# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm approve-builds --all || true
RUN pnpm install
ARG NEXT_PUBLIC_CONTROL_PLANE_URL=/api
ENV NEXT_PUBLIC_CONTROL_PLANE_URL=$NEXT_PUBLIC_CONTROL_PLANE_URL
COPY . .
RUN pnpm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/public ./public
COPY package.json next.config.ts ./
EXPOSE 3000
CMD ["pnpm", "start"]
