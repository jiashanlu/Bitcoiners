import { ExchangePrice, TradingPair } from "../types/exchange";

type PriceUpdateCallback = (prices: ExchangePrice[]) => void;

interface WebSocketMessage {
  pair: TradingPair;
  prices: ExchangePrice[];
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private callbacks: Map<TradingPair, Set<PriceUpdateCallback>> = new Map();
  private readonly wsUrl: string;
  private currentVolume: number = 0;
  private currentPair: TradingPair = "BTC/AED";

  constructor() {
    // Use environment variable for WebSocket URL with fallback to current host
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (wsUrl && wsUrl.startsWith('wss://')) {
      // Production: Use the configured WebSocket URL
      this.wsUrl = wsUrl;
    } else {
      // Development: Use relative path from current host
      const baseUrl = window.location.origin.replace(/^http/, "ws");
      this.wsUrl = baseUrl.endsWith("/ws") ? baseUrl : `${baseUrl}/ws`;
    }

    console.log("Initializing WebSocket with URL:", this.wsUrl);
    this.connect();

    // Initialize callback sets for both pairs
    this.callbacks.set("BTC/AED", new Set());
    this.callbacks.set("USDT/AED", new Set());
  }

  private connect() {
    // Always try to connect

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
          const message = JSON.parse(event.data);
          console.log("Received message:", message);

          if (message.type === "priceUpdate" && Array.isArray(message.payload)) {
              this.notifySubscribers("BTC/AED", message.payload);
          } else if (message.pair && Array.isArray(message.prices)) {
            this.notifySubscribers(message.pair, message.prices);
          }
        } catch (error) {
          console.error("Error processing WebSocket message:", error);
          console.error("Raw message:", event.data);
        }
      };

      this.ws.onclose = () => {
        console.log("WebSocket connection closed");
        this.scheduleReconnect();
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
    const delay = Math.min(
      1000 * Math.pow(2, Math.min(this.reconnectAttempts, 6)),
      30000
    );
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
