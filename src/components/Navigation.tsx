import React from "react";
import { Box, Flex, Link, Heading, Container } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";

export const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <Box
      bg="white"
      borderBottom="1px solid"
      borderColor="#F7931A"
      _dark={{
        bg: "#1A1A1A",
        borderColor: "#F7931A",
      }}
    >
      <Container maxW="container.xl">
        <Flex py={4} justify="space-between" align="center">
          <Link as={RouterLink} to="/" _hover={{ textDecoration: "none" }}>
            <Heading size="lg" color="#F7931A" letterSpacing="tight">
              Bitcoiners
            </Heading>
          </Link>

          <Flex gap={6}>
            <Link
              as={RouterLink}
              to="/price-tracker"
              color={
                location.pathname === "/price-tracker" ? "#F7931A" : "#4A5568"
              }
              fontWeight={
                location.pathname === "/price-tracker" ? "bold" : "normal"
              }
              _hover={{ color: "#F7931A" }}
              _dark={{
                color:
                  location.pathname === "/price-tracker"
                    ? "#F7931A"
                    : "#A0AEC0",
              }}
            >
              Price Tracker
            </Link>
            <Link
              as={RouterLink}
              to="/bitcoin-uae-map"
              color={
                location.pathname === "/bitcoin-uae-map" ? "#F7931A" : "#4A5568"
              }
              fontWeight={
                location.pathname === "/bitcoin-uae-map" ? "bold" : "normal"
              }
              _hover={{ color: "#F7931A" }}
              _dark={{
                color:
                  location.pathname === "/bitcoin-uae-map"
                    ? "#F7931A"
                    : "#A0AEC0",
              }}
            >
              Bitcoin UAE Map
            </Link>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
};
