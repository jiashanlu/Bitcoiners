import React, { useState, useEffect, useMemo } from "react";
import { Box, Container, Text, Flex, VStack, Select } from "@chakra-ui/react";
import { PriceCard } from "../components/PriceCard";
import { VolumeSelector } from "../components/VolumeSelector";
import { TradeSimulator } from "../components/TradeSimulator";
import { ExchangePrice } from "../types/exchange";
import { websocketService } from "../services/websocketService";

type TradingPair = "BTC/AED" | "USDT/AED";

interface PriceTrackerState {
  prices: ExchangePrice[];
  isLoading: boolean;
  error: Error | null;
  tradingVolume: number;
  feeType: "maker" | "taker";
  showFeeSpread: boolean;
  selectedPair: TradingPair;
}

const initialState: PriceTrackerState = {
  prices: [],
  isLoading: true,
  error: null,
  tradingVolume: 0,
  feeType: "taker",
  showFeeSpread: true,
  selectedPair: "BTC/AED",
};

export const PriceTracker: React.FC = () => {
  const [state, setState] = useState<PriceTrackerState>(initialState);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = websocketService.subscribe(
      state.selectedPair,
      (newPrices: ExchangePrice[]) => {
        if (mounted) {
          // Filter out Rain prices for USDT/AED
          const filteredPrices =
            state.selectedPair === "USDT/AED"
              ? newPrices.filter((price) => price.exchange !== "Rain")
              : newPrices;

          setState((prev) => ({
            ...prev,
            prices: filteredPrices,
            isLoading: false,
          }));
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [state.selectedPair]);

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

  const handlePairChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newPair = event.target.value as TradingPair;
    setState((prev) => ({
      ...prev,
      selectedPair: newPair,
      isLoading: true, // Show loading while switching pairs
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
        <Box
          p={8}
          textAlign="center"
          bg="white"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="#F7931A"
          _dark={{
            bg: "#1A1A1A",
            borderColor: "#F7931A",
          }}
        >
          <Text fontSize="xl" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            Loading exchange prices...
          </Text>
        </Box>
      </Container>
    );
  }

  if (state.error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box
          p={8}
          textAlign="center"
          bg="white"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="#CE1126"
          _dark={{
            bg: "#1A1A1A",
            borderColor: "#CE1126",
          }}
        >
          <Text fontSize="xl" color="#CE1126">
            Error loading prices. Please try again later.
          </Text>
          <Text mt={2} color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            {state.error.message}
          </Text>
        </Box>
      </Container>
    );
  }

  // Create array of exchanges to display, including Rain with "Pair not available" for USDT/AED
  const displayPrices =
    state.selectedPair === "USDT/AED"
      ? [
          ...state.prices,
          {
            exchange: "Rain",
            price: 0,
            bid: 0,
            ask: 0,
            pair: state.selectedPair,
            lastUpdated: new Date().toISOString(),
            change24h: 0,
            volume24h: 0,
            fees: { maker: 0, taker: 0 },
          },
        ]
      : state.prices;

  return (
    <Box
      bg="#F7FAFC"
      minH="calc(100vh - 73px)"
      _dark={{
        bg: "#1A1A1A",
      }}
    >
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          <Text
            fontSize="lg"
            color="#4A5568"
            _dark={{ color: "#A0AEC0" }}
            textAlign="center"
          >
            UAE Exchange Price Comparison
          </Text>

          <Flex justifyContent="center" mb={4}>
            <Select
              value={state.selectedPair}
              onChange={handlePairChange}
              width="200px"
              bg="white"
              _dark={{
                bg: "#2D3748",
                color: "white",
              }}
            >
              <option value="BTC/AED">BTC/AED</option>
              <option value="USDT/AED">USDT/AED</option>
            </Select>
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
                background: "#F7FAFC",
                borderRadius: "4px",
                _dark: {
                  background: "#2D3748",
                },
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#F7931A",
                borderRadius: "4px",
                "&:hover": {
                  background: "#E68308",
                },
              },
            }}
          >
            <Flex gap={4}>
              {displayPrices.map((price: ExchangePrice) => (
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
            <TradeSimulator prices={state.prices} feeType={state.feeType} />
          </Box>
        </VStack>
      </Container>
    </Box>
  );
};
