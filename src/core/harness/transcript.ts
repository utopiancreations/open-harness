import { appendFileSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { UIDiff } from "../grounding/types.js";

export interface TranscriptTurn {
  index: number;
  timestamp: string;
  source: "MODEL" | "SYSTEM" | "USER";
  action?: { name: string; target: string; args?: Record<string, any> };
  diff?: UIDiff;
  systemMessages: string[];
  toolResults: { tool: string; result?: any; error?: string }[];
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export class TranscriptLogger {
  private turnIndex = 0;
  private filePath: string;

  constructor(outputDir: string) {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    this.filePath = join(outputDir, "transcript.jsonl");
    // Initialize file
    writeFileSync(this.filePath, "", "utf-8");
  }

  logTurn(turn: Omit<TranscriptTurn, "index" | "timestamp">): TranscriptTurn {
    const fullTurn: TranscriptTurn = {
      ...turn,
      index: this.turnIndex++,
      timestamp: new Date().toISOString(),
    };

    const line = JSON.stringify(fullTurn) + "\n";
    appendFileSync(this.filePath, line, "utf-8");

    return fullTurn;
  }

  logSystemMessage(message: string): TranscriptTurn {
    return this.logTurn({
      source: "SYSTEM",
      systemMessages: [message],
      toolResults: [],
    });
  }

  logModelAction(
    action: { name: string; target: string; args?: Record<string, any> },
    diff: UIDiff | undefined,
    systemMessages: string[],
    toolResults: { tool: string; result?: any; error?: string }[],
    usage?: { inputTokens: number; outputTokens: number; totalTokens: number }
  ): TranscriptTurn {
    return this.logTurn({
      source: "MODEL",
      action,
      diff,
      systemMessages,
      toolResults,
      usage,
    });
  }

  getPath(): string {
    return this.filePath;
  }

  getCurrentIndex(): number {
    return this.turnIndex;
  }
}
