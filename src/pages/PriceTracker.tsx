import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  VStack,
  Image,
} from "@chakra-ui/react";
import { PriceCard } from "../components/PriceCard";
import { VolumeSelector } from "../components/VolumeSelector";
import { TradeSimulator } from "../components/TradeSimulator";
import { ExchangePrice } from "../types/exchange";
import { websocketService } from "../services/websocketService";

interface PriceTrackerState {
  prices: ExchangePrice[];
  isLoading: boolean;
  error: Error | null;
  tradingVolume: number;
  feeType: "maker" | "taker";
  showFeeSpread: boolean;
}

const initialState: PriceTrackerState = {
  prices: [],
  isLoading: true,
  error: null,
  tradingVolume: 0,
  feeType: "taker",
  showFeeSpread: true,
};

export const PriceTracker: React.FC = () => {
  const [state, setState] = useState<PriceTrackerState>(initialState);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = websocketService.subscribe(
      (newPrices: ExchangePrice[]) => {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            prices: newPrices,
            isLoading: false,
          }));
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const { bestBid, bestAsk } = useMemo(() => {
    if (!state.prices.length) return { bestBid: null, bestAsk: null };

    const currentFeeType = state.feeType;

    let bestBidPrice = -Infinity;
    let bestAskPrice = Infinity;
    let bestBidExchange = "";
    let bestAskExchange = "";

    state.prices.forEach((price) => {
      const fee =
        currentFeeType === "maker" ? price.fees.maker : price.fees.taker;
      const effectiveBid = price.bid * (1 - fee);
      const effectiveAsk = price.ask * (1 + fee);

      if (effectiveBid > bestBidPrice) {
        bestBidPrice = effectiveBid;
        bestBidExchange = price.exchange;
      }

      if (effectiveAsk < bestAskPrice) {
        bestAskPrice = effectiveAsk;
        bestAskExchange = price.exchange;
      }
    });

    return {
      bestBid: bestBidExchange,
      bestAsk: bestAskExchange,
    };
  }, [state.prices, state.feeType, state.tradingVolume]);

  const handleVolumeChange = (volume: number) => {
    setState((prev) => ({
      ...prev,
      tradingVolume: volume,
    }));
  };

  const handleFeeTypeChange = (type: "maker" | "taker") => {
    setState((prev) => ({
      ...prev,
      feeType: type,
    }));
  };

  const toggleFeeSpread = () => {
    setState((prev) => ({
      ...prev,
      showFeeSpread: !prev.showFeeSpread,
    }));
  };

  if (state.isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box p={8} textAlign="center">
          <Text fontSize="xl">Loading exchange prices...</Text>
        </Box>
      </Container>
    );
  }

  if (state.error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box p={8} textAlign="center">
          <Text fontSize="xl" color="red.500">
            Error loading prices. Please try again later.
          </Text>
          <Text mt={2} color="gray.600">
            {state.error.message}
          </Text>
        </Box>
      </Container>
    );
  }

  return (
    <Box bg="gray.50" minH="100vh">
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Flex justify="center" align="center" direction="column" mb={4}>
            <Heading
              size="lg"
              bgGradient="linear(to-r, blue.500, purple.500)"
              bgClip="text"
              letterSpacing="tight"
            >
              Bitcoiners.ae
            </Heading>
            <Text color="gray.600" fontSize="md" mt={2}>
              UAE Bitcoin Exchange Price Comparison
            </Text>
          </Flex>

          <VolumeSelector
            volume={state.tradingVolume}
            onVolumeChange={handleVolumeChange}
            feeType={state.feeType}
            onFeeTypeChange={handleFeeTypeChange}
            showFeeSpread={state.showFeeSpread}
            onToggleFeeSpread={toggleFeeSpread}
          />

          <Box
            overflowX="auto"
            pb={4}
            sx={{
              "&::-webkit-scrollbar": {
                height: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: "#f1f1f1",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#888",
                borderRadius: "4px",
                "&:hover": {
                  background: "#666",
                },
              },
            }}
          >
            <Flex gap={4}>
              {state.prices.map((price: ExchangePrice) => (
                <Box key={price.exchange} minW="300px">
                  <PriceCard
                    data={price}
                    feeType={state.feeType}
                    volume={state.tradingVolume}
                    isBestBid={price.exchange === bestBid}
                    isBestAsk={price.exchange === bestAsk}
                    showFeeSpread={state.showFeeSpread}
                  />
                </Box>
              ))}
            </Flex>
          </Box>

          <Box>
            <TradeSimulator
              prices={state.prices}
              volume={state.tradingVolume}
              feeType={state.feeType}
            />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};
