# syntax=docker/dockerfile:1

# ───────────── deps ─────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# FORCE npm install ALL deps (npm 10+ safe)
RUN npm ci --include=dev --omit=optional


# ───────────── builder ──────────
FROM node:20-alpine AS builder

WORKDIR /app

ENV PATH="/app/node_modules/.bin:$PATH"

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ───────────── runner ───────────
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]