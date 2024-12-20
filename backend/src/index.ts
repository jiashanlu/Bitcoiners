import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createConnection, DataSource, LoggerOptions } from "typeorm";
import Redis from "ioredis";
import { Price } from "./models/Price";
import { PriceService } from "./services/PriceService";
import WebSocket from "ws";
import { TradingPair } from "./services/exchanges/BaseExchange";
import http from "http";
import dns from "dns";
import { promisify } from "util";

const resolveDns = promisify(dns.lookup);

async function resolveHostWithRetry(
  hostname: string,
  maxRetries = 10,
  delay = 5000
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `DNS resolution attempt ${attempt}/${maxRetries} for ${hostname}`
      );
      const { address } = await resolveDns(hostname);
      console.log(`Successfully resolved ${hostname} to ${address}`);
      return address;
    } catch (error) {
      console.error(`DNS resolution attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to resolve hostname ${hostname} after ${maxRetries} attempts`
        );
      }
      console.log(
        `Waiting ${delay / 1000} seconds before next DNS resolution attempt...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Failed to resolve hostname ${hostname}`);
}

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

function getRedactedUrl(url: string): string {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.username}:****@${parsedUrl.hostname}:${parsedUrl.port}${parsedUrl.pathname}`;
  } catch (error) {
    return "Invalid URL";
  }
}

async function connectWithRetry(maxRetries = 10, delay = 10000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Database connection attempt ${attempt}/${maxRetries}`);

      const databaseUrl = process.env.DATABASE_URL || "";
      if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is not set");
      }

      // Validate database URL format
      if (
        !databaseUrl.startsWith("postgres://") &&
        !databaseUrl.startsWith("postgresql://")
      ) {
        throw new Error(
          "Invalid DATABASE_URL format. Must start with postgres:// or postgresql://"
        );
      }

      console.log("Attempting to connect to:", getRedactedUrl(databaseUrl));

      const dbUrl = new URL(databaseUrl);

      // Validate required database URL components
      if (
        !dbUrl.hostname ||
        !dbUrl.username ||
        !dbUrl.password ||
        !dbUrl.pathname
      ) {
        throw new Error(
          "DATABASE_URL is missing required components (hostname, username, password, or database name)"
        );
      }
      console.log("Database connection details:", {
        host: dbUrl.hostname,
        port: dbUrl.port || "5432 (default)",
        database: dbUrl.pathname.substr(1),
        username: dbUrl.username,
        ssl: process.env.NODE_ENV === "production",
      });

      const useSSL = process.env.NODE_ENV === "production";

      // Parse port with fallback to default PostgreSQL port
      const port = dbUrl.port ? parseInt(dbUrl.port) : 5432;
      console.log(`Database port: ${port}`);

      // Connection options based on environment
      const connectionOptions = {
        name: `connection_${attempt}`, // Unique connection name for each attempt
        type: "postgres" as const,
        host: dbUrl.hostname,
        port: port,
        username: dbUrl.username,
        password: dbUrl.password,
        database: dbUrl.pathname.substr(1),
        entities: [Price],
        synchronize: process.env.NODE_ENV !== "production", // Only in development
        logging: process.env.NODE_ENV !== "production",
        ssl: useSSL ? { rejectUnauthorized: false } : false,
        connectTimeoutMS: 30000, // Increased timeout for potential DNS delays
        poolSize: 20,
        extra: {
          connectionTimeoutMillis: 30000, // Increased timeout
          keepAlive: true,
          // Add application_name for better identification in pg_stat_activity
          application_name: "bitcoiners-backend",
          // Add fallback_application_name as backup
          fallback_application_name: "bitcoiners-backend-fallback",
        },
      } as Parameters<typeof createConnection>[0];

      console.log("Connection options:", {
        ...connectionOptions,
        password: "****",
        extra: connectionOptions.extra,
      });

      // Connect to PostgreSQL
      const connection = await createConnection(connectionOptions);

      // Verify database connection and version
      const [timeResult, versionResult] = await Promise.all([
        connection.query("SELECT NOW()"),
        connection.query("SHOW server_version"),
      ]);

      console.log(
        "Connected to PostgreSQL version:",
        versionResult[0].server_version
      );
      console.log("Database connection established successfully");
      return connection;
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, {
        error: error.message,
        code: (error as any).code,
        errno: (error as any).errno,
        syscall: (error as any).syscall,
        hostname: (error as any).hostname,
      });
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts`
        );
      }
      // Add exponential backoff
      const currentDelay = Math.min(delay * Math.pow(2, attempt - 1), 30000);
      console.log(
        `Waiting ${currentDelay / 1000} seconds before next attempt...`
      );
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
    }
  }
  throw new Error("Failed to connect to database"); // Fallback error
}

async function checkServiceHealth(
  url: string,
  maxRetries = 10,
  delay = 5000
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname;
      console.log(`Health check attempt ${attempt}/${maxRetries} for ${host}`);

      const address = await resolveHostWithRetry(host, 3, 2000);
      console.log(`Successfully resolved ${host} to ${address}`);
      return true;
    } catch (error) {
      console.error(`Health check attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) return false;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return false;
}

async function startServer() {
  try {
    // Connect to database with retry logic
    const connection = await connectWithRetry();

    // Get Redis URL from environment
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    // Validate Redis URL format
    if (!redisUrl.startsWith("rediss://")) {
      throw new Error(
        "Invalid REDIS_URL format. Must start with rediss:// for TLS connection"
      );
    }

    try {
      const redisUrlObj = new URL(redisUrl);
      console.log(
        "Connecting to Redis:",
        `${redisUrlObj.protocol}//${redisUrlObj.username}:****@${redisUrlObj.hostname}:${redisUrlObj.port}`
      );
    } catch (error) {
      console.error("Failed to parse Redis URL:", error);
      throw new Error("Invalid Redis URL format");
    }

    // Redis connection options with TLS
    const redisOptions = {
      tls: { rejectUnauthorized: false },
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 1000, 30000);
        console.log(`Redis retry attempt ${times}, waiting ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 20,
      connectTimeout: 30000,
      enableReadyCheck: true,
      reconnectOnError: (err: Error) => {
        console.error("Redis connection error:", {
          message: err.message,
          stack: err.stack,
          code: (err as any).code,
        });
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };

    // Create Redis connections with URL and options
    console.log("Creating Redis client connections...");
    const redisClient = new Redis(redisUrl, redisOptions);
    const redisSub = new Redis(redisUrl, redisOptions);

    // Set up Redis error handlers with detailed logging
    redisClient.on("error", (error) => {
      console.error("Redis client error:", {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      });
    });

    redisSub.on("error", (error) => {
      console.error("Redis subscriber error:", {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      });
    });

    // Verify Redis connections
    try {
      await redisClient.ping();
      await redisSub.ping();
      console.log("Redis connections established successfully");
    } catch (error) {
      console.error("Failed to verify Redis connections:", error);
      throw error;
    }

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
