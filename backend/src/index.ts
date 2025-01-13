import express from "express";
import cors from "cors";
import Redis from "ioredis";
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
// CORS configuration for both HTTP and WebSocket
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.bitcoiners.ae', 'https://bitcoiners.ae']
    : true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

let priceService: PriceService;

// Define supported trading pairs
const SUPPORTED_PAIRS: TradingPair[] = ["BTC/AED"];

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
    // Get Redis URL from environment
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not set");
    }

    // Validate Redis URL format based on environment
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction && !redisUrl.startsWith("rediss://")) {
      throw new Error(
        "Invalid REDIS_URL format in production. Must start with rediss:// for TLS connection"
      );
    } else if (!isProduction && !redisUrl.startsWith("redis://")) {
      throw new Error(
        "Invalid REDIS_URL format in development. Must start with redis://"
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

    // Redis connection options based on environment
    const redisOptions = {
      tls: isProduction ? { rejectUnauthorized: false } : undefined,
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
    );
    
    // Create HTTP server
    const PORT = parseInt(process.env.PORT || "4000");
    const server = http.createServer(app);

    // Create WebSocket server
    const wss = new WebSocket.Server({
      noServer: true,
      path: "/ws",
      verifyClient: (info: { origin: string; secure: boolean; req: any }) => {
        const isProduction = process.env.NODE_ENV === 'production';
        console.log("Verifying WebSocket client connection from origin:", info.origin);
        
        if (isProduction) {
          const allowedOrigins = ['https://www.bitcoiners.ae', 'https://bitcoiners.ae'];
          if (!allowedOrigins.includes(info.origin)) {
            console.log(`Rejected WebSocket connection from unauthorized origin: ${info.origin}`);
            return false;
          }
        }
        
        return true;
      }
    });

    priceService.setWebSocketServer(wss);
    await priceService.start();

    // Handle upgrade
    server.on("upgrade", (request, socket, head) => {
      console.log("Received upgrade request for:", request.url);
      console.log("Upgrade request headers:", request.headers);
      
      if (request.url === "/ws") {
        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log("WebSocket connection established");
          wss.emit("connection", ws, request);
        });
      } else {
        console.log("Invalid WebSocket path:", request.url);
        socket.destroy();
      }
    });

    // Handle WebSocket server errors
    wss.on("error", (error) => {
      console.error("WebSocket server error:", error);
    });

    // Start the HTTP server
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`HTTP and WebSocket server running on 0.0.0.0:${PORT}`);
    });

    // Handle WebSocket connections
    wss.on("connection", (ws: WebSocket) => {
      console.log("Client connected to WebSocket");

      ws.on("message", async (message: string) => {
        try {
          const data = JSON.parse(message);
          console.log("Received WebSocket message:", data);

          // Handle volume updates
          if (data.type === "volume_update") {
            await priceService.updateVolume(data.volume);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
        }
      });

      ws.on("close", () => {
        console.log("Client disconnected from WebSocket");
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
