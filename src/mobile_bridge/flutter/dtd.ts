import WebSocket from "ws";

export class DtdClient {
  private ws: WebSocket | null = null;
  private requestId = 1;

  constructor(private uri: string) {}

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.uri);

      this.ws.on("open", () => resolve());
      this.ws.on("error", (err) => reject(err));
    });
  }

  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("DTD client is not connected.");
    }

    const id = this.requestId++;
    const payload = JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    });

    return new Promise((resolve, reject) => {
      const handler = (data: WebSocket.Data) => {
        try {
          const res = JSON.parse(data.toString());
          if (res.id === id) {
            this.ws?.off("message", handler);
            if (res.error) {
              reject(new Error(res.error.message || "DTD Call Error"));
            } else {
              resolve(res.result);
            }
          }
        } catch (e) {
          // Ignore unrelated JSON
        }
      };

      this.ws?.on("message", handler);
      this.ws?.send(payload);
    });
  }

  async hotReload(): Promise<void> {
    await this.call("ext.flutter.hotReload");
  }

  async hotRestart(): Promise<void> {
    await this.call("ext.flutter.hotRestart");
  }

  async getFrameCount(): Promise<number> {
    try {
      const res = await this.call("ext.flutter.frameCount");
      return typeof res === "number" ? res : 0;
    } catch {
      return 0;
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
