export interface ExchangeApiConfig {
  baseUrl: string;
  endpoints: {
    ticker: string;
    orderbook?: string;
  };
  headers?: Record<string, string>;
}

export const EXCHANGE_APIS: Record<string, ExchangeApiConfig> = {
  bitoasis: {
    baseUrl: "https://api.bitoasis.net/v1",
    endpoints: {
      ticker: "/exchange/ticker",
    },
  },
  rain: {
    baseUrl: "https://rain.bh/v1",
    endpoints: {
      ticker: "/market/prices",
    },
  },
  // Add more exchanges as needed
};
