# ───────────────── deps ─────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

# FORCE install devDependencies
ENV NODE_ENV=development
RUN npm ci --include=dev


# ───────────────── builder ──────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build


# ───────────────── nginx ────────────────
FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3001
CMD ["nginx", "-g", "daemon off;"]