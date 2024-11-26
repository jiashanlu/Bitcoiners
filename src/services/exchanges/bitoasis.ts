import axios from "axios";
import { ExchangePrice } from "../../types/exchange";
import { EXCHANGE_APIS } from "../../types/exchangeApis";

export async function fetchBitOasisPrice(): Promise<ExchangePrice> {
  try {
    const config = EXCHANGE_APIS.bitoasis;
    console.log(`${config.baseUrl}${config.endpoints.ticker}/BTC-AED`);
    const response = await axios.get(
      `${config.baseUrl}${config.endpoints.ticker}/BTC-AED`
    );
    console.log(response);
    if (!response.data || !response.data.ticker.bid) {
      throw new Error("Invalid response from BitOasis API");
    }

    return {
      exchange: "BitOasis",
      price: parseFloat(response.data.ticker.bid),
      pair: "BTC/AED",
      lastUpdated: new Date().toISOString(),
      change24h: response.data.ticker.daily_percentage_change || 0,
      volume24h: response.data.volume_24h || "NA",
    };
  } catch (error) {
    console.error("BitOasis API Error:", error);
    throw error;
  }
}
