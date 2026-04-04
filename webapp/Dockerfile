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

# Production image
FROM nginx:stable-alpine
RUN apk add --no-cache openssl

# Generate a self-signed TLS certificate for the deploy host IP
ARG DEPLOY_HOST=localhost
RUN mkdir -p /etc/nginx/ssl && \
    printf '[req]\ndistinguished_name=dn\nx509_extensions=v3_req\nprompt=no\n[dn]\nCN=%s\n[v3_req]\nsubjectAltName=IP:%s,DNS:localhost\n' \
      "${DEPLOY_HOST}" "${DEPLOY_HOST}" > /tmp/openssl.cnf && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/ssl/nginx.key \
      -out /etc/nginx/ssl/nginx.crt \
      -config /tmp/openssl.cnf

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
