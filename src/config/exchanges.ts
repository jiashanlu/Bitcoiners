import { ExchangeData } from "../types/exchange";

export const exchanges: ExchangeData[] = [
  {
    id: "bitoasis",
    name: "BitOasis",
    logo: "/images/bitoasis-logo.png",
    pairs: ["BTC-AED", "BTC-USD"],
  },
  {
    id: "rain",
    name: "Rain",
    logo: "/images/rain-logo.png",
    pairs: ["BTC/AED", "BTC/USD"],
  },
  // Add more exchanges as needed
];
