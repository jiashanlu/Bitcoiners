import axios from "axios";
import { ExchangePrice } from "../types/exchange";

const API_BASE_URL = "https://api.bitcoiners.ae"; // Replace with your actual API

export const priceService = {
  async fetchPrices(): Promise<ExchangePrice[]> {
    // Temporary mock data until API is ready
    return [
      {
        exchange: "BitOasis",
        price: 155000,
        pair: "BTC/AED",
        lastUpdated: new Date().toISOString(),
        change24h: 2.5,
        volume24h: 1500000,
      },
      {
        exchange: "Rain",
        price: 154800,
        pair: "BTC/AED",
        lastUpdated: new Date().toISOString(),
        change24h: 2.3,
        volume24h: 1200000,
      },
    ];
  },
};
