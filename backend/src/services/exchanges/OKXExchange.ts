import axios from "axios";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
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
  private readonly pairMapping: Record<TradingPair, string> = {
    "BTC/AED": "BTC-AED",
    "USDT/AED": "USDT-AED",
  };

  constructor() {
    super("OKX");
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
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

      const okxPair = this.pairMapping[pair];
      console.log(
        `OKX - Looking for pair ${okxPair} in response data:`,
        response.data.data
      );

      const ticker = response.data.data.find(
        (ticker) => ticker.instId === okxPair
      );

      if (!ticker) {
        console.log(
          `OKX - Available pairs:`,
          response.data.data.map((t) => t.instId)
        );
        throw new Error(`${pair} pair not found in OKX response`);
      }

      const bid = parseFloat(ticker.bidPx);
      const ask = parseFloat(ticker.askPx);
      const open24h = parseFloat(ticker.open24h);
      const price = (bid + ask) / 2;
      const change24h = ((price - open24h) / open24h) * 100;

      console.log(`OKX - Found prices for ${pair}:`, {
        instId: ticker.instId,
        bid,
        ask,
        spread: ask - bid,
        spreadPercentage: ((ask - bid) / bid) * 100,
        price,
        rawData: ticker,
      });

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
      console.error(`OKX API Error for ${pair}:`, error);
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
