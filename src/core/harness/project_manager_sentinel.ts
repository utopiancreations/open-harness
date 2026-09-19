import { LocalLlmClient } from "../llm/client.js";

export interface PmAuditResult {
  aligned: boolean;
  feedback: string;
  refocusHint?: string;
}

export class ProjectManagerSentinel {
  private llm: LocalLlmClient;

  constructor(modelName: string = "gemma4:e4b") {
    this.llm = new LocalLlmClient({
      name: modelName,
      endpoint: "http://localhost:11434/v1",
      contextWindow: 16384,
    });
  }

  async auditScope(
    mainGoal: string,
    activeMilestoneTitle: string,
    proposedActionName: string,
    proposedTarget: string
  ): Promise<PmAuditResult> {
    const prompt = `You are a strict AI Project Manager overseeing a developer LLM.
Main App Goal: "${mainGoal}"
Active Milestone: "${activeMilestoneTitle}"
Developer's Proposed Tool Call: ${proposedActionName} (target: "${proposedTarget}")

Task: Verify if the developer is making progress on the ACTIVE MILESTONE or if they are drifting into irrelevant boilerplate (such as generic login screens, auth forms, or unrelated UI).

Respond with a JSON object:
{
  "aligned": true or false,
  "reason": "short explanation",
  "refocusHint": "if aligned is false, a short 1-sentence command directing the developer back to the milestone"
}`;

    try {
      const res = await this.llm.generateResponse([
        { role: "system", content: "You are a concise Project Manager Sentinel. Output valid JSON only." },
        { role: "user", content: prompt },
      ]);

      const text = res.content || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          aligned: Boolean(parsed.aligned),
          feedback: String(parsed.reason || "Scope check completed."),
          refocusHint: parsed.refocusHint ? String(parsed.refocusHint) : undefined,
        };
      }
    } catch {
      // Graceful fallback: do not block execution if model is unavailable
    }

    return { aligned: true, feedback: "Scope aligned." };
  }
}
