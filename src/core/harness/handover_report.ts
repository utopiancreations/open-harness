import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { HarnessResult } from "./loop.js";

export interface HandoverSummary {
  status: string;
  totalSteps: number;
  completedMilestones: number;
  totalMilestones: number;
  planFilePath: string;
  envFilePath: string;
  summaryText: string;
  suggestedNextSteps: string[];
}

export function generateHandoverReport(
  result: HarnessResult,
  projectRoot: string = process.cwd()
): HandoverSummary {
  const planPath = join(projectRoot, "plan.md");
  const envPath = join(projectRoot, ".env");

  const status = result.success ? "OBJECTIVE COMPLETED ✅" : `PAUSED / TERMINATED (${result.terminationReason})`;

  const suggestedNextSteps: string[] = [
    "1. Check '.env' file to populate required API tokens (Cloudflare/Supabase/TURN).",
    "2. Interject new requirements (e.g., 'Add peer-to-peer file transfer').",
    "3. Run automated mobile benchmark evals using 'npm start -- eval'.",
  ];

  const lines: string[] = [
    "===========================================================================",
    "⚡ HARNESS EXECUTIVE HANDOVER REPORT",
    "===========================================================================",
    `Status:               ${status}`,
    `Milestones Progress:  ${result.completedMilestones} / ${result.totalMilestones} (${Math.round((result.completedMilestones / (result.totalMilestones || 1)) * 100)}%)`,
    `Total Turns Executed: ${result.totalSteps}`,
    `Master Plan:          ${existsSync(planPath) ? "plan.md" : "None"}`,
    `Environment File:     ${existsSync(envPath) ? ".env" : "None"}`,
    "---------------------------------------------------------------------------",
    "💡 SUGGESTED NEXT STEPS:",
    ...suggestedNextSteps.map((s) => `  ${s}`),
    "===========================================================================",
  ];

  return {
    status,
    totalSteps: result.totalSteps,
    completedMilestones: result.completedMilestones,
    totalMilestones: result.totalMilestones,
    planFilePath: planPath,
    envFilePath: envPath,
    summaryText: lines.join("\n"),
    suggestedNextSteps,
  };
}
