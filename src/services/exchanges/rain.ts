import { ExchangePrice } from "../../types/exchange";
import { EXCHANGE_APIS } from "../../types/exchangeApis";

interface RainWebSocketMessage {
  name: string;
  data: {
    ts: number;
    bid_price: {
      amount: string;
    };
    ask_price: {
      amount: string;
    };
  };
}

class RainWebSocket {
  private static instance: RainWebSocket;
  private ws: WebSocket | null = null;
  private lastData: { bid: number; ask: number } = { bid: 0, ask: 0 };
  private connectionAttempts = 0;
  private readonly maxAttempts = 5;
  private readonly reconnectDelay = 3000;

  private constructor() {
    this.connect();
  }

  public static getInstance(): RainWebSocket {
    if (!RainWebSocket.instance) {
      RainWebSocket.instance = new RainWebSocket();
    }
    return RainWebSocket.instance;
  }

  private connect() {
    if (this.connectionAttempts >= this.maxAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    try {
      const config = EXCHANGE_APIS.rain;
      if (!config.wsUrl) {
        throw new Error("WebSocket URL not configured for Rain");
      }

      this.ws = new WebSocket(config.wsUrl);

      this.ws.onopen = () => {
        console.log("Connected to Rain WebSocket");
        this.connectionAttempts = 0;
        this.subscribe();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as RainWebSocketMessage;
          if (data.name === "productSummary") {
            this.lastData = {
              bid: parseFloat(data.data.bid_price.amount),
              ask: parseFloat(data.data.ask_price.amount),
            };
          }
        } catch (error) {
          console.error("Error processing Rain WebSocket message:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("Rain WebSocket connection closed");
        this.connectionAttempts++;
        setTimeout(() => this.connect(), this.reconnectDelay);
      };

      this.ws.onerror = (error) => {
        console.error("Rain WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error creating Rain WebSocket:", error);
      this.connectionAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  private subscribe() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const subscribeMessage = {
        name: "productSummary subscribe",
        data: "BTC-AED",
      };
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  public getLastData(): { bid: number; ask: number } {
    return this.lastData;
  }
}

export async function fetchRainPrice(): Promise<ExchangePrice> {
  try {
    const wsInstance = RainWebSocket.getInstance();
    const { bid, ask } = wsInstance.getLastData();

    if (bid === 0 || ask === 0) {
      throw new Error("No valid price data available from Rain WebSocket");
    }

    // Use the average of bid and ask as the main price
    const price = (bid + ask) / 2;

    return {
      exchange: "Rain",
      price: price,
      bid: bid,
      ask: ask,
      pair: "BTC/AED",
      lastUpdated: new Date().toISOString(),
      change24h: 0, // WebSocket doesn't provide this data
      volume24h: 0, // WebSocket doesn't provide this data
    };
  } catch (error) {
    console.error("Rain WebSocket Error:", error);
    throw error;
  }
}
