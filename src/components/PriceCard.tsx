import React from "react";
import { Box, Flex, Text, Badge, Divider } from "@chakra-ui/react";
import { ExchangePrice } from "../types/exchange";

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
    return price.toLocaleString("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(3)}%`;
  };

  const currentFee = feeType === "maker" ? data.fees.maker : data.fees.taker;
  const effectiveBid = data.bid * (1 - currentFee);
  const effectiveAsk = data.ask * (1 + currentFee);

  const getSpread = () => {
    if (showFeeSpread) {
      return ((effectiveAsk - effectiveBid) / effectiveBid) * 100;
    }
    return ((data.ask - data.bid) / data.bid) * 100;
  };

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
      borderColor="gray.100"
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="gray.800">
          {data.exchange}
        </Text>
        <Badge colorScheme="blue" fontSize="sm">
          {data.pair}
        </Badge>
      </Flex>

      <Box mb={4}>
        <Box p={3} borderRadius="md" bg="gray.50">
          <Text fontSize="sm" color="gray.600" mb={1}>
            Current Fee ({feeType})
          </Text>
          <Text fontSize="lg" fontWeight="bold" color="purple.600">
            {formatPercentage(currentFee)}
          </Text>
        </Box>
      </Box>

      <Box mb={4}>
        <Box
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor={isBestBid ? "red.200" : "gray.100"}
        >
          <Text fontSize="sm" color="gray.600" mb={1}>
            BID (Sell)
          </Text>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={isBestBid ? "red.500" : "gray.800"}
            mb={1}
          >
            {formatPrice(effectiveBid)}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Pre-fee: {formatPrice(data.bid)}
          </Text>
        </Box>
      </Box>

      <Box mb={4}>
        <Box
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor={isBestAsk ? "green.200" : "gray.100"}
        >
          <Text fontSize="sm" color="gray.600" mb={1}>
            ASK (Buy)
          </Text>
          <Text
            fontSize="xl"
            fontWeight="bold"
            color={isBestAsk ? "green.500" : "gray.800"}
            mb={1}
          >
            {formatPrice(effectiveAsk)}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Pre-fee: {formatPrice(data.ask)}
          </Text>
        </Box>
      </Box>

      <Box>
        <Box p={3} borderRadius="md" bg="gray.50">
          <Text fontSize="sm" color="gray.600" mb={1}>
            Spread {showFeeSpread ? "(with fees)" : "(without fees)"}
          </Text>
          <Text fontSize="lg" fontWeight="bold" color="gray.700">
            {getSpread().toFixed(3)}%
          </Text>
        </Box>
      </Box>

      <Text fontSize="xs" color="gray.400" mt={3} textAlign="right">
        Last Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </Text>
    </Box>
  );
};
