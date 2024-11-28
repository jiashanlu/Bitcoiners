export interface ExchangePrice {
  exchange: string;
  price: number;
  bid: number;
  ask: number;
  pair: string;
  lastUpdated: string;
  change24h: number;
  volume24h: number;
  fees: {
    maker: number;
    taker: number;
  };
  // Best price indicators
  isLowestAsk?: boolean;
  isHighestBid?: boolean;
  isLowestSpread?: boolean;
}

export interface ExchangeData {
  id: string;
  name: string;
  logo: string;
  pairs: string[];
}
