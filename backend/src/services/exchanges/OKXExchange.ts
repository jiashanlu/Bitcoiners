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
  // Using IP addresses directly to avoid DNS issues
  private readonly baseUrls: string[] = [
    "https://www.okx.com/api/v5",
    "https://api.okx.com/api/v5",
    "https://18.178.147.205/api/v5", // okx.com IP
    "https://54.168.136.243/api/v5", // api.okx.com IP
    "https://52.193.204.146/api/v5", // Another okx.com IP
  ];
  private readonly pairMapping: Record<TradingPair, string> = {
    "BTC/AED": "BTC-AED",
    "USDT/AED": "USDT-AED",
  };

  constructor() {
    super("OKX");
  }

  async fetchPrice(pair: TradingPair): Promise<ExchangePrice | null> {
    try {
      const okxPair = this.pairMapping[pair];
      const headers = {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "sec-ch-ua":
          '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"macOS"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        Pragma: "no-cache",
        Origin: "https://www.okx.com",
        Referer: "https://www.okx.com/",
      };

      let response: { data: OKXResponse } | undefined;
      const maxRetries = 3;
      let lastError;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
            console.log(
              `Retrying OKX API call for ${pair}, attempt ${
                attempt + 1
              }/${maxRetries} after ${delay}ms delay`
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          }

          // Try each URL in sequence until one works
          for (const baseUrl of this.baseUrls) {
            try {
              console.log(`Attempting to fetch from ${baseUrl} for ${pair}`);
              response = await axios.get<OKXResponse>(
                `${baseUrl}/market/ticker`,
                {
                  params: {
                    instId: okxPair,
                  },
                  headers: {
                    ...headers,
                    "Sec-Fetch-Site": baseUrl.includes("okx.com")
                      ? "same-origin"
                      : "cross-site",
                    Host: baseUrl.includes("api.okx")
                      ? "api.okx.com"
                      : "www.okx.com",
                  },
                  timeout: 10000,
                  httpsAgent: new (require("https").Agent)({
                    rejectUnauthorized: false, // Allow self-signed certs
                  }),
                }
              );

              // If successful, break the loop
              if (response?.data) {
                console.log(`Successfully fetched from ${baseUrl} for ${pair}`);
                break;
              }
            } catch (urlError) {
              console.log(
                `Failed to fetch from ${baseUrl} for ${pair}:`,
                urlError.message
              );
              // Continue to next URL if this one failed
              continue;
            }
          }

          // If we still don't have a response after trying all URLs, throw error
          if (!response) {
            throw new Error(`All URLs failed for ${pair}`);
          }

          // If we get here, the request was successful
          break;
        } catch (error) {
          lastError = error;
          console.error(`OKX API attempt ${attempt + 1} failed for ${pair}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            headers: error.response?.headers,
          });

          // If this was our last retry, throw the error
          if (attempt === maxRetries - 1) {
            throw error;
          }
        }
      }

      if (
        !response ||
        response.data.code !== "0" ||
        !response.data.data ||
        !response.data.data[0]
      ) {
        console.error(
          `Invalid response from OKX API for ${pair}:`,
          response?.data ?? "No response received"
        );
        throw new Error("Invalid response from OKX API");
      }

      const ticker = response.data.data[0];
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
