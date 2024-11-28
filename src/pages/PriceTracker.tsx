import React, { useState, useEffect } from "react";
import { Box, Grid, Container, Heading, Text } from "@chakra-ui/react";
import { PriceCard } from "../components/PriceCard";
import { ExchangePrice } from "../types/exchange";
import { websocketService } from "../services/websocketService";

interface PriceTrackerState {
  prices: ExchangePrice[];
  isLoading: boolean;
  error: Error | null;
}

const initialState: PriceTrackerState = {
  prices: [],
  isLoading: true,
  error: null,
};

export const PriceTracker: React.FC = () => {
  const [state, setState] = useState<PriceTrackerState>(initialState);

  useEffect(() => {
    let mounted = true;

    // Subscribe to WebSocket updates
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

    // Cleanup on unmount
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

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
    <Container maxW="container.xl" py={8}>
      <Heading mb={8} textAlign="center">
        UAE Bitcoin Exchange Prices
      </Heading>

      {state.prices && state.prices.length > 0 ? (
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          }}
          gap={6}
        >
          {state.prices.map((price: ExchangePrice) => (
            <div key={price.exchange}>
              <PriceCard data={price} />
            </div>
          ))}
        </Grid>
      ) : (
        <Box p={8} textAlign="center">
          <Text fontSize="xl">No price data available</Text>
        </Box>
      )}
    </Container>
  );
};
