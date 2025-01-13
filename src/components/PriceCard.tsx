import { Box, Flex, Text, Badge, Tooltip } from "@chakra-ui/react";
import { ExchangePrice } from "../types/exchange";
import {
  getExchangeTier,
  getNextTierInfo,
  formatPercentage,
} from "../utils/volumeUtils";

export interface PriceCardProps {
  data: ExchangePrice;
  feeType: "maker" | "taker";
  volume: number;
  isBestBid?: boolean;
  isBestAsk?: boolean;
  showFeeSpread: boolean;
}

export const PriceCard = ({
  data,
  feeType,
  volume,
  isBestBid,
  isBestAsk,
  showFeeSpread,
}: PriceCardProps): JSX.Element => {
  const formatPrice = (price: number) => {
    const decimals = data.pair === "USDT/AED" ? 5 : 2;
    return price.toLocaleString("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  // Handle Rain exchange with USDT pair
  if (data.exchange === "Rain" && data.pair === "USDT/AED") {
    return (
      <Box
        p={4}
        borderRadius="xl"
        bg="white"
        boxShadow="sm"
        minW="300px"
        h="full"
        borderWidth="1px"
        borderColor="gray.300"
        _dark={{
          bg: "#1A1A1A",
          borderColor: "gray.600",
        }}
      >
        <Flex justify="space-between" align="center" mb={4}>
          <Text
            fontSize="lg"
            fontWeight="bold"
            color="#1A1A1A"
            _dark={{ color: "white" }}
          >
            {data.exchange}
          </Text>
          <Badge bg="#F7931A" color="white">
            {data.pair}
          </Badge>
        </Flex>
        <Box
          p={8}
          display="flex"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
        >
          <Text fontSize="lg" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            Pair not available
          </Text>
        </Box>
      </Box>
    );
  }

  const currentFee = feeType === "maker" ? data.fees.maker : data.fees.taker;
  const effectiveBid = data.bid * (1 - currentFee);
  const effectiveAsk = data.ask * (1 + currentFee);

  const getSpread = () => {
    if (showFeeSpread) {
      return ((effectiveAsk - effectiveBid) / effectiveBid) * 100;
    }
    return ((data.ask - data.bid) / data.bid) * 100;
  };

  const { currentTier } = getExchangeTier(data.exchange, volume);
  const nextTier = getNextTierInfo(data.exchange, volume);

  return (
    <Box
      p={4}
      borderRadius="xl"
      bg="white"
      boxShadow="sm"
      transition="transform 0.2s"
      _hover={{ transform: "translateY(-2px)", boxShadow: "md" }}
      minW="300px"
      h="full"
      borderWidth="1px"
      borderColor="#F7931A"
      _dark={{
        bg: "#1A1A1A",
        borderColor: "#F7931A",
      }}
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text
          fontSize="lg"
          fontWeight="bold"
          color="#1A1A1A"
          _dark={{ color: "white" }}
        >
          {data.exchange}
        </Text>
        <Badge bg="#F7931A" color="white">
          {data.pair}
        </Badge>
      </Flex>

      <Box mb={4}>
        <Box p={3} borderRadius="md" bg="#F7FAFC" _dark={{ bg: "#2D3748" }}>
          <Flex justify="space-between" align="center" mb={1}>
            <Text fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
              Current Fee ({feeType})
            </Text>
            <Badge bg="#F7931A" color="white">
              {currentTier}
            </Badge>
          </Flex>
          <Text fontSize="lg" fontWeight="bold" color="#F7931A">
            {formatPercentage(currentFee)}
          </Text>
          {nextTier?.isNoTierStructure ? (
            <Text
              fontSize="xs"
              color="#4A5568"
              _dark={{ color: "#A0AEC0" }}
              mt={1}
            >
              No tier structure
            </Text>
          ) : (
            nextTier && (
              <Tooltip
                label={`Next tier at ${nextTier.volume}: ${
                  feeType === "maker" ? nextTier.maker : nextTier.taker
                }`}
              >
                <Text
                  fontSize="xs"
                  color="#4A5568"
                  _dark={{ color: "#A0AEC0" }}
                  mt={1}
                >
                  Next tier: {nextTier.volume} AED
                </Text>
              </Tooltip>
            )
          )}
        </Box>
      </Box>

      <Box mb={4}>
        <Box
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor={isBestBid ? "#CE1126" : "gray.200"}
          _dark={{
            borderColor: isBestBid ? "#CE1126" : "gray.700",
          }}
        >
          <Text
            fontSize="sm"
            color="#4A5568"
            _dark={{ color: "#A0AEC0" }}
            mb={1}
          >
            BID (Sell)
          </Text>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={isBestBid ? "#CE1126" : "#1A1A1A"}
            _dark={{
              color: isBestBid ? "#CE1126" : "white",
            }}
            mb={1}
          >
            {formatPrice(effectiveBid)}
          </Text>
          <Text fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            Pre-fee: {formatPrice(data.bid)}
          </Text>
        </Box>
      </Box>

      <Box mb={4}>
        <Box
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor={isBestAsk ? "#009739" : "gray.200"}
          _dark={{
            borderColor: isBestAsk ? "#009739" : "gray.700",
          }}
        >
          <Text
            fontSize="sm"
            color="#4A5568"
            _dark={{ color: "#A0AEC0" }}
            mb={1}
          >
            ASK (Buy)
          </Text>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={isBestAsk ? "#009739" : "#1A1A1A"}
            _dark={{
              color: isBestAsk ? "#009739" : "white",
            }}
            mb={1}
          >
            {formatPrice(effectiveAsk)}
          </Text>
          <Text fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            Pre-fee: {formatPrice(data.ask)}
          </Text>
        </Box>
      </Box>

      <Box>
        <Box p={3} borderRadius="md" bg="#F7FAFC" _dark={{ bg: "#2D3748" }}>
          <Text
            fontSize="sm"
            color="#4A5568"
            _dark={{ color: "#A0AEC0" }}
            mb={1}
          >
            Spread {showFeeSpread ? "(with fees)" : "(without fees)"}
          </Text>
          <Text fontSize="lg" fontWeight="bold" color="#F7931A">
            {getSpread().toFixed(3)}%
          </Text>
        </Box>
      </Box>

      <Text
        fontSize="xs"
        color="#4A5568"
        _dark={{ color: "#A0AEC0" }}
        mt={3}
        textAlign="right"
      >
        Last Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </Text>
    </Box>
  );
};
