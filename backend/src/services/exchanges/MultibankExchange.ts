import WebSocket from "ws";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { ExchangePrice } from "../../types/fees";

export class MultibankExchange extends AbstractExchange {
  private ws: WebSocket | null = null;
  private readonly wsUrl = "wss://www.multibank.io/api/v1/ws";
  private readonly apiKey = process.env.MULTIBANK_API_KEY;
  private readonly apiSecret = process.env.MULTIBANK_API_SECRET;
  private latestPrices: Map<TradingPair, ExchangePrice> = new Map();

  constructor() {
    super("Multibank");
  }

  async start(): Promise<void> {
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        console.log("Connected to Multibank WebSocket");
        this.subscribeToTickers();
      });

      this.ws.on("message", (data: WebSocket.RawData) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing Multibank message:", error);
        }
      });

      this.ws.on("close", () => {
        console.log("Multibank WebSocket connection closed");
        this.reconnect();
      });

      this.ws.on("error", (error: Error) => {
        console.error("Multibank WebSocket error:", error);
      });
    } catch (error) {
      console.error("Failed to connect to Multibank:", error);
      this.reconnect();
    }
  }

  private subscribeToTickers(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        method: "SUBSCRIBE",
        params: ["btcusdt@ticker", "btcaed@ticker"],
        id: 1,
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  private handleMessage(message: any): void {
    if (message.e === "ticker") {
      const bid = parseFloat(message.b);
      const ask = parseFloat(message.a);
      const symbol = message.s.toUpperCase();

      if (symbol === "BTCAED") {
        const price: ExchangePrice = {
          exchange: this.getName(),
          bid,
          ask,
          price: (bid + ask) / 2,
          pair: "BTC/AED",
          lastUpdated: new Date().toISOString(),
          change24h: parseFloat(message.p) || 0,
          volume24h: parseFloat(message.v) || 0,
          fees: this.getDefaultFees(),
          isLowestAsk: false,
          isHighestBid: false,
          isLowestSpread: false,
        };
        this.latestPrices.set("BTC/AED", price);
      }
    }
  }

  private reconnect(): void {
    setTimeout(() => {
      console.log("Attempting to reconnect to Multibank...");
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
      maker: 0.1,
      taker: 0.1,
    };
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    // Implement volume-based fee structure
    if (volume >= 100) {
      return {
        maker: 0.08,
        taker: 0.08,
      };
    }
    return this.getDefaultFees();
  }
}
