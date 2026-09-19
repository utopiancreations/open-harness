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

export function createTaskBFormInput(): BenchmarkTask {
  const initialNodes = new Map<string, any>();
  initialNodes.set(
    "login_screen/input:email",
    makeNode("login_screen/input:email", "text_input", "Email")
  );
  initialNodes.set(
    "login_screen/input:password",
    makeNode("login_screen/input:password", "text_input", "Password")
  );
  initialNodes.set(
    "login_screen/button:submit",
    makeNode("login_screen/button:submit", "button", "Submit")
  );

  const initialState: TreeSnapshot = {
    timestamp: Date.now(),
    screenScope: "login_screen",
    nodes: initialNodes,
    rootSEKs: [
      "login_screen/input:email",
      "login_screen/input:password",
      "login_screen/button:submit",
    ],
    hash: "initial_login_hash",
  };

  return {
    id: "task_b_form_input",
    name: "Task B: Form Completion & Validation",
    description: "Fill email and password fields, then submit the form",
    category: "form_input",
    goal: "Type 'test@example.com' into the email input, 'secret123' into password, and tap submit.",
    maxAllowedSteps: 12,
    initialState,
    verifyCompletion: (finalSnapshot, turns) => {
      const typedEmail = turns.some(
        (t) => t.action?.name === "ui_type" && t.action?.target.includes("email")
      );
      const typedPassword = turns.some(
        (t) => t.action?.name === "ui_type" && t.action?.target.includes("password")
      );
      const tappedSubmit = turns.some(
        (t) => t.action?.name === "ui_tap" && t.action?.target.includes("submit")
      );

      if (typedEmail && typedPassword && tappedSubmit) {
        return { passed: true, score: 100, reason: "Form completed and submitted successfully." };
      } else {
        const score = (typedEmail ? 33 : 0) + (typedPassword ? 33 : 0) + (tappedSubmit ? 34 : 0);
        return { passed: false, score, reason: "Incomplete form submission." };
      }
    },
  };
}
