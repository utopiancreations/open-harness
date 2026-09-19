import { TreeSnapshot } from "./types.js";
import { HeartbeatProbe } from "./probes/types.js";

export interface HeartbeatConfig {
  pollIntervalMs: number;
  requiredStableReads: number;
  maxWaitMs: number;
  hardTimeoutMs: number;
}

export interface HeartbeatPolicy {
  name: string;
  config: HeartbeatConfig;
  onTimeout: "PROCEED_WITH_WARNING" | "RETRY_SLOW_PROBE" | "FAIL_LOUD";
  injectMessage?: string;
}

export const HEARTBEAT_POLICIES: Record<string, HeartbeatPolicy> = {
  POST_ACTION: {
    name: "POST_ACTION",
    config: { pollIntervalMs: 150, requiredStableReads: 2, maxWaitMs: 2000, hardTimeoutMs: 5000 },
    onTimeout: "PROCEED_WITH_WARNING",
    injectMessage: "[SYSTEM] UI did not stabilize within 2s after last action. Screen may still be animating. Diff confidence marked low.",
  },
  POST_HOT_RELOAD: {
    name: "POST_HOT_RELOAD",
    config: { pollIntervalMs: 200, requiredStableReads: 3, maxWaitMs: 5000, hardTimeoutMs: 10000 },
    onTimeout: "RETRY_SLOW_PROBE",
    injectMessage: "[SYSTEM] Hot reload did not converge within 5s. Rebuild may have triggered a new screen or error.",
  },
  POST_LAUNCH: {
    name: "POST_LAUNCH",
    config: { pollIntervalMs: 300, requiredStableReads: 3, maxWaitMs: 10000, hardTimeoutMs: 20000 },
    onTimeout: "FAIL_LOUD",
  },
};

export type StabilityResult =
  | { status: "STABLE"; hash: string; snapshot: TreeSnapshot; elapsedMs: number }
  | { status: "TIMEOUT"; lastHash: string | null; lastSnapshot: TreeSnapshot | null; elapsedMs: number }
  | { status: "DEVICE_ERROR"; error: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HeartbeatMonitor {
  constructor(private probe: HeartbeatProbe) {}

  async waitForStable(cfg: HeartbeatConfig): Promise<StabilityResult> {
    const start = Date.now();
    let consecutiveStable = 0;
    let lastHash: string | null = null;
    let lastSnapshot: TreeSnapshot | null = null;

    while (Date.now() - start < cfg.hardTimeoutMs) {
      let hash = await this.probe.fast().catch(() => null);

      if (hash === null || hash === "unknown") {
        try {
          const slowRes = await this.probe.slow();
          hash = slowRes.hash;
          lastSnapshot = slowRes.snapshot;
        } catch (e: any) {
          await sleep(cfg.pollIntervalMs);
          continue;
        }
      }

      if (hash === lastHash && hash !== null) {
        consecutiveStable++;
        if (consecutiveStable >= cfg.requiredStableReads) {
          if (!lastSnapshot) {
            const slowRes = await this.probe.slow();
            lastSnapshot = slowRes.snapshot;
          }
          return {
            status: "STABLE",
            hash,
            snapshot: lastSnapshot,
            elapsedMs: Date.now() - start,
          };
        }
      } else {
        consecutiveStable = 0;
        lastHash = hash;
      }

      if (Date.now() - start > cfg.maxWaitMs && lastHash !== null) {
        const finalHash = await this.probe.fast().catch(() => null);
        if (finalHash === lastHash) {
          const slowRes = await this.probe.slow();
          return {
            status: "STABLE",
            hash: lastHash,
            snapshot: slowRes.snapshot,
            elapsedMs: Date.now() - start,
          };
        }
      }

      await sleep(cfg.pollIntervalMs);
    }

    return {
      status: "TIMEOUT",
      lastHash,
      lastSnapshot,
      elapsedMs: Date.now() - start,
    };
  }
}
