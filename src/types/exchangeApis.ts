export interface ExchangeApiConfig {
  baseUrl: string;
  wsUrl?: string;
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
    wsUrl: "wss://pro-api-bhr.rain.com/websocket",
    endpoints: {
      ticker: "/market/prices",
    },
  },
  multibank: {
    baseUrl: "https://trade.multibank.io",
    wsUrl: "wss://nodes.multibank.io/ws",
    endpoints: {
      ticker: "/",
    },
    headers: {
      Origin: "https://trade.multibank.io",
      "User-Agent": "Mozilla/5.0",
    },
  },
};
