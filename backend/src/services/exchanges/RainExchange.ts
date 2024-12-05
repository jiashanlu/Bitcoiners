import WebSocket from "ws";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { ExchangePrice } from "../../types/fees";

export class RainExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private readonly wsUrl = "wss://ws.rain.bh";
  private latestPrices: Map<TradingPair, ExchangePrice> = new Map();

  constructor() {
    super("Rain");
  }

  async start(): Promise<void> {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        console.log("Connected to Rain WebSocket");
        this.subscribeToTickers();
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing Rain message:", error);
        }
      });

      this.ws.on("close", () => {
        console.log("Rain WebSocket connection closed");
        this.reconnect();
      });

      this.ws.on("error", (error: Error) => {
        console.error("Rain WebSocket error:", error);
      });
    } catch (error) {
      console.error("Failed to connect to Rain:", error);
      this.reconnect();
    }
  }

  private subscribeToTickers(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        event: "subscribe",
        pair: ["BTC-AED", "USDT-AED"],
        channel: "ticker",
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  private handleMessage(message: any): void {
    if (message.channel === "ticker") {
      const bid = parseFloat(message.bid);
      const ask = parseFloat(message.ask);
      const pair = message.pair.replace("-", "/") as TradingPair;

      const price: ExchangePrice = {
        exchange: this.getName(),
        bid,
        ask,
        price: (bid + ask) / 2,
        pair,
        lastUpdated: new Date().toISOString(),
        change24h: parseFloat(message.change24h) || 0,
        volume24h: parseFloat(message.volume24h) || 0,
        fees: this.getDefaultFees(),
        isLowestAsk: false,
        isHighestBid: false,
        isLowestSpread: false,
      };
      this.latestPrices.set(pair, price);
    }
  }

  private reconnect(): void {
    setTimeout(() => {
      console.log("Attempting to reconnect to Rain...");
      this.start();
    }, 5000);
  }

  async stop(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    return this.latestPrices.get(pair) || null;
  }

  getDefaultFees(): { maker: number; taker: number } {
    return {
      maker: 0.2,
      taker: 0.2,
    };
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    // Implement volume-based fee structure
    if (volume >= 50) {
      return {
        maker: 0.15,
        taker: 0.15,
      };
    }
    return this.getDefaultFees();
  }
}
