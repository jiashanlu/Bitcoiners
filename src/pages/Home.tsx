import React from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Button,
  Flex,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      bg="#F7FAFC"
      minH="calc(100vh - 73px)"
      _dark={{
        bg: "#1A1A1A",
      }}
    >
      <Container maxW="container.xl" py={20}>
        <VStack spacing={8} align="center">
          <VStack spacing={4} textAlign="center">
            <Heading size="2xl" color="#F7931A" letterSpacing="tight">
              Welcome to Bitcoiners
            </Heading>
            <Text
              fontSize="xl"
              color="#4A5568"
              _dark={{ color: "#A0AEC0" }}
              maxW="2xl"
            >
              Your comprehensive platform for Bitcoin services and information
              in the UAE
            </Text>
          </VStack>

          <Flex gap={6} mt={8}>
            <Button
              size="lg"
              bg="#F7931A"
              color="white"
              _hover={{ bg: "#E68308" }}
              onClick={() => navigate("/price-tracker")}
            >
              Price Tracker
            </Button>
            <Button
              size="lg"
              bg="#F7931A"
              color="white"
              _hover={{ bg: "#E68308" }}
              onClick={() => navigate("/bitcoin-uae-map")}
            >
              Bitcoin UAE Map
            </Button>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
};
