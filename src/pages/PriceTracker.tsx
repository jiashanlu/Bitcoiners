import { useQuery } from "react-query";
import { Box, Grid, Container, Heading, Text } from "@chakra-ui/react";
import { PriceCard } from "../components/PriceCard";
import { priceService } from "../services/priceService";
import { ExchangePrice } from "../types/exchange";

export const PriceTracker = () => {
  const {
    data: prices,
    isLoading,
    error,
    isError,
  } = useQuery("prices", () => priceService.fetchPrices(), {
    refetchInterval: 30000,
    retry: 3,
    retryDelay: 2000,
    onError: (error: any) => {
      console.error("Query error:", error);
    },
  });

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box p={8} textAlign="center">
          <Text fontSize="xl">Loading exchange prices...</Text>
        </Box>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box p={8} textAlign="center">
          <Text fontSize="xl" color="red.500">
            Error loading prices. Please try again later.
          </Text>
          {error instanceof Error && (
            <Text mt={2} color="gray.600">
              {error.message}
            </Text>
          )}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8} textAlign="center">
        UAE Bitcoin Exchange Prices
      </Heading>

      {prices && prices.length > 0 ? (
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          }}
          gap={6}
        >
          {prices.map((price: ExchangePrice) => (
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
