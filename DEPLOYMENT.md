# Deployment Guide for bitoasis.ae

## Prerequisites

1. A cloud provider account (recommended: AWS, DigitalOcean, or similar)
2. Domain name (bitoasis.ae) with access to DNS settings
3. SSL certificate for HTTPS (can be obtained through Let's Encrypt)
4. Docker and Docker Compose installed on the production server

## Infrastructure Setup

### 1. Server Setup

- Provision a VPS (Virtual Private Server) with:
  - Minimum 2GB RAM
  - 2 vCPUs
  - Ubuntu 20.04 or later
  - 20GB SSD storage

### 2. Domain Configuration

1. Log into your domain registrar's dashboard
2. Point your domain to your server:
   - Create an A record for `bitoasis.ae` pointing to your server's IP
   - Create an A record for `www.bitoasis.ae` pointing to your server's IP
   - Create an A record for `api.bitoasis.ae` pointing to your server's IP (for backend)

### 3. SSL Certificate

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot

# Obtain certificates
sudo certbot certonly --standalone -d bitoasis.ae -d www.bitoasis.ae -d api.bitoasis.ae
```

## Application Deployment

### 1. Backend Deployment

Create a production docker-compose file:

```yaml
version: "3.8"
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DATABASE_URL=postgresql://user:password@db:5432/bitcoiners
      - REDIS_URL=redis://redis:6379
    ports:
      - "4000:4000"
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=bitcoiners
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 2. Frontend Deployment

Update vite.config.ts for production:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
  },
  server: {
    proxy: {
      "/api": {
        target: "https://api.bitoasis.ae",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: "wss://api.bitoasis.ae",
        ws: true,
      },
    },
  },
});
```

### 3. Nginx Configuration

Install and configure Nginx as reverse proxy:

```nginx
# /etc/nginx/sites-available/bitoasis.ae
server {
    listen 80;
    server_name bitoasis.ae www.bitoasis.ae;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name bitoasis.ae www.bitoasis.ae;

    ssl_certificate /etc/letsencrypt/live/bitoasis.ae/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bitoasis.ae/privkey.pem;

    root /var/www/bitoasis/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 443 ssl;
    server_name api.bitoasis.ae;

    ssl_certificate /etc/letsencrypt/live/api.bitoasis.ae/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bitoasis.ae/privkey.pem;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Deployment Steps

1. **Prepare the Production Build**

```bash
# Frontend
npm run build

# Backend
cd backend
npm run build
```

2. **Server Setup**

```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.5.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Nginx
sudo apt-get install nginx
```

3. **Deploy Application**

```bash
# Copy files to server
scp -r dist/* user@your-server:/var/www/bitoasis/dist/
scp docker-compose.yml user@your-server:/opt/bitoasis/
scp -r backend user@your-server:/opt/bitoasis/

# SSH into server and start services
ssh user@your-server
cd /opt/bitoasis
docker-compose up -d

# Configure Nginx
sudo ln -s /etc/nginx/sites-available/bitoasis.ae /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Monitoring and Maintenance

1. **Monitor Logs**

```bash
docker-compose logs -f
```

2. **Backup Database**

```bash
docker exec bitoasis_db_1 pg_dump -U user bitcoiners > backup.sql
```

3. **SSL Certificate Renewal**

```bash
sudo certbot renew
```

## Troubleshooting

1. Check application logs:

```bash
docker-compose logs backend
```

2. Check Nginx logs:

```bash
sudo tail -f /var/log/nginx/error.log
```

3. Check SSL certificate status:

```bash
sudo certbot certificates
```

Remember to:

- Keep all passwords and sensitive information in environment variables
- Regularly update dependencies and security patches
- Monitor server resources and scale as needed
- Set up automated backups for the database
- Configure proper firewall rules
- Set up monitoring and alerting
