import React from "react";
import { Box, Flex, Text, Badge } from "@chakra-ui/react";
import { ExchangePrice } from "../types/exchange";

export interface PriceCardProps {
  data: ExchangePrice;
}

export const PriceCard = ({ data }: PriceCardProps): JSX.Element => {
  const formatPrice = (price: number) => {
    return price.toLocaleString("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Box
      p={6}
      borderRadius="xl"
      bg="white"
      boxShadow="xl"
      transition="transform 0.2s"
      _hover={{ transform: "translateY(-2px)" }}
    >
      <Flex justify="space-between" align="center" mb={4}>
        <Text fontSize="xl" fontWeight="bold">
          {data.exchange}
        </Text>
        <Badge colorScheme="blue">{data.pair}</Badge>
      </Flex>

      <Box mb={6}>
        <Text fontSize="sm" color="gray.500" mb={1}>
          Market Price
        </Text>
        <Text fontSize="2xl" fontWeight="bold">
          {formatPrice(data.price)}
        </Text>
      </Box>

      <Flex direction="column" gap={4}>
        <Box
          p={3}
          bg="green.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="green.200"
        >
          <Text fontSize="sm" color="green.700" fontWeight="medium">
            BID
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="green.600">
            {formatPrice(data.bid)}
          </Text>
        </Box>

        <Box
          p={3}
          bg="red.50"
          borderRadius="md"
          borderWidth="1px"
          borderColor="red.200"
        >
          <Text fontSize="sm" color="red.700" fontWeight="medium">
            ASK
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="red.600">
            {formatPrice(data.ask)}
          </Text>
        </Box>
      </Flex>

      <Text fontSize="xs" color="gray.400" mt={4} textAlign="right">
        Last Updated: {new Date(data.lastUpdated).toLocaleTimeString()}
      </Text>
    </Box>
  );
};
