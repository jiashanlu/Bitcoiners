import axios from "axios";
import { ExchangePrice } from "../../types/exchange";
import { EXCHANGE_APIS } from "../../types/exchangeApis";

export async function fetchRainPrice(): Promise<ExchangePrice> {
  try {
    const config = EXCHANGE_APIS.rain;
    const response = await axios.get(
      `${config.baseUrl}${config.endpoints.ticker}/BTC-AED`
    );

    if (!response.data || !response.data.last_price) {
      throw new Error("Invalid response from Rain API");
    }

    return {
      exchange: "Rain",
      price: parseFloat(response.data.last_price),
      pair: "BTC/AED",
      lastUpdated: new Date().toISOString(),
      change24h: response.data.price_change_24h || 0,
      volume24h: response.data.volume_24h || 0,
    };
  } catch (error) {
    console.error("Rain API Error:", error);
    throw error;
  }
}
