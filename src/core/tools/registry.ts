import { UIDiff, TreeSnapshot, GroundedNode } from "../grounding/types.js";
import { computeUIDiff } from "../grounding/diff.js";
import { HeartbeatMonitor, HeartbeatConfig, HEARTBEAT_POLICIES, StabilityResult } from "../grounding/heartbeat.js";
import { ActionHistory, LoopSignal } from "../grounding/loop_detector.js";
import { collapseTree } from "../compactor/tree_collapse.js";

export interface ActionResult {
  ok: boolean;
  diff?: UIDiff;
  loopSignal?: LoopSignal;
  systemMessages: string[];
  timing?: { execMs: number; settleMs: number };
  error?: string;
}

export interface ToolExecutionContext {
  heartbeat: HeartbeatMonitor;
  actionHistory: ActionHistory;
  adbTap: (x: number, y: number) => Promise<void>;
  adbType: (text: string) => Promise<void>;
  adbSwipe: (x1: number, y1: number, x2: number, y2: number) => Promise<void>;
  resolveElement: (sek: string, snapshot: TreeSnapshot) => GroundedNode | undefined;
}

export async function executeUiAction(
  actionName: string,
  targetSEK: string,
  execute: () => Promise<void>,
  ctx: ToolExecutionContext,
  policy: HeartbeatConfig = HEARTBEAT_POLICIES.POST_ACTION.config
): Promise<ActionResult> {
  const systemMessages: string[] = [];

  // 1. Pre-action heartbeat — capture stable "before" state
  const pre = await ctx.heartbeat.waitForStable(policy);
  if (pre.status === "DEVICE_ERROR") {
    return { ok: false, error: pre.error, systemMessages };
  }
  if (pre.status === "TIMEOUT") {
    systemMessages.push("[SYSTEM] Pre-action snapshot is untrusted (UI unstable). Proceeding cautiously.");
  }

  // 2. Execute the action
  const execStart = Date.now();
  try {
    await execute();
  } catch (e: any) {
    return { ok: false, error: `Action execution failed: ${e.message}`, systemMessages };
  }
  const execMs = Date.now() - execStart;

  // 3. Post-action heartbeat — wait for settle
  const post = await ctx.heartbeat.waitForStable(policy);

  if (post.status === "DEVICE_ERROR") {
    return { ok: false, error: post.error, systemMessages };
  }

  const settleMs = post.elapsedMs;

  if (post.status === "TIMEOUT") {
    systemMessages.push(
      HEARTBEAT_POLICIES.POST_ACTION.injectMessage ||
        "[SYSTEM] UI did not stabilize after action."
    );
  }

  // 4. Compute diff
  const beforeSnapshot = pre.status === "STABLE" ? pre.snapshot : (pre as any).lastSnapshot;
  const afterSnapshot = post.status === "STABLE" ? post.snapshot : (post as any).lastSnapshot;

  if (!beforeSnapshot || !afterSnapshot) {
    return {
      ok: false,
      error: "No UI snapshot available for diff computation.",
      systemMessages,
    };
  }

  const confidence = post.status === "STABLE" ? "high" : "low";
  const diff = computeUIDiff(beforeSnapshot, afterSnapshot, { name: actionName, target: targetSEK }, confidence);

  // 5. Record action in history and check for loops
  ctx.actionHistory.record(targetSEK, actionName, diff.outcome);
  const loopSignal = ctx.actionHistory.detectLoop();

  if (loopSignal) {
    systemMessages.push(loopSignal.message);
  }

  return {
    ok: true,
    diff,
    loopSignal: loopSignal ?? undefined,
    systemMessages,
    timing: { execMs, settleMs },
  };
}
