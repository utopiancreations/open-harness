import { describe, it, expect } from "vitest";
import { HeartbeatMonitor } from "../../src/core/grounding/heartbeat.js";
import { HeartbeatProbe } from "../../src/core/grounding/probes/types.js";
import { TreeSnapshot } from "../../src/core/grounding/types.js";

function makeFakeSnapshot(scope: string): TreeSnapshot {
  return {
    timestamp: Date.now(),
    screenScope: scope,
    nodes: new Map(),
    rootSEKs: [],
    hash: `hash_${scope}`,
  };
}

class FakeProbe implements HeartbeatProbe {
  costMs = 1;
  private callIndex = 0;

  constructor(
    private fastSequence: (string | null)[],
    private fakeSnapshot: TreeSnapshot
  ) {}

  async fast(): Promise<string | null> {
    const val =
      this.fastSequence[this.callIndex] ??
      this.fastSequence[this.fastSequence.length - 1];
    this.callIndex++;
    return val;
  }

  async slow(): Promise<{ hash: string; snapshot: TreeSnapshot }> {
    return { hash: this.fakeSnapshot.hash, snapshot: this.fakeSnapshot };
  }
}

describe("HeartbeatMonitor", () => {
  it("should return STABLE after 2 consecutive identical fast readings", async () => {
    const snapshot = makeFakeSnapshot("auth_screen");
    const probe = new FakeProbe(["a", "a"], snapshot);
    const monitor = new HeartbeatMonitor(probe);

    const result = await monitor.waitForStable({
      pollIntervalMs: 10,
      requiredStableReads: 2,
      maxWaitMs: 500,
      hardTimeoutMs: 1000,
    });

    expect(result.status).toBe("STABLE");
    if (result.status === "STABLE") {
      expect(result.snapshot.screenScope).toBe("auth_screen");
    }
  });

  it("should return TIMEOUT when hash keeps changing", async () => {
    const snapshot = makeFakeSnapshot("loading");
    const changing = Array.from({ length: 50 }, (_, i) => String(i));
    const probe = new FakeProbe(changing, snapshot);
    const monitor = new HeartbeatMonitor(probe);

    const result = await monitor.waitForStable({
      pollIntervalMs: 10,
      requiredStableReads: 2,
      maxWaitMs: 100,
      hardTimeoutMs: 200,
    });

    expect(result.status).toBe("TIMEOUT");
  });

  it("should escalate to slow probe when fast returns null", async () => {
    const snapshot = makeFakeSnapshot("dashboard");
    const probe = new FakeProbe([null, null, null], snapshot);
    const monitor = new HeartbeatMonitor(probe);

    const result = await monitor.waitForStable({
      pollIntervalMs: 10,
      requiredStableReads: 2,
      maxWaitMs: 500,
      hardTimeoutMs: 1000,
    });

    expect(result.status).toBe("STABLE");
    if (result.status === "STABLE") {
      expect(result.snapshot.screenScope).toBe("dashboard");
    }
  });
});
