FROM node:18

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose ports for HTTP and WebSocket
EXPOSE 3000 3001

# Start the server
CMD ["npm", "run", "dev"]
