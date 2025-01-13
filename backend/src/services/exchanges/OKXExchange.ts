import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";
import WebSocket from "ws";
import dns from "dns";
import { promisify } from "util";
import https from "https";

interface OKXTickerData {
  instId: string;
  last: string;
  lastSz: string;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
  vol24h: string;
  ts: string;
}

interface OKXWebSocketMessage {
  event?: string;
  arg?: {
    channel: string;
    instId: string;
  };
  data?: OKXTickerData[];
}

export class OKXExchange extends AbstractExchange {
  private readonly wsUrl: string = "wss://ws.okx.com/ws/v5/public";
  private ws: WebSocket | null = null;
  private priceData: Map<string, OKXTickerData> = new Map();
  private connectionPromise: Promise<void> | null = null;

  private readonly pairMapping = {
    "BTC/AED": "BTC-AED",
  };

  constructor() {
    super("OKX");
    // Start WebSocket connection asynchronously
    this.setupWebSocket().catch((error) => {
      console.error("Failed to initialize OKX WebSocket:", error);
    });
  }

  private async resolveHost(hostname: string): Promise<string> {
    const lookup = promisify(dns.lookup);
    try {
      console.log(`Resolving DNS for ${hostname}...`);
      const { address } = await lookup(hostname);
      console.log(`Successfully resolved ${hostname} to ${address}`);
      return address;
    } catch (error) {
      console.error(`DNS resolution failed for ${hostname}:`, error);
      throw error;
    }
  }

  private async setupWebSocket() {
    if (this.ws) {
      return;
    }

    const maxRetries = 5;
    const baseDelay = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `OKX WebSocket connection attempt ${attempt}/${maxRetries}`
        );

        // Parse the WebSocket URL and resolve DNS
        const wsUrl = new URL(this.wsUrl);
        await this.resolveHost(wsUrl.hostname);

        // Setup WebSocket with custom options
        this.ws = new WebSocket(this.wsUrl, {
          agent: new https.Agent({
            rejectUnauthorized: true,
            timeout: 30000,
          }),
          handshakeTimeout: 30000,
          timeout: 30000,
          headers: {
            "User-Agent": "Bitcoiners/1.0.0",
            Origin: "https://www.okx.com",
          },
        });

        this.connectionPromise = new Promise((resolve, reject) => {
          if (!this.ws) return reject(new Error("WebSocket not initialized"));

          this.ws.on("open", () => {
            console.log("OKX WebSocket connected");
            // Subscribe to BTC/AED pair
            const subscribeMsg = {
              op: "subscribe",
              args: [
                {
                  channel: "tickers",
                  instId: "BTC-AED",
                },
              ],
            };
            this.ws?.send(JSON.stringify(subscribeMsg));
            resolve();
          });

          this.ws.on("message", (data: Buffer) => {
            try {
              const message: OKXWebSocketMessage = JSON.parse(data.toString());

              if (message.event === "subscribe") {
                console.log("Successfully subscribed to channel:", message.arg);
                return;
              }

              if (message.data && message.data[0]) {
                const ticker = message.data[0];
                this.priceData.set(ticker.instId, ticker);
              }
            } catch (error) {
              console.error("Error processing WebSocket message:", error);
            }
          });

          this.ws.on("error", (error) => {
            console.error("OKX WebSocket error:", error);
            reject(error);
          });

          this.ws.on("close", () => {
            console.log("OKX WebSocket closed, reconnecting in 5s...");
            this.ws = null;
            setTimeout(() => this.setupWebSocket(), 5000);
          });
        });

        // Wait for connection or timeout
        await Promise.race([
          this.connectionPromise,
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("WebSocket connection timeout")),
              30000
            )
          ),
        ]);

        console.log("OKX WebSocket connection established successfully");
        return;
      } catch (error) {
        console.error(
          `OKX WebSocket connection attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to connect to OKX WebSocket after ${maxRetries} attempts`
          );
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
        console.log(`Waiting ${delay / 1000} seconds before next attempt...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    try {
      // Ensure WebSocket is connected
      if (this.connectionPromise) {
        await this.connectionPromise;
      }

      const okxPair = this.pairMapping["BTC/AED"];
      const ticker = this.priceData.get(okxPair);

      if (!ticker) {
        console.log(`No ticker data available for BTC/AED (${okxPair})`);
        return null;
      }

      const bid = parseFloat(ticker.bidPx);
      const ask = parseFloat(ticker.askPx);
      const price = (bid + ask) / 2;
      const open24h = parseFloat(ticker.open24h);
      const change24h = ((price - open24h) / open24h) * 100;

      return this.formatPrice({
        exchange: this.getName(),
        price: price,
        bid: bid,
        ask: ask,
        pair: "BTC/AED",
        lastUpdated: new Date(parseInt(ticker.ts)).toISOString(),
        change24h: change24h,
        volume24h: parseFloat(ticker.volCcy24h),
      });
    } catch (error) {
      console.error(`OKX WebSocket Error for BTC/AED:`, error);
      return null;
    }
  }

  getDefaultFees(): { maker: number; taker: number } {
    return getDefaultFees("okx");
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    return getFeesByVolume("okx", volume);
  }
}
