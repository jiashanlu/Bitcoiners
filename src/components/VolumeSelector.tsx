import React from "react";
import {
  Box,
  FormControl,
  FormLabel,
  Select,
  Flex,
  Switch,
  Text,
  HStack,
  Button,
  Tooltip,
} from "@chakra-ui/react";
import { websocketService } from "../services/websocketService";
import {
  formatVolume,
  getNextVolumeTier,
  getPreviousVolumeTier,
  getAllVolumeTiers,
} from "../utils/volumeUtils";

interface VolumeSelectorProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  feeType: "maker" | "taker";
  onFeeTypeChange: (type: "maker" | "taker") => void;
  showFeeSpread: boolean;
  onToggleFeeSpread: () => void;
}

export const VolumeSelector: React.FC<VolumeSelectorProps> = ({
  volume,
  onVolumeChange,
  feeType,
  onFeeTypeChange,
  showFeeSpread,
  onToggleFeeSpread,
}) => {
  const handleVolumeChange = (value: number) => {
    onVolumeChange(value);
    websocketService.updateVolume(value);
  };

  const handleVolumeIncrement = () => {
    const nextTier = getNextVolumeTier(volume);
    handleVolumeChange(nextTier);
  };

  const handleVolumeDecrement = () => {
    const prevTier = getPreviousVolumeTier(volume);
    handleVolumeChange(prevTier);
  };

  const allTiers = getAllVolumeTiers();
  const isMaxVolume = volume >= Math.max(...allTiers);
  const isMinVolume = volume <= 0;

  return (
    <Box
      p={4}
      bg="white"
      borderRadius="xl"
      shadow="sm"
      mb={6}
      borderWidth="1px"
      borderColor="#F7931A"
      _dark={{
        bg: "#1A1A1A",
        borderColor: "#F7931A",
      }}
    >
      <Flex gap={6} wrap={{ base: "wrap", md: "nowrap" }} align="center">
        <FormControl flex="1" minW={{ base: "full", md: "200px" }}>
          <FormLabel fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            30-Day Trading Volume
          </FormLabel>
          <Flex align="center" gap={2}>
            <Text
              fontSize="sm"
              color="#4A5568"
              _dark={{ color: "#A0AEC0" }}
              flex="1"
            >
              {formatVolume(volume)} AED
            </Text>
            <Flex direction="column" gap={1}>
              <Tooltip
                label={isMaxVolume ? "Maximum volume reached" : "Next tier"}
              >
                <Button
                  size="xs"
                  onClick={handleVolumeIncrement}
                  isDisabled={isMaxVolume}
                  p={0}
                  minW="24px"
                  h="24px"
                  aria-label="Increase to next tier"
                  bg="#F7931A"
                  color="white"
                  _hover={{ bg: "#E68308" }}
                  _active={{ bg: "#D67307" }}
                  _disabled={{
                    bg: "#4A5568",
                    opacity: 0.6,
                    _dark: { bg: "#2D3748" },
                  }}
                >
                  ▲
                </Button>
              </Tooltip>
              <Tooltip
                label={isMinVolume ? "Minimum volume reached" : "Previous tier"}
              >
                <Button
                  size="xs"
                  onClick={handleVolumeDecrement}
                  isDisabled={isMinVolume}
                  p={0}
                  minW="24px"
                  h="24px"
                  aria-label="Decrease to previous tier"
                  bg="#F7931A"
                  color="white"
                  _hover={{ bg: "#E68308" }}
                  _active={{ bg: "#D67307" }}
                  _disabled={{
                    bg: "#4A5568",
                    opacity: 0.6,
                    _dark: { bg: "#2D3748" },
                  }}
                >
                  ▼
                </Button>
              </Tooltip>
            </Flex>
          </Flex>
        </FormControl>

        <FormControl flex="2" minW={{ base: "full", md: "200px" }}>
          <FormLabel fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            Fee Type
          </FormLabel>
          <Select
            value={feeType}
            onChange={(e) =>
              onFeeTypeChange(e.target.value as "maker" | "taker")
            }
            size="sm"
            borderColor="#F7931A"
            _hover={{ borderColor: "#F7931A" }}
            _focus={{ borderColor: "#F7931A", boxShadow: "0 0 0 1px #F7931A" }}
            color="#1A1A1A"
            _dark={{ color: "white" }}
          >
            <option value="maker">Maker - Limit Orders (Lower Fees)</option>
            <option value="taker">Taker - Market Orders (Higher Fees)</option>
          </Select>
        </FormControl>

        <HStack spacing={4} flex="1" justify="flex-end">
          <Text fontSize="sm" color="#4A5568" _dark={{ color: "#A0AEC0" }}>
            Include Fees in Spread
          </Text>
          <Switch
            isChecked={showFeeSpread}
            onChange={onToggleFeeSpread}
            colorScheme="orange"
            size="md"
            sx={{
              "& .chakra-switch__track[data-checked]": {
                backgroundColor: "#F7931A",
              },
              "& .chakra-switch__thumb": {
                backgroundColor: "white",
              },
            }}
          />
        </HStack>
      </Flex>
    </Box>
  );
};
