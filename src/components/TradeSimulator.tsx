import React, { useState, useMemo } from "react";
import {
  Box,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Text,
  Flex,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  SimpleGrid,
} from "@chakra-ui/react";
import { ExchangePrice } from "../types/exchange";

interface TradeSimulatorProps {
  prices: ExchangePrice[];
  volume: number;
  feeType: "maker" | "taker";
}

interface EffectivePrice {
  exchange: string;
  buyPrice: number;
  sellPrice: number;
}

interface BestTrade {
  buyExchange: string;
  sellExchange: string;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  profitPercentage: number;
}

export const TradeSimulator: React.FC<TradeSimulatorProps> = ({
  prices,
  volume,
  feeType,
}) => {
  const [btcAmount, setBtcAmount] = useState<number>(1);

  const bestTrade = useMemo<BestTrade | null>(() => {
    if (!prices.length) return null;

    let bestResult: BestTrade | null = null;

    // Calculate effective prices with fees for each exchange
    const effectivePrices: EffectivePrice[] = prices.map((price) => {
      const fee = feeType === "maker" ? price.fees.maker : price.fees.taker;
      const buyPrice = price.ask * (1 + fee);
      const sellPrice = price.bid * (1 - fee);
      return {
        exchange: price.exchange,
        buyPrice,
        sellPrice,
      };
    });

    // Find best combination, including within same exchange
    effectivePrices.forEach((buyOption) => {
      effectivePrices.forEach((sellOption) => {
        const profit = (sellOption.sellPrice - buyOption.buyPrice) * btcAmount;
        const profitPercentage =
          ((sellOption.sellPrice - buyOption.buyPrice) / buyOption.buyPrice) *
          100;

        if (!bestResult || profit > bestResult.profit) {
          bestResult = {
            buyExchange: buyOption.exchange,
            sellExchange: sellOption.exchange,
            buyPrice: buyOption.buyPrice,
            sellPrice: sellOption.sellPrice,
            profit,
            profitPercentage,
          };
        }
      });
    });

    return bestResult;
  }, [prices, btcAmount, feeType]);

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
      bg="white"
      borderRadius="xl"
      shadow="lg"
      borderWidth="2px"
      borderColor="gray.200"
    >
      <Flex justify="space-between" align="center" mb={6}>
        <Text fontSize="2xl" fontWeight="bold">
          Arbitrage Simulator
        </Text>
        <FormControl maxW="200px">
          <NumberInput
            value={btcAmount}
            onChange={(_, value) => setBtcAmount(value)}
            min={0.0001}
            step={0.1}
            precision={4}
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
          <FormLabel fontSize="sm" color="gray.600">
            BTC Amount
          </FormLabel>
        </FormControl>
      </Flex>

      {bestTrade && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box
            p={4}
            borderRadius="lg"
            bg="green.50"
            borderWidth="1px"
            borderColor="green.200"
          >
            <Stat>
              <StatLabel color="green.700">Best Buy At</StatLabel>
              <StatNumber color="green.600">{bestTrade.buyExchange}</StatNumber>
              <StatHelpText>
                {formatPrice(bestTrade.buyPrice)} / BTC
              </StatHelpText>
            </Stat>
          </Box>

          <Box
            p={4}
            borderRadius="lg"
            bg="red.50"
            borderWidth="1px"
            borderColor="red.200"
          >
            <Stat>
              <StatLabel color="red.700">Best Sell At</StatLabel>
              <StatNumber color="red.600">{bestTrade.sellExchange}</StatNumber>
              <StatHelpText>
                {formatPrice(bestTrade.sellPrice)} / BTC
              </StatHelpText>
            </Stat>
          </Box>

          <Box
            p={4}
            borderRadius="lg"
            bg={bestTrade.profit > 0 ? "blue.50" : "gray.50"}
            borderWidth="1px"
            borderColor={bestTrade.profit > 0 ? "blue.200" : "gray.200"}
          >
            <Stat>
              <StatLabel>Potential Profit</StatLabel>
              <StatNumber
                color={bestTrade.profit > 0 ? "blue.500" : "gray.600"}
              >
                {formatPrice(bestTrade.profit)}
              </StatNumber>
              <StatHelpText>
                <StatArrow
                  type={bestTrade.profit > 0 ? "increase" : "decrease"}
                />
                {bestTrade.profitPercentage.toFixed(2)}%
              </StatHelpText>
            </Stat>
          </Box>
        </SimpleGrid>
      )}
    </Box>
  );
};
