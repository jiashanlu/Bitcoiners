import { ExchangePrice } from "../../types/exchange";
import { EXCHANGE_APIS } from "../../types/exchangeApis";

interface MultibankOrderBookData {
  bids: [number, number][]; // [price, amount][]
  asks: [number, number][]; // [price, amount][]
}

interface MultibankSuccessMessage {
  method: "stream";
  event: string;
  data: MultibankOrderBookData;
}

interface MultibankErrorMessage {
  method: string;
  status: "error";
  message: string;
}

type MultibankWebSocketMessage =
  | MultibankSuccessMessage
  | MultibankErrorMessage;

class MultibankWebSocket {
  private static instance: MultibankWebSocket;
  private ws: WebSocket | null = null;
  private lastData: { bid: number; ask: number } = { bid: 0, ask: 0 };
  private connectionAttempts = 0;
  private readonly maxAttempts = 5;
  private readonly reconnectDelay = 3000;
  private isSubscribed = false;

  private constructor() {
    this.connect();
  }

  public static getInstance(): MultibankWebSocket {
    if (!MultibankWebSocket.instance) {
      MultibankWebSocket.instance = new MultibankWebSocket();
    }
    return MultibankWebSocket.instance;
  }

  private connect() {
    if (this.connectionAttempts >= this.maxAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    try {
      const config = EXCHANGE_APIS.multibank;
      if (!config.wsUrl) {
        throw new Error("WebSocket URL not configured for Multibank");
      }

      this.ws = new WebSocket(config.wsUrl);

      this.ws.onopen = () => {
        console.log("Connected to Multibank WebSocket");
        this.connectionAttempts = 0;
        this.isSubscribed = false;
        this.subscribe();
      };

      this.ws.onmessage = (event) => {
        try {
          console.log("=== Multibank Raw WebSocket Message ===");
          console.log("Raw data:", event.data);
          try {
            const prettyJson = JSON.stringify(JSON.parse(event.data), null, 2);
            console.log("Parsed JSON:", prettyJson);
          } catch {
            console.log("Message is not JSON formatted");
          }
          console.log("=====================================");

          const data = JSON.parse(event.data) as MultibankWebSocketMessage;

          // Handle error messages
          if ("status" in data && data.status === "error") {
            console.error("Multibank WebSocket error:", data.message);
            return;
          }

          // Handle stream data
          if (
            data.method === "stream" &&
            "data" in data &&
            data.event === "OB.BTC_AED"
          ) {
            console.log("Received orderbook data:", data);

            if (data.data?.bids?.length > 0 && data.data?.asks?.length > 0) {
              const firstBid = data.data.bids[0];
              const lastAsk = data.data.asks[data.data.asks.length - 1];

              console.log("Processing prices:", {
                firstBid,
                lastAsk,
                bidPrice: firstBid ? firstBid[0] : null,
                askPrice: lastAsk ? lastAsk[0] : null,
              });

              if (firstBid && lastAsk) {
                const bidPrice = firstBid[0]; // Already a number
                const askPrice = lastAsk[0]; // Already a number

                if (!isNaN(bidPrice) && !isNaN(askPrice)) {
                  this.lastData = {
                    bid: bidPrice,
                    ask: askPrice,
                  };
                  console.log("Updated prices:", this.lastData);
                } else {
                  console.error("Invalid price format:", { firstBid, lastAsk });
                }
              }
            }
          }
        } catch (error) {
          console.error("Error processing message:", error);
          console.error("Problematic message:", event.data);
        }
      };

      this.ws.onclose = () => {
        console.log("Multibank WebSocket connection closed");
        this.isSubscribed = false;
        this.connectionAttempts++;
        setTimeout(() => this.connect(), this.reconnectDelay);
      };

      this.ws.onerror = (error) => {
        console.error("Multibank WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error creating Multibank WebSocket:", error);
      this.connectionAttempts++;
      setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  private subscribe() {
    if (this.ws?.readyState === WebSocket.OPEN && !this.isSubscribed) {
      const subscribeMessage = {
        method: "subscribe",
        events: ["OB.BTC_AED"], // Changed to use events array
      };
      console.log("Sending subscription message:", subscribeMessage);
      this.ws.send(JSON.stringify(subscribeMessage));
    }
  }

  public getLastData(): { bid: number; ask: number } {
    return this.lastData;
  }
}

export async function fetchMultibankPrice(): Promise<ExchangePrice> {
  try {
    const wsInstance = MultibankWebSocket.getInstance();
    const { bid, ask } = wsInstance.getLastData();

    if (bid === 0 || ask === 0) {
      throw new Error("No valid price data available from Multibank WebSocket");
    }

    // Use the average of bid and ask as the main price
    const price = (bid + ask) / 2;

    return {
      exchange: "Multibank",
      price: price,
      bid: bid,
      ask: ask,
      pair: "BTC/AED",
      lastUpdated: new Date().toISOString(),
      change24h: 0,
      volume24h: 0,
    };
  } catch (error) {
    console.error("Multibank WebSocket Error:", error);
    throw error;
  }
}
