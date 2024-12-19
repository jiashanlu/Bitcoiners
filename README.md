# Bitcoiners.ae

A platform for comparing Bitcoin prices across UAE exchanges.

## Development

Local development uses Docker Compose:

```bash
# Start development environment
cd docker
docker-compose up --build

# Stop development environment
docker-compose down
```

This will start:

- Frontend with hot-reloading (http://localhost:5173)
- Backend with auto-restart
- Local PostgreSQL database
- Local Redis instance

## Production Deployment (Render)

The application is deployed on Render using native services:

1. Frontend (Static Site):

   - Builds and serves optimized static files
   - Handles SPA routing
   - Available at: https://bitcoiners-frontend.onrender.com

2. Backend (Node.js):

   - Runs as a native Node.js service
   - Uses TypeScript
   - Available at: https://bitcoiners-backend.onrender.com

3. Managed Services:
   - PostgreSQL database
   - Redis instance
   - Automatic SSL/TLS

### Deployment Process

1. Push changes to the Git repository
2. Render automatically deploys:
   - Builds frontend static files
   - Compiles backend TypeScript
   - Updates environment variables
   - Manages database connections

## Features

- Real-time price updates via WebSocket
- Fee calculation based on trading volume
- Best price comparison across exchanges
- Dark/Light mode support
- Mobile-responsive design

## Environment Variables

### Frontend

- `VITE_API_URL`: Backend API URL
- `VITE_WS_URL`: WebSocket URL

### Backend

- `NODE_ENV`: Environment (development/production)
- `PORT`: HTTP port (default: 4000)
- `WS_PORT`: WebSocket port (default: 3001)
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
