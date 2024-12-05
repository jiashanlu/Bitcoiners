import WebSocket from "ws";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

export class MultibankExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private lastPrices: Map<TradingPair, ExchangePrice | null> = new Map();
  private readonly pairMapping: Record<TradingPair, string> = {
    "BTC/AED": "BTC_AED",
    "USDT/AED": "USDT_AED",
  };

  constructor() {
    super("Multibank");
    // Initialize price storage for all pairs
    this.lastPrices.set("BTC/AED", null);
    this.lastPrices.set("USDT/AED", null);
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
        // Subscribe to both pairs
        const events = Object.values(this.pairMapping).map(
          (pair) => `OB.${pair}`
        );
        this.ws.send(
          JSON.stringify({
            method: "subscribe",
            events: events,
          })
        );
      }
    });

    this.ws.on("message", (data: WebSocket.Data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.method === "stream" && message.event?.startsWith("OB.")) {
          const pairCode = message.event.replace("OB.", "");
          // Find the corresponding standard pair format
          const pair = Object.entries(this.pairMapping).find(
            ([_, value]) => value === pairCode
          )?.[0] as TradingPair;

          if (pair) {
            const firstBid = parseFloat(message.data.bids[0][0]);
            const lastAsk = parseFloat(
              message.data.asks[message.data.asks.length - 1][0]
            );
            const price = (firstBid + lastAsk) / 2;

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
      setTimeout(() => this.connectWebSocket(), 5000);
    });
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    return this.lastPrices.get(pair) || null;
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
