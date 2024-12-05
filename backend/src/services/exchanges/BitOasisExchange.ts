import axios from "axios";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

interface BitOasisResponse {
  ticker: {
    bid: string;
    ask: string;
    daily_percentage_change: number;
  };
  volume_24h: number;
}

export class BitOasisExchange extends AbstractExchange {
  private readonly baseUrl: string = "https://api.bitoasis.net/v3";

  constructor() {
    super("BitOasis");
  }

  async fetchPrice(): Promise<ExchangePrice | null> {
    try {
      const response = await axios.get<BitOasisResponse>(
        `${this.baseUrl}/exchange/ticker/BTC-AED`
      );

      if (
        !response.data ||
        !response.data.ticker.bid ||
        !response.data.ticker.ask
      ) {
        throw new Error("Invalid response from BitOasis API");
      }

      const bid = parseFloat(response.data.ticker.bid);
      const ask = parseFloat(response.data.ticker.ask);
      const price = (bid + ask) / 2;

      return this.formatPrice({
        exchange: this.getName(),
        price: price,
        bid: bid,
        ask: ask,
        pair: "BTC/AED",
        lastUpdated: new Date().toISOString(),
        change24h: response.data.ticker.daily_percentage_change || 0,
        volume24h: response.data.volume_24h || 0,
      });
    } catch (error) {
      console.error("BitOasis API Error:", error);
      return null;
    }
  }

  getDefaultFees(): { maker: number; taker: number } {
    return getDefaultFees("bitoasis");
  }

  getFeesByVolume(volume: number): { maker: number; taker: number } {
    return getFeesByVolume("bitoasis", volume);
  }
}
