import { ExchangePrice } from "../../types/fees";

export interface BaseExchange {
  fetchPrice(): Promise<ExchangePrice | null>;
  getName(): string;
  getDefaultFees(): { maker: number; taker: number };
  getFeesByVolume(volume: number): { maker: number; taker: number };
}

export abstract class AbstractExchange implements BaseExchange {
  protected constructor(protected readonly name: string) {}

  abstract fetchPrice(): Promise<ExchangePrice | null>;

  getName(): string {
    return this.name;
  }

  abstract getDefaultFees(): { maker: number; taker: number };
  abstract getFeesByVolume(volume: number): { maker: number; taker: number };

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
