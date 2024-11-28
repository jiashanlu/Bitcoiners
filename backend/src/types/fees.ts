export interface FeeTier {
  minVolume: number; // Minimum volume in AED
  maxVolume: number | null; // Maximum volume in AED, null for unlimited
  makerFee: number; // As decimal (e.g., 0.001 for 0.1%)
  takerFee: number; // As decimal
}

export interface OKXFeeTier extends FeeTier {
  vipLevel: number;
  withdrawalLimit: number; // in USD
}

export interface MultibankFeeTier extends FeeTier {
  tierLevel: number;
  makerDiscount: number; // As decimal
  takerDiscount: number; // As decimal
}

export interface BitOasisFeeTier extends FeeTier {
  // BitOasis specific fields can be added here if needed
}

export interface RainFees {
  makerFee: number; // Fixed at 0.0%
  takerFee: number; // Fixed at 0.05%
}

export interface ExchangeFees {
  okx: OKXFeeTier[];
  multibank: MultibankFeeTier[];
  bitoasis: BitOasisFeeTier[];
  rain: RainFees;
}

// Common interface for all exchange responses
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
}
