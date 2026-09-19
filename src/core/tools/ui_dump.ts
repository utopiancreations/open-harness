import { TreeSnapshot } from "../grounding/types.js";
import { collapseTree, CollapseResult } from "../compactor/tree_collapse.js";
import { HeartbeatMonitor, HEARTBEAT_POLICIES } from "../grounding/heartbeat.js";

export interface UiDumpResult {
  ok: boolean;
  yaml?: string;
  snapshot?: TreeSnapshot;
  tokenEstimate?: number;
  error?: string;
}

export async function uiDumpTool(
  heartbeat: HeartbeatMonitor,
  full: boolean = false
): Promise<UiDumpResult> {
  const result = await heartbeat.waitForStable(HEARTBEAT_POLICIES.POST_ACTION.config);

  if (result.status === "DEVICE_ERROR") {
    return { ok: false, error: result.error };
  }

  const snapshot =
    result.status === "STABLE"
      ? result.snapshot
      : (result as any).lastSnapshot;

  if (!snapshot) {
    return { ok: false, error: "No UI snapshot available." };
  }

  const budget = full ? 5000 : 2000;
  const collapsed = collapseTree(snapshot, budget);

  return {
    ok: true,
    yaml: collapsed.yaml,
    snapshot,
    tokenEstimate: collapsed.tokenEstimate,
  };
}
