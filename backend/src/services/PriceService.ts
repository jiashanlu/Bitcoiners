import { Redis } from "ioredis";
import { Repository } from "typeorm";
import { Price } from "../models/Price";
import { ExchangePrice } from "../types/fees";
import { OKXExchange } from "./exchanges/OKXExchange";
import { BitOasisExchange } from "./exchanges/BitOasisExchange";
import { RainExchange } from "./exchanges/RainExchange";
import { MultibankExchange } from "./exchanges/MultibankExchange";
import { BaseExchange, TradingPair } from "./exchanges/BaseExchange";

export class PriceService {
  private redis: Redis;
  private priceRepository: Repository<Price>;
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly UPDATE_INTERVAL = 15000; // 15 seconds
  private exchanges: BaseExchange[] = [];
  private currentVolume: number = 0;
  private readonly PAIRS: TradingPair[] = ["BTC/AED", "USDT/AED"];

  constructor(redis: Redis, priceRepository: Repository<Price>) {
    this.redis = redis;
    this.priceRepository = priceRepository;

    // Initialize exchanges
    this.exchanges = [
      new OKXExchange(),
      new BitOasisExchange(),
      new RainExchange(),
      new MultibankExchange(),
    ];
  }

  async start() {
    // Initialize cache for each pair
    for (const pair of this.PAIRS) {
      const cacheKey = this.getCacheKey(pair);
      await this.redis.set(cacheKey, JSON.stringify([]));
    }

    // Start WebSocket connections for exchanges that support it
    for (const exchange of this.exchanges) {
      if ("start" in exchange && typeof exchange.start === "function") {
        console.log(`Starting WebSocket connection for ${exchange.getName()}`);
        await exchange.start();
      }
    }

    this.startUpdateCycle();
  }

  private getCacheKey(pair: TradingPair): string {
    return `latest_prices_${pair.replace("/", "_")}`;
  }

  // Method to update trading volume
  async updateVolume(volume: number) {
    this.currentVolume = volume;
    await this.updatePrices(); // Trigger immediate price update with new volume
  }

  private async savePriceToDatabase(priceData: ExchangePrice) {
    try {
      const price = new Price();
      const now = new Date();

      price.exchange = priceData.exchange;
      price.bid = priceData.bid;
      price.ask = priceData.ask;
      price.price = priceData.price;
      price.pair = priceData.pair;
      price.timestamp = now;
      price.createdAt = now;

      const savedPrice = await this.priceRepository.save(price);
      console.log(
        `Saved ${priceData.exchange} ${priceData.pair} price to database with ID: ${savedPrice.id}`
      );
      return true;
    } catch (error) {
      console.error(
        `Error saving ${priceData.exchange} ${priceData.pair} price to database:`,
        error
      );
      return false;
    }
  }

  private async updatePrices() {
    try {
      for (const pair of this.PAIRS) {
        // Fetch prices from all exchanges with current volume for each pair
        const pricePromises = this.exchanges.map((exchange) =>
          exchange.fetchPrice(pair).then((price) => {
            if (price) {
              // Update fees based on current volume
              const fees = exchange.getFeesByVolume(this.currentVolume);
              return {
                ...price,
                fees,
              };
            }
            return null;
          })
        );

        const prices = (await Promise.all(pricePromises)).filter(
          (price): price is ExchangePrice => price !== null
        );

        if (prices.length > 0) {
          // Save raw prices to database
          for (const price of prices) {
            await this.savePriceToDatabase(price);
          }

          // Sort prices by exchange name
          const sortedPrices = prices.sort((a, b) =>
            a.exchange.localeCompare(b.exchange)
          );

          // Find best raw prices (before fees)
          const lowestAsk = Math.min(...prices.map((p) => p.ask));
          const highestBid = Math.max(...prices.map((p) => p.bid));
          const lowestSpread = Math.min(...prices.map((p) => p.ask - p.bid));

          // Add best price indicators based on raw prices
          const enrichedPrices = sortedPrices.map((price) => ({
            ...price,
            isLowestAsk: price.ask === lowestAsk,
            isHighestBid: price.bid === highestBid,
            isLowestSpread: price.ask - price.bid === lowestSpread,
          }));

          // Update cache for this pair
          const cacheKey = this.getCacheKey(pair);
          await this.redis.set(cacheKey, JSON.stringify(enrichedPrices));
          console.log(`Updated prices for ${pair} in Redis cache`);
        }
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

    // Stop WebSocket connections
    for (const exchange of this.exchanges) {
      if ("stop" in exchange && typeof exchange.stop === "function") {
        console.log(`Stopping WebSocket connection for ${exchange.getName()}`);
        await exchange.stop();
      }
    }
  }

  // Method to get fees for a specific exchange and volume
  getFees(exchange: string, volume: number): { maker: number; taker: number } {
    const exchangeService = this.exchanges.find(
      (e) => e.getName().toLowerCase() === exchange.toLowerCase()
    );
    if (!exchangeService) {
      throw new Error(`Exchange ${exchange} not found`);
    }
    return exchangeService.getFeesByVolume(volume);
  }
}
