# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Development stage
FROM node:18-alpine as development

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Install development dependencies
RUN npm install ts-node-dev --save-dev

# Production stage
FROM node:18-alpine as production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

EXPOSE 4000

# Use environment variable to determine startup command
CMD ["sh", "-c", "if [ \"$NODE_ENV\" = \"production\" ]; then node dist/index.js; else npm run dev; fi"]
