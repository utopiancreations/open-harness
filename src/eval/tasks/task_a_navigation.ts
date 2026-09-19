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

export function createTaskANavigation(): BenchmarkTask {
  const initialNodes = new Map<string, any>();
  initialNodes.set("auth_screen/header", makeNode("auth_screen/header", "text", "Welcome Back"));
  initialNodes.set(
    "auth_screen/button:skip",
    makeNode("auth_screen/button:skip", "button", "Skip to Dashboard")
  );

  const initialState: TreeSnapshot = {
    timestamp: Date.now(),
    screenScope: "auth_screen",
    nodes: initialNodes,
    rootSEKs: ["auth_screen/header", "auth_screen/button:skip"],
    hash: "initial_auth_hash",
  };

  return {
    id: "task_a_navigation",
    name: "Task A: Screen Navigation",
    description: "Navigate from Auth Screen to Dashboard Settings",
    category: "navigation",
    goal: "Navigate from the welcome screen to the settings screen by tapping Skip and then Settings.",
    maxAllowedSteps: 10,
    initialState,
    verifyCompletion: (finalSnapshot, turns) => {
      const tappedSkip = turns.some(
        (t) => t.action?.name === "ui_tap" && t.action?.target.includes("skip")
      );
      const tappedSettings = turns.some(
        (t) => t.action?.name === "ui_tap" && t.action?.target.includes("settings")
      );

      if (tappedSkip && tappedSettings) {
        return { passed: true, score: 100, reason: "Successfully navigated through all target screens." };
      } else if (tappedSkip) {
        return { passed: false, score: 50, reason: "Reached dashboard but failed to open settings." };
      } else {
        return { passed: false, score: 0, reason: "Failed to navigate off initial screen." };
      }
    },
  };
}
