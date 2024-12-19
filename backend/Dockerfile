# Build stage
FROM node:18.17-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with verbose logging
RUN npm ci --verbose

# Copy source code
COPY . .

# Build TypeScript with verbose logging
RUN npm run build || (echo "Build failed!" && npm run build --verbose && exit 1)

# Production stage
FROM node:18.17-alpine as production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --verbose

# Copy built files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000 3001

# Start production server
CMD ["node", "dist/index.js"]
