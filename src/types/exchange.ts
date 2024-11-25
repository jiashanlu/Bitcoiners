export interface ExchangePrice {
  exchange: string;
  price: number;
  pair: string;
  lastUpdated: string;
  change24h: number;
  volume24h: number;
}

export interface ExchangeData {
  id: string;
  name: string;
  logo: string;
  pairs: string[];
  apiEndpoint?: string;
}
