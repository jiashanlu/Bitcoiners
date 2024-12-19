# Build stage
FROM node:18.17-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps to handle potential React version mismatches
RUN npm ci --legacy-peer-deps

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
