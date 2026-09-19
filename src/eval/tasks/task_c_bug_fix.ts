import { BenchmarkTask } from "./types.js";
import { TreeSnapshot } from "../../core/grounding/types.js";

function makeNode(
  sek: string,
  role: any,
  label: string,
  bounds: [number, number, number, number] = [0, 0, 100, 50]
) {
  return {
    sek,
    role,
    label,
    bounds,
    state: { clickable: true, focusable: true, enabled: true },
    raw: { className: role, bounds },
  };
}

export function createTaskCBugFix(): BenchmarkTask {
  const initialNodes = new Map<string, any>();
  initialNodes.set(
    "buggy_screen/button:broken",
    makeNode("buggy_screen/button:broken", "button", "Trigger Bug")
  );

  const initialState: TreeSnapshot = {
    timestamp: Date.now(),
    screenScope: "buggy_screen",
    nodes: initialNodes,
    rootSEKs: ["buggy_screen/button:broken"],
    hash: "initial_buggy_hash",
  };

  return {
    id: "task_c_bug_fix",
    name: "Task C: Closed-Loop Bug Fix",
    description: "Detect UI crash, edit source file, trigger hot reload, and re-verify",
    category: "closed_loop_bug_fix",
    goal: "Tap 'Trigger Bug', analyze error, edit broken file with fix, hot reload, and verify UI recovery.",
    maxAllowedSteps: 15,
    initialState,
    verifyCompletion: (finalSnapshot, turns) => {
      const editedFile = turns.some((t) => t.action?.name === "edit_file");
      const reloaded = turns.some(
        (t) => t.action?.name === "flutter_hot_reload" || t.action?.name === "flutter_hot_restart"
      );
      const reTested = turns.some(
        (t, idx) =>
          idx > turns.findIndex((x) => x.action?.name === "edit_file") &&
          t.action?.name === "ui_tap"
      );

      if (editedFile && reloaded && reTested) {
        return {
          passed: true,
          score: 100,
          reason: "Closed loop bug fix verified: Edit -> Reload -> Re-test.",
        };
      } else if (editedFile && reloaded) {
        return {
          passed: false,
          score: 70,
          reason: "Edited file and hot reloaded, but did not re-test UI to verify fix.",
        };
      } else {
        return { passed: false, score: 0, reason: "Failed to fix bug and hot reload." };
      }
    },
  };
}
