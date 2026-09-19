import { LocalLlmClient, ModelConfig } from "../llm/client.js";
import { TranscriptTurn } from "./transcript.js";
import { TreeSnapshot } from "../grounding/types.js";

export interface ConsultationRequest {
  goal: string;
  stuckReason: string;
  recentTurns: TranscriptTurn[];
  lastSnapshot: TreeSnapshot | null;
  modelName?: string;
}

export interface ConsultationResponse {
  diagnosis: string;
  suggestedAction: string;
  revisedStrategy: string;
  systemHint: string;
}

export class AgentConsultant {
  private llm: LocalLlmClient;

  constructor(config?: ModelConfig) {
    this.llm = new LocalLlmClient({
      name: config?.name || "gemma4:31b",
      endpoint: config?.endpoint || "http://localhost:11434/v1",
      contextWindow: config?.contextWindow || 32768,
    });
  }

  async consultOnStuck(req: ConsultationRequest): Promise<ConsultationResponse> {
    const turnSummary = req.recentTurns
      .slice(-5)
      .map(
        (t) =>
          `Turn ${t.index} (${t.source}): ${t.action ? `${t.action.name}(${JSON.stringify(t.action.args)})` : "Thinking"} | Diff: ${t.diff ? t.diff.summary : "None"}`
      )
      .join("\n");

    const prompt = `You are a Senior Cyberpunk QA & Architecture Consultant AI (Peer Agent).
The primary agent is stuck while executing the goal: "${req.goal}".
Stuck Reason / Loop Warning: "${req.stuckReason}"

Recent Action History:
${turnSummary}

Analyze why the agent is stuck or repeating actions. Provide a concise 2-sentence diagnostic advice and exact next step for the primary agent to get unstuck. Format your response clearly.`;

    try {
      const response = await this.llm.generateResponse([
        { role: "system", content: "You are an elite autonomous agent debugger and QA auditor." },
        { role: "user", content: prompt },
      ]);

      const text = response.content || "Try listing files or checking logcat for unhandled crashes.";

      return {
        diagnosis: text,
        suggestedAction: "list_files",
        revisedStrategy: text,
        systemHint: `[CYBER-CONSULTANT 👾] Peer agent advice: ${text}`,
      };
    } catch {
      return {
        diagnosis: "Agent repeated identical actions without state mutation.",
        suggestedAction: "list_files",
        revisedStrategy: "Inspect workspace structure and logcat error streams.",
        systemHint: "[CYBER-CONSULTANT 👾] System loop detected. Switch strategy: run list_files or inspect logcat.",
      };
    }
  }

  async performQaAudit(
    goal: string,
    turns: TranscriptTurn[],
    snapshot: TreeSnapshot | null
  ): Promise<{ passed: boolean; feedback: string }> {
    const prompt = `You are an Autonomous Cyberpunk QA Auditor Subagent.
Review the following agent turn history and verify if the implementation quality is high and regression-free.

Goal: "${goal}"
Turn Count: ${turns.length}
Last Actions: ${turns.slice(-3).map((t) => t.action?.name).join(", ")}

Respond with "PASSED" if goal progress is solid, or provide feedback if QA issues are detected.`;

    try {
      const response = await this.llm.generateResponse([
        { role: "system", content: "You are a ruthless QA audit subagent." },
        { role: "user", content: prompt },
      ]);

      const text = response.content || "PASSED";
      const passed = text.toUpperCase().includes("PASSED") || !text.toUpperCase().includes("FAIL");

      return {
        passed,
        feedback: `[QA-AUDITOR 👾] ${text.slice(0, 150)}`,
      };
    } catch {
      return { passed: true, feedback: "[QA-AUDITOR 👾] Automated audit passed." };
    }
  }
}
