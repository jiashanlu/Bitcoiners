import { exchangeFees } from "../../backend/src/config/fees";
import {
  OKXFeeTier,
  MultibankFeeTier,
  BitOasisFeeTier,
  FeeTier,
  TierInfo,
} from "../../backend/src/types/fees";

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toLocaleString("en-AE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}M`;
  } else if (volume >= 1_000) {
    return `${(volume / 1_000).toLocaleString("en-AE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}K`;
  }
  return volume.toLocaleString("en-AE");
}

function isOKXTier(tier: FeeTier): tier is OKXFeeTier {
  return "vipLevel" in tier;
}

function isMultibankTier(tier: FeeTier): tier is MultibankFeeTier {
  return "tierLevel" in tier;
}

function normalizeExchangeName(exchange: string): string {
  // Map display names to config names
  const nameMap: { [key: string]: string } = {
    OKX: "okx",
    MULTIBANK: "multibank",
    BITOASIS: "bitoasis",
    BitOasis: "bitoasis",
    MultiBank: "multibank",
    RAIN: "rain",
    Rain: "rain",
  };
  return nameMap[exchange] || exchange.toLowerCase();
}

export function getExchangeTier(exchange: string, volume: number): TierInfo {
  const normalizedExchange = normalizeExchangeName(exchange);
  const fees = exchangeFees[normalizedExchange as keyof typeof exchangeFees];

  if (!Array.isArray(fees)) {
    return {
      currentTier: "Standard",
      nextTierVolume: null,
      nextTierFees: null,
    };
  }

  // Find the highest tier where volume >= minVolume
  let currentTierIndex = -1;
  for (let i = 0; i < fees.length; i++) {
    if (volume >= fees[i].minVolume) {
      currentTierIndex = i;
    } else {
      break;
    }
  }

  // If no tier found, use the first tier
  if (currentTierIndex === -1) {
    currentTierIndex = 0;
  }

  const currentTier = fees[currentTierIndex];
  const nextTier = fees[currentTierIndex + 1] || null;

  // Custom tier naming based on exchange
  let tierName: string;
  if (normalizedExchange === "okx" && isOKXTier(currentTier)) {
    tierName =
      currentTier.vipLevel === 0 ? "Standard" : `VIP ${currentTier.vipLevel}`;
  } else if (
    normalizedExchange === "multibank" &&
    isMultibankTier(currentTier)
  ) {
    tierName = `Tier ${currentTier.tierLevel}`;
  } else if (normalizedExchange === "bitoasis") {
    tierName = currentTierIndex === 0 ? "Standard" : `VIP ${currentTierIndex}`;
  } else {
    tierName = "Standard";
  }

  return {
    currentTier: tierName,
    nextTierVolume: nextTier?.minVolume || null,
    nextTierFees: nextTier
      ? {
          maker: nextTier.makerFee,
          taker: nextTier.takerFee,
        }
      : null,
  };
}

export function getAllVolumeTiers(): number[] {
  const volumeTiers = new Set<number>();

  // Collect all volume thresholds from all exchanges
  Object.values(exchangeFees).forEach((exchangeFee) => {
    if (Array.isArray(exchangeFee)) {
      exchangeFee.forEach((tier) => {
        if (tier.minVolume > 0) volumeTiers.add(tier.minVolume);
        // if (tier.maxVolume) volumeTiers.add(tier.maxVolume); // not needed, bringgs confusion
      });
    }
  });

  // Convert to array, sort, and remove duplicates
  return Array.from(volumeTiers).sort((a, b) => a - b);
}

export function getNextVolumeTier(currentVolume: number): number {
  const tiers = getAllVolumeTiers();
  const nextTier = tiers.find((tier) => tier > currentVolume);
  return nextTier || currentVolume;
}

export function getPreviousVolumeTier(currentVolume: number): number {
  const tiers = getAllVolumeTiers();
  const reversedTiers = tiers.reverse();
  const prevTier = reversedTiers.find((tier) => tier < currentVolume);
  return prevTier || 0;
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(3)}%`;
}

export function getNextTierInfo(
  exchange: string,
  currentVolume: number
): {
  volume: string;
  maker: string;
  taker: string;
  isNoTierStructure?: boolean;
} | null {
  const normalizedExchange = normalizeExchangeName(exchange);

  // For Rain, return special object indicating no tier structure
  if (normalizedExchange === "rain") {
    return {
      volume: "",
      maker: "",
      taker: "",
      isNoTierStructure: true,
    };
  }

  const { nextTierVolume, nextTierFees } = getExchangeTier(
    exchange,
    currentVolume
  );

  if (!nextTierVolume || !nextTierFees) return null;

  return {
    volume: formatVolume(nextTierVolume),
    maker: formatPercentage(nextTierFees.maker),
    taker: formatPercentage(nextTierFees.taker),
  };
}
