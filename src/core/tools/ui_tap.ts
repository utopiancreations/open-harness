import { GroundedNode, TreeSnapshot } from "../grounding/types.js";
import { executeUiAction, ActionResult, ToolExecutionContext } from "./registry.js";

function findNodeBySEK(snapshot: TreeSnapshot, sek: string): GroundedNode | undefined {
  return snapshot.nodes.get(sek);
}

function centerOf(bounds: [number, number, number, number]): [number, number] {
  const [x1, y1, x2, y2] = bounds;
  return [Math.floor((x1 + x2) / 2), Math.floor((y1 + y2) / 2)];
}

export async function uiTapTool(
  elementKey: string,
  ctx: ToolExecutionContext
): Promise<ActionResult> {
  return executeUiAction(
    "ui_tap",
    elementKey,
    async () => {
      // Resolve element from pre-action snapshot to get bounds
      const pre = await ctx.heartbeat.waitForStable({
        pollIntervalMs: 100,
        requiredStableReads: 1,
        maxWaitMs: 1000,
        hardTimeoutMs: 2000,
      });

      const snapshot =
        pre.status === "STABLE"
          ? pre.snapshot
          : (pre as any).lastSnapshot;

      if (!snapshot) {
        throw new Error(`Cannot resolve element: no snapshot available.`);
      }

      const node = findNodeBySEK(snapshot, elementKey);
      if (!node) {
        throw new Error(
          `Element not found: "${elementKey}". Available SEKs: ${Array.from(snapshot.nodes.keys()).slice(0, 10).join(", ")}`
        );
      }

      if (!node.state.enabled) {
        throw new Error(`Element "${elementKey}" is disabled.`);
      }

      const [cx, cy] = centerOf(node.bounds);
      await ctx.adbTap(cx, cy);
    },
    ctx
  );
}
