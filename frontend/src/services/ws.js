// Placeholder for WebSocket configuration
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
  }

  connect() {
    this.ws = new WebSocket(WS_BASE_URL);
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach(listener => listener(data));
    };
    this.ws.onclose = () => {
      console.log('WS disconnected. Reconnecting...');
      setTimeout(() => this.connect(), 3000);
    };
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const wsService = new WebSocketService();
