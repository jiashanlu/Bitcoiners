import { useQuery } from "react-query";
import { Box, Grid, Container, Heading, Text } from "@chakra-ui/react";
import { PriceCard } from "../components/PriceCard";
import { priceService } from "../services/priceService";

export const PriceTracker = () => {
  const {
    data: prices,
    isLoading,
    error,
  } = useQuery(
    "prices",
    priceService.fetchPrices,
    { refetchInterval: 30000 } // Refetch every 30 seconds
  );

  if (isLoading) {
    return <Box p={8}>Loading...</Box>;
  }

  if (error) {
    return <Box p={8}>Error loading prices</Box>;
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading mb={8} textAlign="center">
        UAE Bitcoin Exchange Prices
      </Heading>

      <Grid
        templateColumns={{
          base: "1fr",
          md: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        }}
        gap={6}
      >
        {prices?.map((price) => (
          <PriceCard key={price.exchange} data={price} />
        ))}
      </Grid>
    </Container>
  );
};
