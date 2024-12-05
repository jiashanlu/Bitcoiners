import WebSocket from "ws";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

export class MultibankExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private lastPrice: ExchangePrice | null = null;

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
        this.ws.send(
          JSON.stringify({
            method: "subscribe",
            events: ["OB.BTC_AED"],
          })
        );
      }
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.method === "stream" && message.event === "OB.BTC_AED") {
          const firstBid = message.data.bids[0][0];
          const lastAsk = message.data.asks[message.data.asks.length - 1][0];
          const price = (firstBid + lastAsk) / 2;

          this.lastPrice = this.formatPrice({
            exchange: this.getName(),
            bid: firstBid,
            ask: lastAsk,
            price: price,
            pair: "BTC/AED",
            lastUpdated: new Date().toISOString(),
            change24h: 0, // Multibank doesn't provide this information
            volume24h: 0, // Multibank doesn't provide this information
          });
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
      setTimeout(() => this.connectWebSocket(), 5000);
    });
  }

  async fetchPrice(): Promise<ExchangePrice | null> {
    return this.lastPrice;
  }

  getDefaultFees(): { maker: number; taker: number } {
    return getDefaultFees("multibank");
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    return getFeesByVolume("multibank", volume);
  }

  // Clean up WebSocket connection
  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
