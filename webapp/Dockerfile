# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --silent

COPY . .

ARG VITE_API_URL="http://localhost:3000"
RUN export VITE_API_URL=${VITE_API_URL} && npm run build

# Production image — nginx + automatic Let's Encrypt via certbot
FROM jonasal/nginx-certbot:latest

COPY --from=builder /app/dist /usr/share/nginx/html

# Bake the domain into the nginx config at build time
ARG DEPLOY_HOST=localhost
COPY nginx.conf /tmp/nginx.conf.template
RUN sed "s/DEPLOY_HOST_PLACEHOLDER/${DEPLOY_HOST}/g" /tmp/nginx.conf.template \
      > /etc/nginx/user_conf.d/app.conf

EXPOSE 80 443
