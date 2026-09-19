import { UIDiff } from "../grounding/types.js";

export interface Turn {
  index: number;
  action: { name: string; target: string };
  diff: UIDiff;
  systemMessages: string[];
}

export interface ElidedHistory {
  recentTurns: Turn[];
  summaryLines: string[];
  elidedCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function summarizeTurn(turn: Turn): string {
  const outcome = turn.diff.outcome;
  const target = turn.diff.targetSEK;
  const action = turn.action.name;
  const salient = turn.diff.salientChange?.sek ?? "";

  let line = `turn ${turn.index}: ${action} ${target} -> ${outcome}`;
  if (salient && outcome !== "NO_CHANGE") {
    line += ` (${salient})`;
  }
  return line;
}

export function elideHistory(
  transcript: Turn[],
  budgetTokens: number = 2000
): ElidedHistory {
  const recentCount = 3;
  const recentTurns = transcript.slice(-recentCount);
  const olderTurns = transcript.slice(0, -recentCount);

  const summaryLines: string[] = [];
  let used = estimateTokens(JSON.stringify(recentTurns));
  let elided = 0;

  for (let i = olderTurns.length - 1; i >= 0; i--) {
    const line = summarizeTurn(olderTurns[i]);
    const lineTokens = estimateTokens(line);
    if (used + lineTokens > budgetTokens) {
      elided = i + 1;
      break;
    }
    summaryLines.unshift(line);
    used += lineTokens;
  }

  return { recentTurns, summaryLines, elidedCount: elided };
}
