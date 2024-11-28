import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createConnection } from "typeorm";
import Redis from "ioredis";
import { Price } from "./models/Price";
import { PriceService } from "./services/PriceService";
import WebSocket from "ws";

const app = express();
app.use(cors());
app.use(express.json());

let priceService: PriceService;

async function startServer() {
  try {
    // Connect to PostgreSQL with detailed logging
    const connection = await createConnection({
      type: "postgres",
      url: process.env.POSTGRES_URL,
      entities: [Price],
      synchronize: true, // Only in development
      logging: true,
      logger: "advanced-console",
    });

    // Verify database connection
    await connection.query("SELECT NOW()");
    console.log("Database connection established successfully");

    // Redis connection configuration
    const redisConfig = {
      host: process.env.REDIS_HOST || "redis",
      port: parseInt(process.env.REDIS_PORT || "6379"),
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

    // WebSocket server for client connections - bind to all interfaces
    const wss = new WebSocket.Server({
      host: "0.0.0.0",
      port: 3001,
    });
    console.log("WebSocket server listening on 0.0.0.0:3001");

    // Forward price updates to connected clients using the subscriber connection
    await redisSub.subscribe("price_updates");
    console.log("Subscribed to price_updates channel");

    redisSub.on("message", (channel: string, message: string) => {
      if (channel === "price_updates") {
        wss.clients.forEach((client: WebSocket) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      }
    });

    // Start server - bind to all interfaces
    const PORT = parseInt(process.env.PORT || "3000");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on 0.0.0.0:${PORT}`);
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
