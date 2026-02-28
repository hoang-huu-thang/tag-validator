# ─────────────────────────────────────────────
# Stage 1 — Dependencies (cache layer tốt nhất)
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# copy only dependency files
COPY package.json package-lock.json ./

# install ALL deps (including dev)
RUN npm ci


# ─────────────────────────────────────────────
# Stage 2 — Build app
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# reuse node_modules from deps layer
COPY --from=deps /app/node_modules ./node_modules

# copy source
COPY . .

# verify binaries (debug-safe)
RUN ls node_modules/.bin

# build
RUN npm run build


# ─────────────────────────────────────────────
# Stage 3 — Production nginx
# ─────────────────────────────────────────────
FROM nginx:alpine AS runner

# remove default config
RUN rm /etc/nginx/conf.d/default.conf

# custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 3001

CMD ["nginx", "-g", "daemon off;"]