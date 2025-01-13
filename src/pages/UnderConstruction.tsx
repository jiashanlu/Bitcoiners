import React from "react";
import { Box, Container, Heading, Text, VStack } from "@chakra-ui/react";

export const UnderConstruction: React.FC = () => {
  return (
    <Box
      bg="#F7FAFC"
      minH="100vh"
      _dark={{
        bg: "#1A1A1A",
      }}
    >
      <Container maxW="container.xl" py={20}>
        <VStack spacing={6} align="center">
          <Heading size="xl" color="#F7931A" letterSpacing="tight">
            Coming Soon
          </Heading>
          <Text
            fontSize="lg"
            color="#4A5568"
            _dark={{ color: "#A0AEC0" }}
            textAlign="center"
          >
            This section is under construction. Please check back later.
          </Text>
        </VStack>
      </Container>
    </Box>
  );
};
