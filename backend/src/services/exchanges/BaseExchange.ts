import { ExchangePrice } from "../../types/fees";

export type TradingPair = "BTC/AED" | "USDT/AED";

export interface BaseExchange {
  fetchPrice(pair: TradingPair): Promise<ExchangePrice | null>;
  getName(): string;
  getDefaultFees(): { maker: number; taker: number };
  getFeesByVolume(volume: number): { maker: number; taker: number };
  start?(): Promise<void>; // Optional method for WebSocket-based exchanges
  stop?(): Promise<void>; // Optional method for WebSocket-based exchanges
}

export abstract class AbstractExchange implements BaseExchange {
  protected constructor(protected readonly name: string) {}

  abstract fetchPrice(pair: TradingPair): Promise<ExchangePrice | null>;

  getName(): string {
    return this.name;
  }

  abstract getDefaultFees(): { maker: number; taker: number };
  abstract getFeesByVolume(volume: number): { maker: number; taker: number };

  // Optional WebSocket lifecycle methods
  async start?(): Promise<void> {}
  async stop?(): Promise<void> {}

  protected formatPrice(
    rawPrice: Omit<ExchangePrice, "fees">,
    volume: number = 0
  ): ExchangePrice {
    // Get fees based on volume
    const fees =
      volume > 0 ? this.getFeesByVolume(volume) : this.getDefaultFees();

    return {
      ...rawPrice,
      fees,
      // Send raw prices - fee calculation will happen on frontend
      bid: rawPrice.bid,
      ask: rawPrice.ask,
      price: (rawPrice.bid + rawPrice.ask) / 2,
    };
  }
}
