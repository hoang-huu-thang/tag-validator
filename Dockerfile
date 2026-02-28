# Stage 1: Build the React Application
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Install dependencies (utilize Docker cache for node_modules)
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy project files and build
COPY . .
RUN npm run build

# Stage 2: Serve the App using Nginx
FROM nginx:alpine

# Remove default Nginx config and copy ours for Port 3000
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/

# Copy the build artifacts from the build stage to Nginx public folder
COPY --from=build /app/dist /usr/share/nginx/html

# Expose Port 3000
EXPOSE 3001

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
