# syntax=docker/dockerfile:1

# ───────────────────────────────
# Stage 1 — Install dependencies
# ───────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# force install dev deps (important for vite + tsc)
ENV NODE_ENV=development

RUN npm ci --include=dev


# ───────────────────────────────
# Stage 2 — Build app
# ───────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build production bundle
RUN npm run build


# ───────────────────────────────
# Stage 3 — Ultra-light nginx
# ───────────────────────────────
FROM nginx:alpine AS runner

# remove default config
RUN rm /etc/nginx/conf.d/default.conf

# copy optimized config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# static files only (final image very small)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]