import React from "react";
import {
  Box,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Flex,
  Switch,
  Text,
  HStack,
} from "@chakra-ui/react";
import { websocketService } from "../services/websocketService";

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
            Volume (AED)
          </FormLabel>
          <NumberInput
            min={0}
            step={10000}
            value={volume}
            onChange={(_, value) => handleVolumeChange(value)}
            size="sm"
          >
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
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
