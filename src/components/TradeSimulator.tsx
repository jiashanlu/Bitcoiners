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
  const [amount, setAmount] = useState<number>(1);

  const isUSDT = prices.length > 0 && prices[0].pair === "USDT/AED";

  const bestTrade = useMemo<BestTrade | null>(() => {
    if (!prices.length) return null;

    let bestResult: BestTrade | null = null;

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

    effectivePrices.forEach((buyOption) => {
      effectivePrices.forEach((sellOption) => {
        const profit = (sellOption.sellPrice - buyOption.buyPrice) * amount;
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
  }, [prices, amount, feeType]);

  const formatPrice = (price: number) => {
    return price.toLocaleString("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: isUSDT ? 5 : 2,
      maximumFractionDigits: isUSDT ? 5 : 2,
    });
  };

  const getInputConfig = () => {
    if (isUSDT) {
      return {
        min: 1000,
        step: 1000,
        precision: 0,
        defaultValue: 1000,
        label: "USDT Amount",
      };
    }
    return {
      min: 0.0001,
      step: 0.1,
      precision: 4,
      defaultValue: 1,
      label: "BTC Amount",
    };
  };

  const inputConfig = getInputConfig();

  return (
    <Box
      p={6}
      bg="white"
      borderRadius="xl"
      shadow="lg"
      borderWidth="2px"
      borderColor="#F7931A"
      _dark={{
        bg: "#1A1A1A",
        borderColor: "#F7931A",
      }}
    >
      <Flex justify="space-between" align="center" mb={6}>
        <Text
          fontSize="2xl"
          fontWeight="bold"
          color="#1A1A1A"
          _dark={{ color: "white" }}
        >
          Arbitrage Simulator
        </Text>
        <FormControl maxW="200px">
          <NumberInput
            value={amount}
            onChange={(_, value) => setAmount(value)}
            min={inputConfig.min}
            step={inputConfig.step}
            precision={inputConfig.precision}
            defaultValue={inputConfig.defaultValue}
          >
            <NumberInputField
              borderColor="#F7931A"
              _hover={{ borderColor: "#F7931A" }}
              _focus={{
                borderColor: "#F7931A",
                boxShadow: "0 0 0 1px #F7931A",
              }}
            />
            <NumberInputStepper>
              <NumberIncrementStepper borderColor="#F7931A" color="#F7931A" />
              <NumberDecrementStepper borderColor="#F7931A" color="#F7931A" />
            </NumberInputStepper>
          </NumberInput>
          <FormLabel fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            {inputConfig.label}
          </FormLabel>
        </FormControl>
      </Flex>

      {bestTrade && (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Box
            p={4}
            borderRadius="lg"
            bg="#F7FAFC"
            borderWidth="1px"
            borderColor="#009739"
            _dark={{
              bg: "#2D3748",
              borderColor: "#009739",
            }}
          >
            <Stat>
              <StatLabel color="#009739">Best Buy At</StatLabel>
              <StatNumber color="#009739">{bestTrade.buyExchange}</StatNumber>
              <StatHelpText color="#4A5568" _dark={{ color: "#A0AEC0" }}>
                {formatPrice(bestTrade.buyPrice)} / {isUSDT ? "USDT" : "BTC"}
              </StatHelpText>
            </Stat>
          </Box>

          <Box
            p={4}
            borderRadius="lg"
            bg="#F7FAFC"
            borderWidth="1px"
            borderColor="#CE1126"
            _dark={{
              bg: "#2D3748",
              borderColor: "#CE1126",
            }}
          >
            <Stat>
              <StatLabel color="#CE1126">Best Sell At</StatLabel>
              <StatNumber color="#CE1126">{bestTrade.sellExchange}</StatNumber>
              <StatHelpText color="#4A5568" _dark={{ color: "#A0AEC0" }}>
                {formatPrice(bestTrade.sellPrice)} / {isUSDT ? "USDT" : "BTC"}
              </StatHelpText>
            </Stat>
          </Box>

          <Box
            p={4}
            borderRadius="lg"
            bg="#F7FAFC"
            borderWidth="1px"
            borderColor={bestTrade.profit > 0 ? "#F7931A" : "gray.200"}
            _dark={{
              bg: "#2D3748",
              borderColor: bestTrade.profit > 0 ? "#F7931A" : "gray.700",
            }}
          >
            <Stat>
              <StatLabel
                color={bestTrade.profit > 0 ? "#F7931A" : "#4A5568"}
                _dark={{
                  color: bestTrade.profit > 0 ? "#F7931A" : "#A0AEC0",
                }}
              >
                Potential Profit
              </StatLabel>
              <StatNumber
                color={bestTrade.profit > 0 ? "#F7931A" : "#4A5568"}
                _dark={{
                  color: bestTrade.profit > 0 ? "#F7931A" : "#A0AEC0",
                }}
              >
                {formatPrice(bestTrade.profit)}
              </StatNumber>
              <StatHelpText color="#4A5568" _dark={{ color: "#A0AEC0" }}>
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
