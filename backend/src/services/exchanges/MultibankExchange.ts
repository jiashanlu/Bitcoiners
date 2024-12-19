import WebSocket from "ws";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

export class MultibankExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private lastPrices: Map<string, ExchangePrice> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super("Multibank");
    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.ws = new WebSocket("wss://nodes.multibank.io/ws", {
      headers: {
        Origin: "https://trade.multibank.io",
        "User-Agent": "Mozilla/5.0",
      },
    });

    this.ws.on("open", () => {
      console.log("Connected to Multibank WebSocket");
      if (this.ws) {
        // Subscribe to both BTC and USDT pairs
        this.ws.send(
          JSON.stringify({
            method: "subscribe",
            events: ["OB.BTC_AED", "OB.USDT_AED"],
          })
        );
      }
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.method === "stream") {
          // Handle both BTC and USDT pairs
          if (
            message.event === "OB.BTC_AED" ||
            message.event === "OB.USDT_AED"
          ) {
            const firstBid = message.data.bids[0][0];
            const lastAsk = message.data.asks[message.data.asks.length - 1][0];
            const price = (firstBid + lastAsk) / 2;

            // Convert event name to pair (e.g., "OB.BTC_AED" -> "BTC/AED")
            const pair = message.event.replace("OB.", "").replace("_", "/");

            this.lastPrices.set(
              pair,
              this.formatPrice({
                exchange: this.getName(),
                bid: firstBid,
                ask: lastAsk,
                price: price,
                pair: pair,
                lastUpdated: new Date().toISOString(),
                change24h: 0, // Multibank doesn't provide this information
                volume24h: 0, // Multibank doesn't provide this information
              })
            );
          }
        }
      } catch (error) {
        console.error("Error processing Multibank message:", error);
      }
    });

    this.ws.on("error", (error) => {
      console.error("Multibank WebSocket error:", error);
    });

    this.ws.on("close", () => {
      console.log(
        "Multibank WebSocket connection closed, attempting to reconnect..."
      );
      this.clearPingInterval();
      setTimeout(() => this.connectWebSocket(), 5000);
    });
  }

  private setupPingInterval(): void {
    this.clearPingInterval();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
  }

  private clearPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  async fetchPrice(pair: string): Promise<ExchangePrice | null> {
    return this.lastPrices.get(pair) || null;
  }

  getDefaultFees(): { maker: number; taker: number } {
    return getDefaultFees("multibank");
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    return getFeesByVolume("multibank", volume);
  }

  cleanup(): void {
    this.clearPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
