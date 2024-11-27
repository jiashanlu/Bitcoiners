import axios from "axios";
import { ExchangePrice } from "../../types/exchange";
import { EXCHANGE_APIS } from "../../types/exchangeApis";

interface BitOasisResponse {
  ticker: {
    bid: string;
    ask: string;
    daily_percentage_change: number;
  };
  volume_24h: number;
}

export async function fetchBitOasisPrice(): Promise<ExchangePrice> {
  try {
    const config = EXCHANGE_APIS.bitoasis;
    const response = await axios.get<BitOasisResponse>(
      `${config.baseUrl}${config.endpoints.ticker}/BTC-AED`
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
    // Use the average of bid and ask as the main price
    const price = (bid + ask) / 2;

    return {
      exchange: "BitOasis",
      price: price,
      bid: bid,
      ask: ask,
      pair: "BTC/AED",
      lastUpdated: new Date().toISOString(),
      change24h: response.data.ticker.daily_percentage_change || 0,
      volume24h: response.data.volume_24h || 0,
    };
  } catch (error) {
    console.error("BitOasis API Error:", error);
    throw error;
  }
}
