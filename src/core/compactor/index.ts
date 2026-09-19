import { collapseTree } from "./tree_collapse.js";
import { filterLogcat } from "./logcat_filter.js";
import { elideHistory, Turn } from "./history_elide.js";
import { TreeSnapshot, UIDiff } from "../grounding/types.js";

export interface ContextBudget {
  totalTokens: number;
  systemPromptTokens: number;
  toolSchemaTokens: number;
  recentTurnsBudget: number;
  summaryBudget: number;
  currentObservationBudget: number;
  reservedForResponse: number;
}

export function allocateBudget(
  total: number = 32768,
  systemPrompt: number = 2000,
  toolSchema: number = 1500,
  reserve: number = 2000
): ContextBudget {
  const available = Math.max(0, total - systemPrompt - toolSchema - reserve);
  return {
    totalTokens: total,
    systemPromptTokens: systemPrompt,
    toolSchemaTokens: toolSchema,
    recentTurnsBudget: Math.floor(available * 0.4),
    summaryBudget: Math.floor(available * 0.2),
    currentObservationBudget: Math.floor(available * 0.4),
    reservedForResponse: reserve,
  };
}

export interface Observation {
  snapshot?: TreeSnapshot;
  lastDiff?: UIDiff;
  logcatRaw?: string;
  packageName?: string;
}

export interface CompiledPrompt {
  system: string;
  tools: string;
  historySummary: string[];
  recentTurns: Turn[];
  collapsedObservation: string;
  estimatedTokens: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export class ContextCompactor {
  private budget: ContextBudget;

  constructor(budget?: ContextBudget) {
    this.budget = budget || allocateBudget();
  }

  buildPrompt(
    systemPrompt: string,
    toolSchema: string,
    transcript: Turn[],
    currentObservation: Observation
  ): CompiledPrompt {
    const history = elideHistory(
      transcript,
      this.budget.recentTurnsBudget + this.budget.summaryBudget
    );

    const collapsedObs = this.collapseObservation(
      currentObservation,
      this.budget.currentObservationBudget
    );

    const fullText = [
      systemPrompt,
      toolSchema,
      history.summaryLines.join("\n"),
      JSON.stringify(history.recentTurns),
      collapsedObs,
    ].join("\n\n");

    return {
      system: systemPrompt,
      tools: toolSchema,
      historySummary: history.summaryLines,
      recentTurns: history.recentTurns,
      collapsedObservation: collapsedObs,
      estimatedTokens: estimateTokens(fullText),
    };
  }

  private collapseObservation(obs: Observation, budget: number): string {
    const parts: string[] = [];
    let remaining = budget;

    if (obs.logcatRaw && obs.packageName) {
      const filtered = filterLogcat(obs.logcatRaw, obs.packageName, Math.floor(remaining * 0.3));
      parts.push(`LOGCAT:\n${filtered.summary}`);
      remaining -= estimateTokens(filtered.summary);
    }

    if (obs.lastDiff) {
      const diffSummary = `LAST ACTION VERIFICATION:\nAction: ${obs.lastDiff.action} on ${obs.lastDiff.targetSEK}\nOutcome: ${obs.lastDiff.outcome} (confidence: ${obs.lastDiff.confidence})\nSummary: ${obs.lastDiff.summary}`;
      parts.push(diffSummary);
      remaining -= estimateTokens(diffSummary);
    }

    if (obs.snapshot) {
      const collapsed = collapseTree(obs.snapshot, Math.max(100, remaining));
      parts.push(`UI STATE:\n${collapsed.yaml}`);
    }

    return parts.join("\n\n");
  }
}
