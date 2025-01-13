import WebSocket from "ws";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

export class RainExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private lastPrice: ExchangePrice | null = null;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    super("Rain");
    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.ws = new WebSocket("wss://pro-api-bhr.rain.com/websocket", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    this.ws.on("open", () => {
      console.log("Connected to Rain WebSocket");
      if (this.ws) {
        this.ws.send(
          JSON.stringify({
            name: "productSummary subscribe",
            data: "BTC-AED",
          })
        );
      }
      this.setupPingInterval();
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.name === "productSummary") {
          const bid = parseFloat(message.data.bid_price.amount);
          const ask = parseFloat(message.data.ask_price.amount);
          const price = (bid + ask) / 2;

          this.lastPrice = this.formatPrice({
            exchange: this.getName(),
            bid: bid,
            ask: ask,
            price: price,
            pair: "BTC/AED",
            lastUpdated: new Date().toISOString(),
            change24h: 0, // Rain doesn't provide this information
            volume24h: 0, // Rain doesn't provide this information
          });
        }
      } catch (error) {
        console.error("Error processing Rain message:", error);
      }
    });

    this.ws.on("error", (error) => {
      console.error("Rain WebSocket error:", error);
    });

    this.ws.on("close", () => {
      console.log(
        "Rain WebSocket connection closed, attempting to reconnect..."
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

  async fetchPrice(): Promise<ExchangePrice | null> {
    return this.lastPrice;
  }

  getDefaultFees(): { maker: number; taker: number } {
    return getDefaultFees("rain");
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    return getFeesByVolume("rain", volume);
  }

  cleanup(): void {
    this.clearPingInterval();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
