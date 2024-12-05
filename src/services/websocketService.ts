import { ExchangePrice, TradingPair } from "../types/exchange";

type PriceUpdateCallback = (prices: ExchangePrice[]) => void;

interface WebSocketMessage {
  pair: TradingPair;
  prices: ExchangePrice[];
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number = 3000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private callbacks: Map<TradingPair, Set<PriceUpdateCallback>> = new Map();
  private readonly wsUrl: string;
  private currentVolume: number = 0;
  private currentPair: TradingPair = "BTC/AED";

  constructor() {
    // Use environment variable for WebSocket URL or fallback to IP address
    this.wsUrl = import.meta.env.VITE_WS_URL || "ws://192.168.4.59:3001";
    this.connect();

    // Initialize callback sets for both pairs
    this.callbacks.set("BTC/AED", new Set());
    this.callbacks.set("USDT/AED", new Set());
  }

  private connect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    try {
      console.log(`Connecting to WebSocket at ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log("Connected to price WebSocket");
        this.reconnectAttempts = 0;
        // Send current volume and pair on reconnect if they exist
        if (this.currentVolume > 0) {
          this.updateVolume(this.currentVolume);
        }
        this.updatePair(this.currentPair);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log("Received message:", message);

          if (message.pair && Array.isArray(message.prices)) {
            this.notifySubscribers(message.pair, message.prices);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          console.error("Raw message:", event.data);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket connection closed");
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );
    setTimeout(() => this.connect(), delay);
  }

  private notifySubscribers(pair: TradingPair, prices: ExchangePrice[]) {
    const pairCallbacks = this.callbacks.get(pair);
    if (pairCallbacks) {
      pairCallbacks.forEach((callback) => {
        try {
          callback(prices);
        } catch (error) {
          console.error("Error in subscriber callback:", error);
        }
      });
    }
  }

  updateVolume(volume: number) {
    this.currentVolume = volume;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "volume_update",
          volume: volume,
        })
      );
    }
  }

  updatePair(pair: TradingPair) {
    this.currentPair = pair;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "pair_update",
          pair: pair,
        })
      );
    }
  }

  subscribe(pair: TradingPair, callback: PriceUpdateCallback): () => void {
    const callbacks = this.callbacks.get(pair);
    if (callbacks) {
      callbacks.add(callback);
    }

    // Send current pair to server when subscribing
    this.updatePair(pair);

    return () => {
      const callbacks = this.callbacks.get(pair);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
