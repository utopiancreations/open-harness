import { BenchmarkTask, TaskEvalResult } from "./tasks/types.js";
import { HarnessLoop, HarnessConfig } from "../core/harness/loop.js";

export interface BenchmarkSummary {
  timestamp: string;
  totalTasks: number;
  passedTasks: number;
  passRate: number;
  totalTurns: number;
  avgTurnsPerTask: number;
  results: TaskEvalResult[];
}

export class EvalRunner {
  constructor(private tasks: BenchmarkTask[], private config: Partial<HarnessConfig>) {}

  async runAll(): Promise<BenchmarkSummary> {
    const results: TaskEvalResult[] = [];
    const startTime = Date.now();

    for (const task of this.tasks) {
      const taskStart = Date.now();

      // Create a Probe that returns initial state then stable hashes
      let currentSnapshot = task.initialState;
      const fakeProbe = {
        costMs: 10,
        fast: async () => currentSnapshot.hash,
        slow: async () => ({ hash: currentSnapshot.hash, snapshot: currentSnapshot }),
      };

      const harnessConfig: HarnessConfig = {
        model: this.config.model || { name: "eval-model", endpoint: "http://localhost:11434/v1" },
        probe: fakeProbe,
        adbTap: async () => {},
        adbType: async () => {},
        adbSwipe: async () => {},
        outputDir: "./artifacts/eval_transcripts",
        maxSteps: task.maxAllowedSteps,
      };

      const harness = new HarnessLoop(harnessConfig);

      try {
        const loopRes = await harness.run(task.goal);
        const verification = task.verifyCompletion(loopRes.finalSnapshot, loopRes.turns);

        results.push({
          taskId: task.id,
          taskName: task.name,
          passed: verification.passed,
          score: verification.score,
          stepsTaken: loopRes.totalSteps,
          maxSteps: task.maxAllowedSteps,
          reason: verification.reason,
          durationMs: Date.now() - taskStart,
        });
      } catch (e: any) {
        results.push({
          taskId: task.id,
          taskName: task.name,
          passed: false,
          score: 0,
          stepsTaken: 0,
          maxSteps: task.maxAllowedSteps,
          reason: `Error running eval task: ${e.message}`,
          durationMs: Date.now() - taskStart,
        });
      }
    }

    const passedTasks = results.filter((r) => r.passed).length;
    const totalTurns = results.reduce((acc, r) => acc + r.stepsTaken, 0);

    return {
      timestamp: new Date().toISOString(),
      totalTasks: this.tasks.length,
      passedTasks,
      passRate: this.tasks.length > 0 ? (passedTasks / this.tasks.length) * 100 : 0,
      totalTurns,
      avgTurnsPerTask: this.tasks.length > 0 ? totalTurns / this.tasks.length : 0,
      results,
    };
  }
}
