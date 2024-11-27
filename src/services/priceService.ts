import { ExchangePrice } from "../types/exchange";
import { fetchBitOasisPrice } from "./exchanges/bitoasis";
import { fetchRainPrice } from "./exchanges/rain";
import { fetchMultibankPrice } from "./exchanges/multibank";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const priceService = {
  async fetchPrices(): Promise<ExchangePrice[]> {
    try {
      // Add a small delay to allow WebSocket connections to establish
      await delay(1000);

      // Fetch prices in parallel
      const results = await Promise.allSettled([
        fetchBitOasisPrice(),
        fetchRainPrice(),
        fetchMultibankPrice(),
      ]);

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const exchange = ["BitOasis", "Rain", "Multibank"][index];
          console.error(`Failed to fetch ${exchange} price:`, result.reason);
        }
      });

      // Filter out failed requests and return successful ones
      const prices = results
        .filter(
          (result): result is PromiseFulfilledResult<ExchangePrice> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value);

      if (prices.length === 0) {
        throw new Error("No exchange prices available - all requests failed");
      }

      return prices;
    } catch (error) {
      console.error("Price fetching error:", error);
      throw error;
    }
  },
};
