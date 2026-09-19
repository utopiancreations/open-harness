import { TreeSnapshot } from "../types.js";

export interface HeartbeatProbe {
  costMs: number;
  fast(): Promise<string | null>;
  slow(): Promise<{ hash: string; snapshot: TreeSnapshot }>;
}
