# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci --silent

# Copy sources
COPY . .

# Accept build-time API url (defaults to localhost:3000)
ARG VITE_API_URL="http://localhost:3000"
RUN export VITE_API_URL=${VITE_API_URL} && npm run build

# Production image — nginx + automatic Let's Encrypt via certbot
FROM jonasal/nginx-certbot:latest
# Local image — plain nginx (no HTTPS redirect). Swap comments to use locally:
# FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Bake the domain into the nginx config at build time
ARG DEPLOY_HOST=localhost
# Production: uses SSL config. Local: uses plain HTTP config. Swap comments to match the image above:
COPY nginx.conf /tmp/nginx.conf.template
# Local:
# COPY nginx.local.conf /tmp/nginx.conf.template
# Production output path (jonasal/nginx-certbot):
RUN sed "s/DEPLOY_HOST_PLACEHOLDER/${DEPLOY_HOST}/g" /tmp/nginx.conf.template \
       > /etc/nginx/user_conf.d/app.conf
# Local output path (nginx:alpine):
#RUN sed "s/DEPLOY_HOST_PLACEHOLDER/${DEPLOY_HOST}/g" /tmp/nginx.conf.template \
#      > /etc/nginx/conf.d/default.conf

EXPOSE 80 443
