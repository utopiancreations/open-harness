import { TreeSnapshot } from "../../core/grounding/types.js";
import { TranscriptTurn } from "../../core/harness/transcript.js";

export interface BenchmarkTask {
  id: string;
  name: string;
  description: string;
  category: "navigation" | "form_input" | "closed_loop_bug_fix";
  goal: string;
  maxAllowedSteps: number;
  initialState: TreeSnapshot;
  verifyCompletion: (
    finalSnapshot: TreeSnapshot | null,
    turns: TranscriptTurn[]
  ) => { passed: boolean; score: number; reason: string };
}

export interface TaskEvalResult {
  taskId: string;
  taskName: string;
  passed: boolean;
  score: number;
  stepsTaken: number;
  maxSteps: number;
  reason: string;
  durationMs: number;
  tokensUsed?: { input: number; output: number; total: number };
}
