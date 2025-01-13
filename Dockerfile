# Build stage
FROM node:18.18 as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps and force platform
RUN npm ci --legacy-peer-deps
RUN npm install @rollup/rollup-linux-x64-gnu

# Copy source code
COPY . .

# Build the app with detailed error output
RUN npm run build || (echo "Build failed with details:" && npm run build --verbose && exit 1)

# Production stage
FROM nginx:alpine

# Install envsubst
RUN apk add --no-cache gettext

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configurations
COPY nginx.prod.conf /etc/nginx/templates/default.conf.template

# Script to replace environment variables and start nginx
RUN echo '#!/bin/sh\n\n\
: ${BACKEND_URL:=http://localhost:4000}\n\
: ${BACKEND_WS_URL:=ws://localhost:3001}\n\n\
envsubst "\${BACKEND_URL} \${BACKEND_WS_URL}" < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf\n\n\
exec "$@"' > /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
