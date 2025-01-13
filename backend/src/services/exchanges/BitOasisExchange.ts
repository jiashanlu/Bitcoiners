import axios from "axios";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
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

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    try {
      // Convert our standard pair format to BitOasis format
      const bitOasisPair = pair === "BTC/AED" ? "BTC-AED" : "USDT-AED";

      const response = await axios.get<BitOasisResponse>(
        `${this.baseUrl}/exchange/ticker/${bitOasisPair}`
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
        pair: pair,
        lastUpdated: new Date().toISOString(),
        change24h: response.data.ticker.daily_percentage_change || 0,
        volume24h: response.data.volume_24h || 0,
      });
    } catch (error) {
      console.error(`BitOasis API Error for ${pair}:`, error);
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
