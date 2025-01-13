import { ExchangeFees } from "../types/fees";

export const exchangeFees: ExchangeFees = {
  okx: [
    {
      vipLevel: 0, // Standard User
      minVolume: 0,
      maxVolume: 1000000,
      makerFee: 0.004, // 0.400%
      takerFee: 0.006, // 0.600%
      withdrawalLimit: 3500000,
    },
    {
      vipLevel: 1,
      minVolume: 1000001,
      maxVolume: 5000000,
      makerFee: 0.003, // 0.300%
      takerFee: 0.0055, // 0.550%
      withdrawalLimit: 3500000,
    },
    {
      vipLevel: 2,
      minVolume: 5000001,
      maxVolume: 10000000,
      makerFee: 0.0025, // 0.250%
      takerFee: 0.005, // 0.500%
      withdrawalLimit: 3500000,
    },
    {
      vipLevel: 3,
      minVolume: 10000001,
      maxVolume: 25000000,
      makerFee: 0.00225, // 0.225%
      takerFee: 0.0045, // 0.450%
      withdrawalLimit: 3500000,
    },
    {
      vipLevel: 4,
      minVolume: 25000001,
      maxVolume: 50000000,
      makerFee: 0.002, // 0.200%
      takerFee: 0.004, // 0.400%
      withdrawalLimit: 3500000,
    },
    {
      vipLevel: 5,
      minVolume: 50000001,
      maxVolume: 100000000,
      makerFee: 0, // 0.000%
      takerFee: 0.0035, // 0.350%
      withdrawalLimit: 35000000,
    },
    {
      vipLevel: 6,
      minVolume: 100000001,
      maxVolume: 500000000,
      makerFee: -0.00005, // -0.005%
      takerFee: 0.003, // 0.300%
      withdrawalLimit: 35000000,
    },
    {
      vipLevel: 7,
      minVolume: 500000001,
      maxVolume: 1000000000,
      makerFee: -0.0001, // -0.010%
      takerFee: 0.0025, // 0.250%
      withdrawalLimit: 35000000,
    },
    {
      vipLevel: 8,
      minVolume: 1000000001,
      maxVolume: null,
      makerFee: -0.0001, // -0.010%
      takerFee: 0.002, // 0.200%
      withdrawalLimit: 35000000,
    },
  ],
  multibank: [
    {
      tierLevel: 1,
      minVolume: 0,
      maxVolume: 36725, // $10,000 converted to AED
      makerFee: 0.003, // 0.30%
      takerFee: 0.005, // 0.50%
      makerDiscount: 0,
      takerDiscount: 0,
    },
    {
      tierLevel: 2,
      minVolume: 36726,
      maxVolume: 918125, // $250,000 converted to AED
      makerFee: 0.0029, // 0.29%
      takerFee: 0.0048, // 0.48%
      makerDiscount: 0.04,
      takerDiscount: 0.04,
    },
    {
      tierLevel: 3,
      minVolume: 918126,
      maxVolume: 3672500, // $1m converted to AED
      makerFee: 0.0026, // 0.26%
      takerFee: 0.0044, // 0.44%
      makerDiscount: 0.12,
      takerDiscount: 0.12,
    },
    {
      tierLevel: 4,
      minVolume: 3672501,
      maxVolume: 18362500, // $5m converted to AED
      makerFee: 0.0021, // 0.21%
      takerFee: 0.0035, // 0.35%
      makerDiscount: 0.3,
      takerDiscount: 0.3,
    },
    {
      tierLevel: 5,
      minVolume: 18362501,
      maxVolume: 183625000, // $50m converted to AED
      makerFee: 0.0018, // 0.18%
      takerFee: 0.003, // 0.30%
      makerDiscount: 0.4,
      takerDiscount: 0.4,
    },
    {
      tierLevel: 6,
      minVolume: 183625001,
      maxVolume: null,
      makerFee: 0.0012, // 0.12%
      takerFee: 0.002, // 0.20%
      makerDiscount: 0.6,
      takerDiscount: 0.6,
    },
  ],
  bitoasis: [
    {
      minVolume: 0,
      maxVolume: 50000,
      makerFee: 0.004, // 0.40%
      takerFee: 0.006, // 0.60%
    },
    {
      minVolume: 50000,
      maxVolume: 200000,
      makerFee: 0.0026, // 0.26%
      takerFee: 0.0053, // 0.53%
    },
    {
      minVolume: 200000,
      maxVolume: 500000,
      makerFee: 0.00225, // 0.225%
      takerFee: 0.0046, // 0.46%
    },
    {
      minVolume: 500000,
      maxVolume: 1000000,
      makerFee: 0.00215, // 0.215%
      takerFee: 0.0045, // 0.45%
    },
    {
      minVolume: 1000000,
      maxVolume: 2000000,
      makerFee: 0.002, // 0.20%
      takerFee: 0.0044, // 0.44%
    },
    {
      minVolume: 2000000,
      maxVolume: 3500000,
      makerFee: 0.0016, // 0.16%
      takerFee: 0.0043, // 0.43%
    },
    {
      minVolume: 3500000,
      maxVolume: 10000000,
      makerFee: 0.0012, // 0.12%
      takerFee: 0.0041, // 0.41%
    },
    {
      minVolume: 10000000,
      maxVolume: 20000000,
      makerFee: 0.001, // 0.10%
      takerFee: 0.0035, // 0.35%
    },
    {
      minVolume: 20000000,
      maxVolume: null,
      makerFee: 0.001, // 0.10%
      takerFee: 0.0035, // 0.35%
    },
  ],
  rain: {
    makerFee: 0, // 0.0%
    takerFee: 0.0005, // 0.05%
  },
};

// Helper function to get default (lowest tier) fees for an exchange
export function getDefaultFees(exchange: keyof ExchangeFees): {
  maker: number;
  taker: number;
} {
  if (exchange === "rain") {
    return {
      maker: exchangeFees.rain.makerFee,
      taker: exchangeFees.rain.takerFee,
    };
  }

  const tiers = exchangeFees[exchange];
  if (Array.isArray(tiers) && tiers.length > 0) {
    return {
      maker: tiers[0].makerFee,
      taker: tiers[0].takerFee,
    };
  }

  throw new Error(`Invalid exchange or no fee tiers found for ${exchange}`);
}

// Helper function to get fees based on volume
export function getFeesByVolume(
  exchange: keyof ExchangeFees,
  volume: number
): { maker: number; taker: number } {
  if (exchange === "rain") {
    return {
      maker: exchangeFees.rain.makerFee,
      taker: exchangeFees.rain.takerFee,
    };
  }

  const tiers = exchangeFees[exchange];
  if (!Array.isArray(tiers)) {
    throw new Error(`Invalid exchange: ${exchange}`);
  }

  const tier = tiers.find(
    (t) =>
      volume >= t.minVolume && (t.maxVolume === null || volume <= t.maxVolume)
  );

  if (!tier) {
    return getDefaultFees(exchange);
  }

  return {
    maker: tier.makerFee,
    taker: tier.takerFee,
  };
}
