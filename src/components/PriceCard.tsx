import { Box, Flex, Text, Badge, Icon } from "@chakra-ui/react";
import { FiArrowUp, FiArrowDown } from "react-icons/fi";
import { ExchangePrice } from "../types/exchange";

interface PriceCardProps {
  data: ExchangePrice;
}

export const PriceCard = ({ data }: PriceCardProps) => {
  const isPositiveChange = data.change24h >= 0;

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

      <Text fontSize="3xl" fontWeight="bold" mb={2}>
        {data.price.toLocaleString("en-AE", {
          style: "currency",
          currency: "AED",
        })}
      </Text>

      <Flex align="center" gap={2}>
        <Icon
          as={isPositiveChange ? FiArrowUp : FiArrowDown}
          color={isPositiveChange ? "green.500" : "red.500"}
        />
        <Text
          color={isPositiveChange ? "green.500" : "red.500"}
          fontWeight="medium"
        >
          {Math.abs(data.change24h)}%
        </Text>
      </Flex>

      <Text fontSize="sm" color="gray.500" mt={2}>
        24h Volume: {data.volume24h.toLocaleString()} AED
      </Text>
    </Box>
  );
};
