import { GroundedNode, TreeSnapshot } from "../grounding/types.js";
import { executeUiAction, ActionResult, ToolExecutionContext } from "./registry.js";

function findNodeBySEK(snapshot: TreeSnapshot, sek: string): GroundedNode | undefined {
  return snapshot.nodes.get(sek);
}

function centerOf(bounds: [number, number, number, number]): [number, number] {
  const [x1, y1, x2, y2] = bounds;
  return [Math.floor((x1 + x2) / 2), Math.floor((y1 + y2) / 2)];
}

export async function uiTypeTool(
  elementKey: string,
  text: string,
  clearFirst: boolean,
  ctx: ToolExecutionContext
): Promise<ActionResult> {
  return executeUiAction(
    "ui_type",
    elementKey,
    async () => {
      // Resolve element from pre-action snapshot
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
        throw new Error(`Element not found: "${elementKey}".`);
      }

      if (node.role !== "text_input") {
        throw new Error(`Element "${elementKey}" is not a text input (role: ${node.role}).`);
      }

      // Tap the element to focus it
      const [cx, cy] = centerOf(node.bounds);
      await ctx.adbTap(cx, cy);

      // Brief pause for focus to settle
      await new Promise((r) => setTimeout(r, 200));

      // Clear existing text if requested
      if (clearFirst) {
        // Select all + delete
        // keyevent 67 = KEYCODE_DEL, 123 = KEYCODE_MOVE_END
        // Use Ctrl+A then delete approach
      }

      // Type the text
      await ctx.adbType(text);
    },
    ctx
  );
}
