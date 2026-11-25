# syntax=docker/dockerfile:1

# Vite SPA for the AI Mathematics Tutor classroom.
# Build context: frontend/

FROM node:22-slim AS build

WORKDIR /app

# pnpm is pinned in package.json.
RUN npm install -g pnpm@12.18.0

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# Public (browser-safe) values, injected at build time. Never pass the Supabase
# service-role key, the database URL, or AI provider keys here.
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN pnpm build

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
