import axios from "axios";
import { ExchangePrice } from "../../types/fees";
import { AbstractExchange, TradingPair } from "./BaseExchange";
import { getDefaultFees, getFeesByVolume } from "../../config/fees";
import dns from "dns";
import { promisify } from "util";

const lookup = promisify(dns.lookup);

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
  private readonly baseUrl: string = "https://www.okx.com";
  private getRequestHeaders(isFirstRequest: boolean = false) {
    const timestamp = Date.now();
    const browserData = {
      platform: "Win32",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      language: "en-US",
      screenResolution: "1920x1080",
      timezone: "UTC",
      colorDepth: 24,
    };

    const headers: Record<string, string> = {
      authority: "www.okx.com",
      accept: isFirstRequest
        ? "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        : "application/json",
      "accept-encoding": "gzip, deflate, br",
      "accept-language": "en-US,en;q=0.9",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua":
        '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      "sec-fetch-dest": isFirstRequest ? "document" : "empty",
      "sec-fetch-mode": isFirstRequest ? "navigate" : "cors",
      "sec-fetch-site": isFirstRequest ? "none" : "same-origin",
      "sec-fetch-user": isFirstRequest ? "?1" : undefined,
      "upgrade-insecure-requests": isFirstRequest ? "1" : undefined,
      "user-agent": browserData.userAgent,
    };

    if (!isFirstRequest) {
      headers["content-type"] = "application/json";
      headers["origin"] = "https://www.okx.com";
      headers["referer"] = "https://www.okx.com/trade-spot";
      headers["x-requested-with"] = "XMLHttpRequest";
    }

    // Add browser fingerprint data
    const fingerprint = Buffer.from(
      JSON.stringify({
        ...browserData,
        timestamp,
        random: Math.random(),
      })
    ).toString("base64");

    headers["cookie"] = `defaultLocale=en_US; _okx_fp=${fingerprint}`;

    return headers;
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

          try {
            console.log(`Attempting to fetch from ${this.baseUrl} for ${pair}`);
            // First make a request to the main page like a browser would
            const mainResponse = await axios.get(this.baseUrl, {
              headers: this.getRequestHeaders(true),
              maxRedirects: 5,
              validateStatus: null,
              withCredentials: true,
              timeout: 30000,
            });

            // Extract cookies and wait a bit like a real browser would
            const cookies = mainResponse.headers["set-cookie"];
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 1000 + 500)
            );

            // Now make the API request with updated headers
            const apiHeaders = this.getRequestHeaders(false);
            if (cookies) {
              apiHeaders.cookie = `${apiHeaders.cookie}; ${cookies.join("; ")}`;
            }

            const axiosResponse = await axios.get<OKXResponse>(
              `${this.baseUrl}/api/v5/market/ticker`,
              {
                params: {
                  instId: okxPair,
                  t: Date.now(),
                  _: Date.now(),
                },
                headers: apiHeaders,
                timeout: 30000,
                proxy: false,
                maxRedirects: 5,
                validateStatus: null,
                decompress: true,
                withCredentials: true,
              }
            );

            // Check if response is HTML (Cloudflare block)
            const responseData = axiosResponse.data as OKXResponse | string;
            if (
              typeof responseData === "string" &&
              responseData.includes("<!DOCTYPE html>")
            ) {
              throw new Error("Received Cloudflare challenge page");
            }

            // Log full response for debugging
            console.log(`OKX response for ${pair}:`, {
              status: axiosResponse.status,
              statusText: axiosResponse.statusText,
              data:
                typeof responseData === "string"
                  ? "HTML Response"
                  : responseData,
              headers: axiosResponse.headers,
            });

            if (typeof responseData === "string") {
              throw new Error("Received HTML response instead of JSON");
            }

            response = { data: responseData };

            // Check if we have valid data regardless of response code
            if (axiosResponse.data?.data?.[0]) {
              console.log(
                `Successfully fetched from ${this.baseUrl} for ${pair}`
              );
              break;
            }

            throw new Error(
              `Invalid response structure: ${JSON.stringify(
                axiosResponse.data
              )}`
            );
          } catch (error) {
            console.error(
              `Failed to fetch from ${this.baseUrl} for ${pair}:`,
              error.message
            );
            throw error;
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
