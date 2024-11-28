import { ExchangePrice } from "../types/exchange";

type PriceUpdateCallback = (prices: ExchangePrice[]) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: number = 3000;
  private maxReconnectAttempts: number = 5;
  private reconnectAttempts: number = 0;
  private callbacks: Set<PriceUpdateCallback> = new Set();
  private readonly wsUrl: string;
  private currentVolume: number = 0;

  constructor() {
    // Use environment variable for WebSocket URL or fallback to IP address
    this.wsUrl = import.meta.env.VITE_WS_URL || "ws://192.168.4.59:3001";
    this.connect();
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
        // Send current volume on reconnect if it exists
        if (this.currentVolume > 0) {
          this.updateVolume(this.currentVolume);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const prices = JSON.parse(event.data);
          this.notifySubscribers(prices);
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

  private notifySubscribers(prices: ExchangePrice[]) {
    this.callbacks.forEach((callback) => {
      try {
        callback(prices);
      } catch (error) {
        console.error("Error in subscriber callback:", error);
      }
    });
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

  subscribe(callback: PriceUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
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
