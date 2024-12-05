export interface BaseTier {
  minVolume: number;
  maxVolume: number | null;
  makerFee: number;
  takerFee: number;
}

export interface OKXFeeTier extends BaseTier {
  vipLevel: number;
  withdrawalLimit: number;
}

export interface MultibankFeeTier extends BaseTier {
  tierLevel: number;
  makerDiscount: number;
  takerDiscount: number;
}

export interface BitOasisFeeTier extends BaseTier {
  // BitOasis specific fields can be added here if needed
}

export interface RainFees {
  makerFee: number;
  takerFee: number;
}

export interface ExchangeFees {
  okx: OKXFeeTier[];
  multibank: MultibankFeeTier[];
  bitoasis: BitOasisFeeTier[];
  rain: RainFees;
}

export type FeeTier = OKXFeeTier | MultibankFeeTier | BitOasisFeeTier;

export interface TierInfo {
  currentTier: string;
  nextTierVolume: number | null;
  nextTierFees: {
    maker: number;
    taker: number;
  } | null;
}

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
  isLowestAsk?: boolean;
  isHighestBid?: boolean;
  isLowestSpread?: boolean;
}
