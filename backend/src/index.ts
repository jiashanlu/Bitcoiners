import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createConnection } from "typeorm";
import Redis from "ioredis";
import { Price } from "./models/Price";
import { PriceService } from "./services/PriceService";
import WebSocket from "ws";
import { TradingPair } from "./services/exchanges/BaseExchange";
import http from "http";

const app = express();
app.use(cors());
app.use(express.json());

let priceService: PriceService;

// Define supported trading pairs
const SUPPORTED_PAIRS: TradingPair[] = ["BTC/AED", "USDT/AED"];

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Bitcoiners Backend",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  try {
    // Parse DATABASE_URL for TypeORM connection
    const dbUrl = new URL(process.env.DATABASE_URL || "");
    const useSSL = process.env.NODE_ENV === "production";

    // Connect to PostgreSQL with detailed logging
    const connection = await createConnection({
      type: "postgres",
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port),
      username: dbUrl.username,
      password: dbUrl.password,
      database: dbUrl.pathname.substr(1), // Remove leading '/'
      entities: [Price],
      synchronize: true, // Only in development
      logging: true,
      logger: "advanced-console",
      ssl: useSSL ? { rejectUnauthorized: false } : false,
    });

    // Verify database connection
    await connection.query("SELECT NOW()");
    console.log("Database connection established successfully");

    // Parse REDIS_URL for Redis connection
    const redisUrl = new URL(process.env.REDIS_URL || "");

    // Redis connection configuration
    const redisConfig = {
      host: redisUrl.hostname,
      port: parseInt(redisUrl.port),
      password: redisUrl.password,
      tls:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    };

    // Create separate Redis connections
    const redisClient = new Redis(redisConfig); // For regular operations
    const redisSub = new Redis(redisConfig); // For subscriptions

    // Initialize price service with the client connection
    priceService = new PriceService(
      redisClient,
      connection.getRepository(Price)
    );
    await priceService.start();

    // Start HTTP server
    const PORT = parseInt(process.env.PORT || "4000");
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`HTTP server running on 0.0.0.0:${PORT}`);
    });

    // Create a separate HTTP server for WebSocket
    const WS_PORT = parseInt(process.env.WS_PORT || "3001");
    const wsServer = http.createServer();

    // Create WebSocket server on its own port
    const wss = new WebSocket.Server({
      server: wsServer,
      path: "/ws",
    });

    wsServer.listen(WS_PORT, "0.0.0.0", () => {
      console.log(`WebSocket server running on 0.0.0.0:${WS_PORT}`);
    });

    // Handle WebSocket connections
    wss.on("connection", (ws: WebSocket) => {
      console.log("Client connected to WebSocket");

      // Send initial prices for all pairs when client connects
      SUPPORTED_PAIRS.forEach(async (pair) => {
        const cacheKey = `latest_prices_${pair.replace("/", "_")}`;
        const prices = await redisClient.get(cacheKey);
        console.log(`Initial prices for ${pair}:`, prices);
        if (prices) {
          const message = JSON.stringify({
            pair,
            prices: JSON.parse(prices),
          });
          console.log(`Sending initial prices to client:`, message);
          ws.send(message);
        }
      });

      ws.on("message", async (message: string) => {
        try {
          const data = JSON.parse(message);
          console.log("Received WebSocket message:", data);

          // Handle volume updates
          if (data.type === "volume_update") {
            await priceService.updateVolume(data.volume);
          }

          // Handle pair updates
          if (data.type === "pair_update" && data.pair) {
            const cacheKey = `latest_prices_${data.pair.replace("/", "_")}`;
            const prices = await redisClient.get(cacheKey);
            console.log(`Prices for ${data.pair}:`, prices);
            if (prices) {
              const message = JSON.stringify({
                pair: data.pair,
                prices: JSON.parse(prices),
              });
              console.log(`Sending prices update to client:`, message);
              ws.send(message);
            }
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected from WebSocket");
      });
    });

    // Subscribe to Redis cache updates
    const cacheKeys = SUPPORTED_PAIRS.map(
      (pair) => `latest_prices_${pair.replace("/", "_")}`
    );
    await redisSub.subscribe(...cacheKeys);
    console.log("Subscribed to Redis cache channels:", cacheKeys);

    redisSub.on("message", (channel: string, message: string) => {
      const pair = channel
        .replace("latest_prices_", "")
        .replace("_", "/") as TradingPair;
      console.log(`Redis update for ${pair}:`, message);

      wss.clients.forEach((client: WebSocket) => {
        if (client.readyState === WebSocket.OPEN) {
          const wsMessage = JSON.stringify({
            pair,
            prices: JSON.parse(message),
          });
          console.log(`Broadcasting to client:`, wsMessage);
          client.send(wsMessage);
        }
      });
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGTERM", async () => {
  console.log("Shutting down server...");
  if (priceService) {
    await priceService.stop();
  }
  process.exit(0);
});

startServer().catch((error) => {
  console.error("Unhandled error during server startup:", error);
  process.exit(1);
});
