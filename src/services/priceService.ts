import axios from "axios";
import { ExchangePrice } from "../types/exchange";
import { fetchBitOasisPrice } from "./exchanges/bitoasis";
import { fetchRainPrice } from "./exchanges/rain";

export const priceService = {
  async fetchPrices(): Promise<ExchangePrice[]> {
    try {
      // Fetch prices in parallel
      const results = await Promise.allSettled([
        fetchBitOasisPrice(),
        fetchRainPrice(),
      ]);

      // Log any failures for debugging
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const exchange = index === 0 ? "BitOasis" : "Rain";
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
