import { HeartbeatProbe } from "./types.js";
import { TreeSnapshot } from "../types.js";

export class UiAutomatorProbe implements HeartbeatProbe {
  costMs = 500;

  constructor(private getFullSnapshot: () => Promise<TreeSnapshot>) {}

  async fast(): Promise<string | null> {
    // UIAutomator has no fast probe — always escalate to slow
    return null;
  }

  async slow(): Promise<{ hash: string; snapshot: TreeSnapshot }> {
    const snapshot = await this.getFullSnapshot();
    return { hash: snapshot.hash, snapshot };
  }
}
