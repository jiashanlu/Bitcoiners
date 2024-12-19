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
RUN npm run build || (echo "Build failed with detailed error:" && npm run build --verbose && exit 1)

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
