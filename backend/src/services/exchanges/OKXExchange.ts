import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";
import WebSocket from "ws";

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
  private readonly wsUrl: string = "wss://ws.okx.com:8443/ws/v5/public";
  private ws: WebSocket | null = null;
  private priceData: Map<string, OKXTickerData> = new Map();
  private connectionPromise: Promise<void> | null = null;

  private readonly pairMapping: Record<TradingPair, string> = {
    "BTC/AED": "BTC-AED",
    "USDT/AED": "USDT-AED",
  };

  constructor() {
    super("OKX");
    this.setupWebSocket();
  }

  private setupWebSocket() {
    if (this.ws) {
      return;
    }

    console.log("Connecting to OKX WebSocket...");
    this.ws = new WebSocket(this.wsUrl);

    this.connectionPromise = new Promise((resolve, reject) => {
      if (!this.ws) return reject(new Error("WebSocket not initialized"));

      this.ws.on("open", () => {
        console.log("OKX WebSocket connected");
        // Subscribe to all our pairs
        Object.values(this.pairMapping).forEach((pair) => {
          const subscribeMsg = {
            op: "subscribe",
            args: [
              {
                channel: "tickers",
                instId: pair,
              },
            ],
          };
          this.ws?.send(JSON.stringify(subscribeMsg));
        });
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
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    try {
      // Ensure WebSocket is connected
      if (this.connectionPromise) {
        await this.connectionPromise;
      }

      const okxPair = this.pairMapping[pair];
      const ticker = this.priceData.get(okxPair);

      if (!ticker) {
        console.log(`No ticker data available for ${pair} (${okxPair})`);
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
        pair: pair,
        lastUpdated: new Date(parseInt(ticker.ts)).toISOString(),
        change24h: change24h,
        volume24h: parseFloat(ticker.volCcy24h),
      });
    } catch (error) {
      console.error(`OKX WebSocket Error for ${pair}:`, error);
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
