import axios from "axios";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";
import dns from "dns";
import { promisify } from "util";

const lookup = promisify(dns.lookup);

interface OKXTickerResponse {
  code: string;
  msg: string;
  data: Array<{
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
  }>;
}

interface OKXInstrumentResponse {
  code: string;
  msg: string;
  data: Array<{
    instId: string;
    baseCcy: string;
    quoteCcy: string;
    state: string;
    tickSz: string;
    lotSz: string;
    minSz: string;
    instType: string;
  }>;
}

export class OKXExchange extends AbstractExchange {
  private readonly baseUrl: string = "https://eea.okx.com";

  private getRequestHeaders() {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
  }

  private readonly pairMapping: Record<TradingPair, string> = {
    "BTC/AED": "BTC-AED",
    "USDT/AED": "USDT-AED",
  };

  constructor() {
    super("OKX");
  }

  private async resolveDomain(domain: string): Promise<string> {
    try {
      const dnsResult = await lookup(
        domain.replace("https://", "").split("/")[0]
      );
      return dnsResult.address;
    } catch (error) {
      console.error(`DNS resolution failed for ${domain}:`, error);
      throw error;
    }
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    try {
      const okxPair = this.pairMapping[pair];
      const headers = this.getRequestHeaders();

      // Fetch price data
      console.log(`Fetching price data for ${okxPair}`);
      const tickerResponse = await axios.get<OKXTickerResponse>(
        `${this.baseUrl}/api/v5/market/ticker`,
        {
          params: {
            instId: okxPair,
          },
          headers: headers,
          timeout: 30000,
        }
      );

      if (!tickerResponse.data?.data?.[0]) {
        console.error(`No ticker data found for ${pair}`);
        return null;
      }

      const ticker = tickerResponse.data.data[0];
      console.log(`Received ticker data for ${pair}:`, ticker);
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
