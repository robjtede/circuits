# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY index.html ./
COPY src ./src

RUN --mount=type=cache,target=/app/node_modules/.vite npm run build

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

EXPOSE 80
