# Build stage
FROM node:18.17-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript with detailed error output
RUN npm run build || (echo "Build failed with detailed error:" && npm run build --verbose && exit 1)

# Development stage
FROM node:18.17-alpine as development

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Install development dependencies
RUN npm install ts-node-dev --save-dev

# Production stage
FROM node:18.17-alpine as production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only with legacy peer deps
RUN npm ci --only=production --legacy-peer-deps

# Copy built files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000 3001

# Use environment variable to determine startup command
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then node dist/index.js; else npm run dev; fi"]
