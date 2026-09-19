import { describe, it, expect, vi } from "vitest";
import { EvalRunner } from "../../src/eval/runner.js";
import { LocalLlmClient } from "../../src/core/llm/client.js";
import { createTaskANavigation } from "../../src/eval/tasks/task_a_navigation.js";
import { createTaskBFormInput } from "../../src/eval/tasks/task_b_form_input.js";
import { createTaskCBugFix } from "../../src/eval/tasks/task_c_bug_fix.js";

describe("Phase 4 Mobile Eval Benchmark Suite", () => {
  it("should define tasks with correct goals and constraints", () => {
    const taskA = createTaskANavigation();
    const taskB = createTaskBFormInput();
    const taskC = createTaskCBugFix();

    expect(taskA.id).toBe("task_a_navigation");
    expect(taskB.id).toBe("task_b_form_input");
    expect(taskC.id).toBe("task_c_bug_fix");

    expect(taskA.maxAllowedSteps).toBeGreaterThan(0);
    expect(taskB.maxAllowedSteps).toBeGreaterThan(0);
    expect(taskC.maxAllowedSteps).toBeGreaterThan(0);
  });

  it("should evaluate task completion assertions correctly", () => {
    const taskA = createTaskANavigation();

    // Verification with empty turns (failed)
    const emptyResult = taskA.verifyCompletion(null, []);
    expect(emptyResult.passed).toBe(false);
    expect(emptyResult.score).toBe(0);

    // Verification with successful navigation turns
    const successTurns: any[] = [
      { action: { name: "ui_tap", target: "auth_screen/button:skip" } },
      { action: { name: "ui_tap", target: "dashboard_screen/button:settings" } },
    ];
    const successResult = taskA.verifyCompletion(null, successTurns);
    expect(successResult.passed).toBe(true);
    expect(successResult.score).toBe(100);
  });

  it("should evaluate task C bug fix assertion chain", () => {
    const taskC = createTaskCBugFix();

    const partialTurns: any[] = [
      { action: { name: "edit_file", target: "lib/main.dart" } },
      { action: { name: "flutter_hot_reload", target: "" } },
    ];
    const partialResult = taskC.verifyCompletion(null, partialTurns);
    expect(partialResult.passed).toBe(false);
    expect(partialResult.score).toBe(70);

    const fullTurns: any[] = [
      { action: { name: "edit_file", target: "lib/main.dart" } },
      { action: { name: "flutter_hot_reload", target: "" } },
      { action: { name: "ui_tap", target: "buggy_screen/button:broken" } },
    ];
    const fullResult = taskC.verifyCompletion(null, fullTurns);
    expect(fullResult.passed).toBe(true);
    expect(fullResult.score).toBe(100);
  });

  it("should execute EvalRunner over task suite and produce benchmark summary", async () => {
    const tasks = [createTaskANavigation(), createTaskBFormInput(), createTaskCBugFix()];

    // Mock generateResponse for offline fast test execution
    vi.spyOn(LocalLlmClient.prototype, "generateResponse").mockImplementation(async (_messages, tools) => {
      return {
        role: "assistant",
        content: "Task completed successfully",
      } as any;
    });

    const runner = new EvalRunner(tasks, {
      model: { name: "test-eval-model", endpoint: "http://localhost:11434/v1" },
    });

    const summary = await runner.runAll();

    expect(summary.totalTasks).toBe(3);
    expect(summary.results.length).toBe(3);
    expect(typeof summary.passRate).toBe("number");
    expect(typeof summary.avgTurnsPerTask).toBe("number");
  });
});
