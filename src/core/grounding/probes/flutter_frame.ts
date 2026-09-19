import { HeartbeatProbe } from "./types.js";
import { TreeSnapshot } from "../types.js";

export class FlutterFrameProbe implements HeartbeatProbe {
  costMs = 5;

  constructor(
    private dtdCall: (method: string, params?: Record<string, any>) => Promise<any>,
    private getWidgetTree: () => Promise<TreeSnapshot>
  ) {}

  async fast(): Promise<string | null> {
    try {
      const count = await this.dtdCall("ext.flutter.frameCount");
      return String(count);
    } catch {
      return null;
    }
  }

  async slow(): Promise<{ hash: string; snapshot: TreeSnapshot }> {
    const snapshot = await this.getWidgetTree();
    return { hash: snapshot.hash, snapshot };
  }
}
