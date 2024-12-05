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
      borderColor="gray.100"
    >
      <Flex gap={6} wrap={{ base: "wrap", md: "nowrap" }} align="center">
        <FormControl flex="1" minW={{ base: "full", md: "200px" }}>
          <FormLabel fontSize="sm" color="gray.600">
            30-Day Trading Volume
          </FormLabel>
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600" flex="1">
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
                >
                  ▼
                </Button>
              </Tooltip>
            </Flex>
          </Flex>
        </FormControl>

        <FormControl flex="2" minW={{ base: "full", md: "200px" }}>
          <FormLabel fontSize="sm" color="gray.600">
            Fee Type
          </FormLabel>
          <Select
            value={feeType}
            onChange={(e) =>
              onFeeTypeChange(e.target.value as "maker" | "taker")
            }
            size="sm"
          >
            <option value="maker">Maker - Limit Orders (Lower Fees)</option>
            <option value="taker">Taker - Market Orders (Higher Fees)</option>
          </Select>
        </FormControl>

        <HStack spacing={4} flex="1" justify="flex-end">
          <Text fontSize="sm" color="gray.600">
            Include Fees in Spread
          </Text>
          <Switch
            isChecked={showFeeSpread}
            onChange={onToggleFeeSpread}
            colorScheme="purple"
            size="md"
          />
        </HStack>
      </Flex>
    </Box>
  );
};
