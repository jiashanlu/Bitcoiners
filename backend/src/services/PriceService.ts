import { Redis } from "ioredis";
import { Repository } from "typeorm";
import WebSocket from "ws";
import { Price } from "../models/Price";
import axios from "axios";

interface ExchangePrice {
  exchange: string;
  price: number;
  bid: number;
  ask: number;
  pair: string;
  lastUpdated: string;
  change24h: number;
  volume24h: number;
}

interface BitOasisResponse {
  ticker: {
    bid: string;
    ask: string;
    daily_percentage_change: number;
  };
  volume_24h: number;
}

interface OKXResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    askPx: string;
    bidPx: string;
    last: string;
    vol24h: string;
    volCcy24h: string;
    ts: string;
    open24h: string;
  }>;
}

export class PriceService {
  private redis: Redis;
  private priceRepository: Repository<Price>;
  private wsConnections: Map<string, WebSocket> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly CACHE_KEY = "latest_prices";
  private readonly UPDATE_INTERVAL = 15000; // 15 seconds
  private readonly BITOASIS_API_URL = "https://api.bitoasis.net/v3/";
  private readonly OKX_API_URL = "https://www.okx.com/api/v5/market/tickers";
  private latestPrices: Map<string, ExchangePrice> = new Map();

  constructor(redis: Redis, priceRepository: Repository<Price>) {
    this.redis = redis;
    this.priceRepository = priceRepository;
  }

  async start() {
    await this.redis.set(this.CACHE_KEY, JSON.stringify([]));
    await this.connectExchanges();
    this.startUpdateCycle();
  }

  private async fetchBitOasisPrice(): Promise<ExchangePrice | null> {
    try {
      const response = await axios.get<BitOasisResponse>(
        `${this.BITOASIS_API_URL}exchange/ticker/BTC-AED`
      );
      const data = response.data;

      if (!data || !data.ticker.bid || !data.ticker.ask) {
        throw new Error("Invalid response from BitOasis API");
      }

      const bid = parseFloat(data.ticker.bid);
      const ask = parseFloat(data.ticker.ask);
      const price = (bid + ask) / 2;

      return {
        exchange: "BitOasis",
        price: price,
        bid: bid,
        ask: ask,
        pair: "BTC/AED",
        lastUpdated: new Date().toISOString(),
        change24h: data.ticker.daily_percentage_change || 0,
        volume24h: data.volume_24h || 0,
      };
    } catch (error) {
      console.error("BitOasis API Error:", error);
      return null;
    }
  }

  private async fetchOKXPrice(): Promise<ExchangePrice | null> {
    try {
      const response = await axios.get<OKXResponse>(this.OKX_API_URL, {
        params: {
          instType: "SPOT",
        },
      });

      if (response.data.code !== "0" || !response.data.data) {
        throw new Error("Invalid response from OKX API");
      }

      const btcAedTicker = response.data.data.find(
        (ticker) => ticker.instId === "BTC-AED"
      );

      if (!btcAedTicker) {
        throw new Error("BTC-AED pair not found in OKX response");
      }

      const bid = parseFloat(btcAedTicker.bidPx);
      const ask = parseFloat(btcAedTicker.askPx);
      const price = (bid + ask) / 2;
      const open24h = parseFloat(btcAedTicker.open24h);
      const change24h = ((price - open24h) / open24h) * 100;

      return {
        exchange: "OKX",
        price: price,
        bid: bid,
        ask: ask,
        pair: "BTC/AED",
        lastUpdated: new Date(parseInt(btcAedTicker.ts)).toISOString(),
        change24h: change24h,
        volume24h: parseFloat(btcAedTicker.volCcy24h),
      };
    } catch (error) {
      console.error("OKX API Error:", error);
      return null;
    }
  }

  private async connectExchanges() {
    // Rain WebSocket
    const rainWs = new WebSocket("wss://pro-api-bhr.rain.com/websocket");
    rainWs.on("open", () => {
      console.log("Connected to Rain WebSocket");
      rainWs.send(
        JSON.stringify({
          name: "productSummary subscribe",
          data: "BTC-AED",
        })
      );
    });

    rainWs.on("error", (error) => {
      console.error("Rain WebSocket error:", error);
    });

    this.wsConnections.set("rain", rainWs);

    // Multibank WebSocket
    const multibankWs = new WebSocket("wss://nodes.multibank.io/ws");
    multibankWs.on("open", () => {
      console.log("Connected to Multibank WebSocket");
      multibankWs.send(
        JSON.stringify({
          method: "subscribe",
          events: ["OB.BTC_AED"],
        })
      );
    });

    multibankWs.on("error", (error) => {
      console.error("Multibank WebSocket error:", error);
    });

    this.wsConnections.set("multibank", multibankWs);

    // Setup message handlers
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    const rainWs = this.wsConnections.get("rain");
    if (rainWs) {
      rainWs.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.name === "productSummary") {
            const price: ExchangePrice = {
              exchange: "Rain",
              bid: parseFloat(message.data.bid_price.amount),
              ask: parseFloat(message.data.ask_price.amount),
              price:
                (parseFloat(message.data.bid_price.amount) +
                  parseFloat(message.data.ask_price.amount)) /
                2,
              pair: "BTC/AED",
              lastUpdated: new Date().toISOString(),
              change24h: 0,
              volume24h: 0,
            };
            this.latestPrices.set("Rain", price);
          }
        } catch (error) {
          console.error("Error processing Rain message:", error);
        }
      });
    }

    const multibankWs = this.wsConnections.get("multibank");
    if (multibankWs) {
      multibankWs.on("message", (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.method === "stream" && message.event === "OB.BTC_AED") {
            const firstBid = message.data.bids[0][0];
            const lastAsk = message.data.asks[message.data.asks.length - 1][0];
            const price: ExchangePrice = {
              exchange: "Multibank",
              bid: firstBid,
              ask: lastAsk,
              price: (firstBid + lastAsk) / 2,
              pair: "BTC/AED",
              lastUpdated: new Date().toISOString(),
              change24h: 0,
              volume24h: 0,
            };
            this.latestPrices.set("Multibank", price);
          }
        } catch (error) {
          console.error("Error processing Multibank message:", error);
        }
      });
    }
  }

  private async savePriceToDatabase(priceData: ExchangePrice) {
    try {
      const price = new Price();
      const now = new Date();

      // Convert numbers to strings for decimal columns
      price.exchange = priceData.exchange;
      price.bid = priceData.bid;
      price.ask = priceData.ask;
      price.price = priceData.price;
      price.pair = priceData.pair;
      price.timestamp = now;
      price.createdAt = now;

      const savedPrice = await this.priceRepository.save(price);
      console.log(
        `Saved ${priceData.exchange} price to database with ID: ${savedPrice.id}`
      );
      return true;
    } catch (error) {
      console.error(
        `Error saving ${priceData.exchange} price to database:`,
        error
      );
      return false;
    }
  }

  private async updatePrices() {
    try {
      // Get BitOasis price
      const bitOasisPrice = await this.fetchBitOasisPrice();
      if (bitOasisPrice) {
        this.latestPrices.set("BitOasis", bitOasisPrice);
      }

      // Get OKX price
      const okxPrice = await this.fetchOKXPrice();
      if (okxPrice) {
        this.latestPrices.set("OKX", okxPrice);
      }

      // Convert Map to array and sort
      const prices = Array.from(this.latestPrices.values()).sort((a, b) =>
        a.exchange.localeCompare(b.exchange)
      );

      if (prices.length > 0) {
        // Save each price to database
        for (const price of prices) {
          await this.savePriceToDatabase(price);
        }

        // Update cache and publish
        await this.redis.set(this.CACHE_KEY, JSON.stringify(prices));
        await this.redis.publish("price_updates", JSON.stringify(prices));
      }
    } catch (error) {
      console.error("Error in update cycle:", error);
    }
  }

  private startUpdateCycle() {
    // Initial update
    this.updatePrices();

    // Set up regular interval
    this.updateInterval = setInterval(() => {
      this.updatePrices();
    }, this.UPDATE_INTERVAL);
  }

  async stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    for (const [name, ws] of this.wsConnections) {
      console.log(`Closing ${name} WebSocket connection`);
      ws.close();
    }
  }
}
