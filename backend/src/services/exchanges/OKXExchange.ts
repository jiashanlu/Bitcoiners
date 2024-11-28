import axios from "axios";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";

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

export class OKXExchange extends AbstractExchange {
  private readonly baseUrl: string = "https://www.okx.com/api/v5";

  constructor() {
    super("OKX");
  }

  async fetchPrice(): Promise<ExchangePrice | null> {
    try {
      const response = await axios.get<OKXResponse>(
        `${this.baseUrl}/market/tickers`,
        {
          params: {
            instType: "SPOT",
          },
        }
      );

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
      const open24h = parseFloat(btcAedTicker.open24h);
      const price = (bid + ask) / 2;
      const change24h = ((price - open24h) / open24h) * 100;

      return this.formatPrice({
        exchange: this.getName(),
        price: price,
        bid: bid,
        ask: ask,
        pair: "BTC/AED",
        lastUpdated: new Date(parseInt(btcAedTicker.ts)).toISOString(),
        change24h: change24h,
        volume24h: parseFloat(btcAedTicker.volCcy24h),
      });
    } catch (error) {
      console.error("OKX API Error:", error);
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
