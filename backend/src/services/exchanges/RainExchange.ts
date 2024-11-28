import WebSocket from "ws";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

export class RainExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private lastPrice: ExchangePrice | null = null;

  constructor() {
    super("Rain");
    this.connectWebSocket();
  }

  private connectWebSocket() {
    this.ws = new WebSocket("wss://pro-api-bhr.rain.com/websocket");

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
      setTimeout(() => this.connectWebSocket(), 5000);
    });
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

  // Clean up WebSocket connection
  cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
